import React from "react";

export function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,.05)",
        background: "rgba(255,255,255,.03)",
        overflow: "hidden",
        height: "300px", // Adjust based on typical card height
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 16,
      }}
    >
      <div style={{ height: "60%", background: "rgba(255,255,255,.05)", borderRadius: 12 }} />
      <div style={{ height: "20px", width: "80%", background: "rgba(255,255,255,.05)", borderRadius: 4 }} />
      <div style={{ height: "15px", width: "60%", background: "rgba(255,255,255,.05)", borderRadius: 4 }} />
    </div>
  );
}
