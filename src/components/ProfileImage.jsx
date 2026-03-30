import { useState } from "react";

/**
 * ProfileImage — safe, no-overflow avatar renderer.
 * Falls back to an initial-letter div if image fails or src is absent.
 * Renders as a plain img or div that fills its parent completely.
 */
export default function ProfileImage({
  src,
  alt,
  userId,
  style = {},
  initial = "S",
}) {
  const [error, setError] = useState(false);
  const letter = (alt || initial || "S")[0].toUpperCase();

  if (src && !error) {
    return (
      <img
        src={src}
        alt={alt || "Profile"}
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #F5A623, #FFD17C)",
        color: "#111",
        fontWeight: 900,
        fontSize: "16px",
        userSelect: "none",
        ...style,
      }}
    >
      {letter}
    </div>
  );
}
