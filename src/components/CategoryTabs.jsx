import React from "react";

export default function CategoryTabs({
  categories = [],
  active = "All",
  onChange = () => {},
  style = {},
}) {
  const safeCategories = Array.isArray(categories) && categories.length
    ? categories
    : ["All"];

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 8,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        ...style,
      }}
      className="stea-category-tabs"
    >
      <style>
        {`
          .stea-category-tabs::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {safeCategories.map((cat) => {
        const isActive = active === cat;

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            type="button"
            style={{
              whiteSpace: "nowrap",
              border: "1px solid rgba(255,255,255,0.08)",
              background: isActive
                ? "linear-gradient(135deg,#f7b733,#fcb045)"
                : "rgba(255,255,255,0.03)",
              color: isActive ? "#111" : "#fff",
              padding: "10px 18px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .25s ease",
              boxShadow: isActive
                ? "0 8px 20px rgba(247,183,51,.22)"
                : "none",
              flexShrink: 0,
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
