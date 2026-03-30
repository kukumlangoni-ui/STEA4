import { useState } from 'react';

// A simple, reusable profile image component with fallback
export default function ProfileImage({ src, alt, className, userId }) {
  const [error, setError] = useState(false);

  // Fallback to a generative avatar if the src image fails or is not provided
  const handleError = () => {
    setError(true);
  };

  // Simple hash function to get a color from the userId
  const getHash = (input) => {
    let hash = 0;
    if (!input) return hash;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

  const getInitials = (id) => {
    return id ? id.substring(0, 2).toUpperCase() : '??';
  }

  // Generate a background color from the user ID
  const getAvatarColor = (id) => {
    if (!id) return '#a0aec0'; // gray-500
    const colors = [
      '#f56565', // red-500
      '#ed8936', // orange-500
      '#ecc94b', // yellow-500
      '#48bb78', // green-500
      '#38b2ac', // teal-500
      '#4299e1', // blue-500
      '#667eea', // indigo-500
      '#9f7aea', // purple-500
      '#ed64a6', // pink-500
    ];
    const hash = getHash(id);
    return colors[Math.abs(hash) % colors.length];
  };

  if (error || !src) {
    // Fallback UI: generative avatar with initials
    return (
      <div
        className={`flex items-center justify-center w-full h-full rounded-full bg-gray-700 text-white font-bold ${className}`}
        style={{ backgroundColor: getAvatarColor(userId) }}
      >
        <span>{getInitials(userId)}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover ${className}`}
      onError={handleError}
      referrerPolicy="no-referrer"
    />
  );
}
