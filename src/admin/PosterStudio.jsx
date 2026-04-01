import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Download, Type, Image as ImageIcon, Layout, ZoomIn } from 'lucide-react';

const STEA_GOLD = "#F5A623";
const STEA_DARK = "#050816";

const TEMPLATES = [
  { id: 'ig_portrait', name: 'Instagram Portrait', width: 1080, height: 1350, aspect: 4 / 5 },
  { id: 'square', name: 'Square Post', width: 1080, height: 1080, aspect: 1 / 1 },
  { id: 'story', name: 'Story / Status', width: 1080, height: 1920, aspect: 9 / 16 }
];

const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y + (lineCount * lineHeight));
      line = words[n] + ' ';
      lineCount++;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y + (lineCount * lineHeight));
  return lineCount + 1;
};

export default function PosterStudio({ content, type, onClose }) {
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [headline, setHeadline] = useState((content.title || content.name || "").toUpperCase());
  const [caption, setCaption] = useState(content.summary || content.description || "");
  const [cta, setCta] = useState(content.ctaText || "JIUNGE NA STEA LEO");
  const [badge, setBadge] = useState((content.badge || type || "TECH").toUpperCase());
  const [footer] = useState("www.stea.africa");
  
  // Image state
  const [image] = useState(content.image || content.imageUrl || "");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const drawPoster = useCallback(async (canvas, isPreview = false) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = template;
    
    // Scale for preview if needed
    const scale = isPreview ? (window.innerWidth < 768 ? 0.3 : 0.4) : 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    const s = (val) => val * scale;

    // 1. Background
    ctx.fillStyle = STEA_DARK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gradient background
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width);
    grad.addColorStop(0, '#121626');
    grad.addColorStop(1, STEA_DARK);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Decorative Accents
    ctx.strokeStyle = STEA_GOLD;
    ctx.lineWidth = s(12);
    ctx.strokeRect(s(40), s(40), canvas.width - s(80), canvas.height - s(80));

    // Subtle glow
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = STEA_GOLD;
    ctx.beginPath();
    ctx.arc(canvas.width, 0, s(600), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 3. Logo & Branding
    try {
      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.src = '/stea-icon.jpg';
      await new Promise((resolve) => {
        logo.onload = resolve;
        logo.onerror = resolve;
      });
      if (logo.complete && logo.width > 0) {
        ctx.drawImage(logo, canvas.width/2 - s(60), s(100), s(120), s(120));
      }
    } catch (err) {
      console.debug("Logo load failed", err);
    }

    ctx.fillStyle = STEA_GOLD;
    ctx.font = `bold ${s(32)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('SWAHILITECH ELITE ACADEMY', canvas.width/2, s(260));

    // 4. Image Section
    if (image && croppedAreaPixels) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = image;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });

        if (img.complete && img.width > 0) {
          // Calculate image container
          const imgContW = canvas.width - s(160);
          const imgContH = canvas.height * 0.4;
          const imgContX = s(80);
          const imgContY = s(320);

          ctx.save();
          // Rounded container for image
          const r = s(30);
          ctx.beginPath();
          ctx.moveTo(imgContX + r, imgContY);
          ctx.lineTo(imgContX + imgContW - r, imgContY);
          ctx.quadraticCurveTo(imgContX + imgContW, imgContY, imgContX + imgContW, imgContY + r);
          ctx.lineTo(imgContX + imgContW, imgContY + imgContH - r);
          ctx.quadraticCurveTo(imgContX + imgContW, imgContY + imgContH, imgContX + imgContW - r, imgContY + imgContH);
          ctx.lineTo(imgContX + r, imgContY + imgContH);
          ctx.quadraticCurveTo(imgContX, imgContY + imgContH, imgContX, imgContY + imgContH - r);
          ctx.lineTo(imgContX, imgContY + r);
          ctx.quadraticCurveTo(imgContX, imgContY, imgContX + r, imgContY);
          ctx.closePath();
          ctx.clip();

          // Draw cropped image
          ctx.drawImage(
            img,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            imgContX,
            imgContY,
            imgContW,
            imgContH
          );
          ctx.restore();

          // Image Border
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = s(2);
          ctx.stroke();
        }
      } catch (err) {
        console.debug("Image load failed", err);
      }
    }

    // 5. Typography & Content
    const contentStartY = canvas.height * 0.75;
    
    // Badge
    ctx.fillStyle = STEA_GOLD;
    ctx.font = `bold ${s(30)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`[ ${badge} ]`, canvas.width/2, contentStartY - s(40));

    // Headline (Big & Powerful)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 ${s(64)}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    const headlineLines = wrapText(ctx, headline, canvas.width/2, contentStartY + s(30), canvas.width - s(160), s(74));

    // Caption (Supporting Text)
    const captionY = contentStartY + s(30) + (headlineLines * s(74)) + s(20);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `500 ${s(34)}px 'Inter', sans-serif`;
    wrapText(ctx, caption, canvas.width/2, captionY, canvas.width - s(200), s(48));

    // 6. Footer / CTA
    const footerY = canvas.height - s(120);
    
    // CTA Button
    ctx.fillStyle = STEA_GOLD;
    const ctaW = s(450);
    const ctaH = s(80);
    ctx.fillRect(canvas.width/2 - ctaW/2, footerY - s(100), ctaW, ctaH);
    
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${s(32)}px 'Inter', sans-serif`;
    ctx.fillText(cta, canvas.width/2, footerY - s(48));

    // Footer Link
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `600 ${s(28)}px 'Inter', sans-serif`;
    ctx.fillText(footer, canvas.width/2, canvas.height - s(65));
  }, [template, headline, caption, cta, badge, footer, image, croppedAreaPixels]);

  useEffect(() => {
    if (previewCanvasRef.current) {
      drawPoster(previewCanvasRef.current, true);
    }
  }, [drawPoster]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    await drawPoster(canvas, false);
    const link = document.createElement('a');
    link.download = `STEA_STUDIO_${template.id}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#040509', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#080a14' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${STEA_GOLD}, #FFD17C)`, display: 'grid', placeItems: 'center' }}>
            <Layout size={20} color="#111" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>STEA Poster Studio</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Create premium social media posters</p>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden' }}>
        {/* Left: Preview Area */}
        <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 40, position: 'relative' }}>
          <div style={{ position: 'relative', boxShadow: '0 30px 100px rgba(0,0,0,0.8)' }}>
            <canvas ref={previewCanvasRef} style={{ display: 'block', borderRadius: 4 }} />
            
            {/* Hidden High-Res Canvas */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12 }}>
            {TEMPLATES.map(t => (
              <button 
                key={t.id}
                onClick={() => setTemplate(t)}
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: 12, 
                  border: template.id === t.id ? `2px solid ${STEA_GOLD}` : '1px solid rgba(255,255,255,0.1)',
                  background: template.id === t.id ? 'rgba(245,166,35,0.1)' : 'rgba(255,255,255,0.05)',
                  color: template.id === t.id ? STEA_GOLD : '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Controls Area */}
        <div style={{ background: '#080a14', borderLeft: '1px solid rgba(255,255,255,0.1)', overflowY: 'auto', padding: 24 }}>
          
          {/* Image Editor Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: STEA_GOLD }}>
              <ImageIcon size={18} />
              <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Image Control</span>
            </div>
            
            <div style={{ position: 'relative', height: 200, background: '#000', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              {image ? (
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={template.width / (template.height * 0.4)}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}>No Image</div>
              )}
            </div>
            
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ZoomIn size={16} color="rgba(255,255,255,0.4)" />
              <input 
                type="range" 
                min={1} max={3} step={0.1} 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: STEA_GOLD }}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', width: 30 }}>{zoom.toFixed(1)}x</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8, textAlign: 'center' }}>Drag image to reposition inside the frame</p>
          </div>

          {/* Text Editor Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: STEA_GOLD }}>
              <Type size={18} />
              <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Typography</span>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Category Badge</label>
                <input 
                  value={badge} 
                  onChange={e => setBadge(e.target.value.toUpperCase())}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Main Headline</label>
                <textarea 
                  value={headline} 
                  onChange={e => setHeadline(e.target.value.toUpperCase())}
                  rows={2}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', resize: 'none', fontWeight: 800 }}
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Supporting Caption</label>
                <textarea 
                  value={caption} 
                  onChange={e => setCaption(e.target.value)}
                  rows={3}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>CTA Button Text</label>
                <input 
                  value={cta} 
                  onChange={e => setCta(e.target.value.toUpperCase())}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={handleDownload}
              style={{ 
                width: '100%', 
                padding: '16px', 
                borderRadius: 16, 
                border: 'none', 
                background: `linear-gradient(135deg, ${STEA_GOLD}, #FFD17C)`, 
                color: '#111', 
                fontSize: 15, 
                fontWeight: 900, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: `0 10px 30px rgba(245,166,35,0.3)`
              }}
            >
              <Download size={20} /> DOWNLOAD POSTER
            </button>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12, textAlign: 'center' }}>High-resolution PNG export (1080px wide)</p>
          </div>

        </div>
      </div>
    </div>
  );
}
