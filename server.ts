import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API: Search Schools
  app.get("/api/necta/schools", async (req, res) => {
    const { query, examType, year } = req.query;
    
    if (!examType || !year) {
      return res.status(400).json({ error: "Exam type and year are required" });
    }

    const eTypeLower = String(examType).toLowerCase();
    const eTypeUpper = String(examType).toUpperCase();

    const urlsToTry = [
      `https://onlinesys.necta.go.tz/results/${year}/${eTypeLower}/index.htm`,
      `https://matokeo.necta.go.tz/${eTypeLower}${year}/index.htm`,
      `https://matokeo.necta.go.tz/results/${year}/${eTypeLower}/index.htm`,
      `https://maktaba.tetea.org/exam-results/${eTypeUpper}${year}/index.htm`,
      `https://necta.go.tz/results/${year}/${eTypeLower}/index.htm`
    ];

    let response = null;
    for (const url of urlsToTry) {
      try {
        const res = await axios.get(url, { timeout: 8000 });
        if (res.status === 200) {
          response = res;
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (!response) {
      return res.status(500).json({ error: "Failed to fetch schools from NECTA. The results for this year might not be available yet." });
    }

    try {
      const $ = cheerio.load(response.data);
      
      const schools: any[] = [];
      
      // NECTA index pages usually have tables with links
      $("a").each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr("href");
        
        if (href && href.toLowerCase().endsWith(".htm")) {
          // Extract school code from text or href
          // Pattern: S0101 or P0101
          const codeMatch = text.match(/([PS]\d{4})/i) || href.match(/([ps]\d{4})/i);
          
          if (codeMatch) {
            const code = codeMatch[1].toUpperCase();
            const name = text.replace(code, "").replace(/[^\w\s']/gi, "").trim();
            
            if (!query || name.toLowerCase().includes(String(query).toLowerCase()) || code.toLowerCase().includes(String(query).toLowerCase())) {
              schools.push({
                code,
                name: name || text,
                href: href
              });
            }
          }
        }
      });
      
      // Remove duplicates
      const uniqueSchools = Array.from(new Map(schools.map(s => [s.code, s])).values());
      res.json(uniqueSchools.slice(0, 100));
    } catch (error) {
      console.error("Error parsing schools:", error);
      res.status(500).json({ error: "Failed to parse schools from NECTA." });
    }
  });

  // API: Get Results
  app.get("/api/necta/results/:examType/:year/:schoolCode", async (req, res) => {
    const { examType, year, schoolCode } = req.params;
    
    const eTypeLower = examType.toLowerCase();
    const eTypeUpper = examType.toUpperCase();
    const sCodeLower = schoolCode.toLowerCase();
    const sCodeUpper = schoolCode.toUpperCase();

    const urlsToTry = [
      // Modern NECTA (2022+)
      `https://onlinesys.necta.go.tz/results/${year}/${eTypeLower}/results/${sCodeLower}.htm`,
      `https://onlinesys.necta.go.tz/results/${year}/${eTypeLower}/results/${sCodeUpper}.htm`,
      // Older NECTA (2015-2021)
      `https://matokeo.necta.go.tz/${eTypeLower}${year}/results/${sCodeLower}.htm`,
      `https://matokeo.necta.go.tz/${eTypeLower}${year}/results/${sCodeUpper}.htm`,
      `https://matokeo.necta.go.tz/results/${year}/${eTypeLower}/results/${sCodeLower}.htm`,
      // Maktaba Tetea Fallbacks (2005-2021)
      `https://maktaba.tetea.org/exam-results/${eTypeUpper}${year}/${sCodeLower}.htm`,
      `https://maktaba.tetea.org/exam-results/${eTypeUpper}${year}/${sCodeUpper}.htm`,
      `https://maktaba.tetea.org/exam-results/${eTypeUpper}${year}/results/${sCodeLower}.htm`,
      `https://maktaba.tetea.org/exam-results/${eTypeUpper}${year}/results/${sCodeUpper}.htm`,
      // Other variations
      `https://necta.go.tz/results/${year}/${eTypeLower}/results/${sCodeLower}.htm`,
      `https://onlinesys.necta.go.tz/results/${year}/${eTypeLower}/${sCodeLower}.htm`,
      `https://matokeo.necta.go.tz/${eTypeLower}${year}/${sCodeLower}.htm`
    ];
    
    let response = null;

    for (const url of urlsToTry) {
      try {
        console.log(`[NECTA] Trying: ${url}`);
        const res = await axios.get(url, { timeout: 8000 });
        if (res.status === 200) {
          response = res;
          console.log(`[NECTA] Success: ${url}`);
          break;
        }
      } catch (e) {
        // Continue to next URL
      }
    }

    if (!response) {
      console.error(`[NECTA] All URLs failed for ${examType} ${year} ${schoolCode}`);
      return res.status(404).json({ 
        error: "Failed to fetch results from NECTA. The results for this year/school might not be available.",
        details: "Tried multiple endpoints but none returned data." 
      });
    }
    
    try {
      const $ = cheerio.load(response.data);
      
      const result: any = {
        examTitle: "",
        schoolName: "",
        schoolCode: schoolCode.toUpperCase(),
        summary: [],
        students: []
      };

      // Parse Header Info
      $("font, h3, h2, p, div").each((_, el) => {
        const text = $(el).text().trim();
        if (text.toUpperCase().includes("EXAMINATION RESULTS") || text.toUpperCase().includes("NATIONAL EXAMINATIONS COUNCIL")) {
          if (!result.examTitle || text.length > result.examTitle.length) {
             result.examTitle = text;
          }
        }
        if (text.toUpperCase().includes(schoolCode.toUpperCase())) {
           if (!result.schoolName || text.length < result.schoolName.length) {
              result.schoolName = text;
           }
        }
      });

      // Fallback for school name if not found in specific tags
      if (!result.schoolName) {
        result.schoolName = $("title").text().trim() || `School ${schoolCode.toUpperCase()}`;
      }

      // Parse Tables
      const tables = $("table");
      
      tables.each((i, table) => {
        const rows = $(table).find("tr");
        if (rows.length === 0) return;

        const tableText = $(table).text().toLowerCase();
        
        // Summary Table (Division summary)
        if (tableText.includes("division") || (tableText.includes("iv") && tableText.includes("iii"))) {
          const summaryData: any[] = [];
          rows.each((j, row) => {
            const cols = $(row).find("td, th");
            if (cols.length > 0) {
              summaryData.push(cols.map((_, col) => $(col).text().trim()).get());
            }
          });
          if (summaryData.length > 1) {
            result.summary = summaryData;
          }
        }
        
        // Student Results Table
        if (tableText.includes("cno") || tableText.includes("index") || tableText.includes("candidate") || tableText.includes("cand. no")) {
          const studentData: any[] = [];
          let cnoIdx = 0, sexIdx = 1, aggrIdx = 2, divIdx = 3, subjIdx = 4;
          let headerFound = false;

          rows.each((j, row) => {
            const cols = $(row).find("th, td");
            const rowData = cols.map((_, col) => $(col).text().replace(/\s+/g, ' ').trim()).get();
            
            if (rowData.length === 0) return;

            const rowText = rowData.join(" ").toLowerCase();
            if (rowText.includes("cno") || rowText.includes("index") || rowText.includes("cand")) {
              // Parse headers
              rowData.forEach((text, idx) => {
                const t = text.toLowerCase();
                if (t.includes("cno") || t.includes("index") || t.includes("cand")) cnoIdx = idx;
                else if (t === "sex" || t === "jinsia" || t === "s") sexIdx = idx;
                else if (t.includes("aggr") || t.includes("points")) aggrIdx = idx;
                else if (t.includes("div")) divIdx = idx;
                else if (t.includes("subject") || t.includes("detailed")) subjIdx = idx;
              });
              headerFound = true;
              return;
            }

            if (headerFound && rowData.length >= 3) {
              if (!rowData[cnoIdx] || rowData[cnoIdx].length < 3) return;
              
              studentData.push({
                indexNumber: rowData[cnoIdx] || "",
                sex: rowData[sexIdx] || "",
                points: aggrIdx !== -1 ? (rowData[aggrIdx] || "") : "",
                division: divIdx !== -1 ? (rowData[divIdx] || "") : "",
                subjects: subjIdx !== -1 ? (rowData[subjIdx] || "") : ""
              });
            } else if (!headerFound && rowData.length >= 4) {
               if (rowData[0].toLowerCase().includes("cno") || rowData[0].toLowerCase().includes("index")) return;
               
               if (rowData.length === 4) {
                 studentData.push({
                   indexNumber: rowData[0],
                   sex: rowData[1],
                   points: "",
                   division: "",
                   subjects: rowData[3] || ""
                 });
               } else {
                 studentData.push({
                   indexNumber: rowData[0],
                   sex: rowData[1],
                   points: rowData[2],
                   division: rowData[3],
                   subjects: rowData[4] || ""
                 });
               }
            }
          });
          if (studentData.length > 0) {
            result.students = studentData;
          }
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error parsing results:", error.message);
      res.status(500).json({ 
        error: "Failed to parse results from NECTA.",
        details: error.message 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
