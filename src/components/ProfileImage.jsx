import { useState } from "react";

export default function ProfileImage({ src, alt, userId, className = "w-10 h-10", fallbackInitials = "S" }) {
  const [error, setError] = useState(false);
  const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      ) : (
        <img
          src={fallbackUrl}
          alt="Fallback Profile"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
