import React from "react";
import { useMobile } from "../hooks/useMobile.js";

export function CategoryTabs({ categories, activeCategory, onSelect }) {
  const isMobile = useMobile();
  return (
    <div
      style={{
        position: "relative",
        marginBottom: isMobile ? 16 : 24,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: isMobile ? 6 : 8,
          overflowX: "auto",
          paddingBottom: isMobile ? 6 : 8,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          maskImage: "linear-gradient(to right, black 95%, transparent 100%)",
        }}
        className="no-scrollbar"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            style={{
              padding: isMobile ? "8px 14px" : "10px 20px",
              borderRadius: isMobile ? 6 : 8,
              fontSize: isMobile ? 12 : 14,
              fontWeight: activeCategory === cat ? 800 : 600,
              whiteSpace: "nowrap",
              border: "1px solid",
              borderColor: activeCategory === cat ? "#F5A623" : "rgba(255,255,255,.1)",
              background: activeCategory === cat ? "rgba(245,166,35,.15)" : "rgba(255,255,255,.03)",
              color: activeCategory === cat ? "#F5A623" : "rgba(255,255,255,.7)",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
            }}
            onMouseEnter={(e) => {
              if (activeCategory !== cat) {
                e.currentTarget.style.background = "rgba(255,255,255,.08)";
                e.currentTarget.style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              if (activeCategory !== cat) {
                e.currentTarget.style.background = "rgba(255,255,255,.03)";
                e.currentTarget.style.color = "rgba(255,255,255,.7)";
              }
            }}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
