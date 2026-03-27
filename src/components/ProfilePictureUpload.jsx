import { useState } from "react";
import { storage, ref, uploadBytes, getDownloadURL, db, doc, updateDoc } from "../firebase.js";

export default function ProfilePictureUpload({ userId, currentPhotoURL, onUpdate }) {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!userId) {
      alert("No user ID found. Please log in.");
      return;
    }
    console.log("Uploading for userId:", userId);

    setLoading(true);
    try {
      const storageRef = ref(storage, `profilePictures/${userId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      onUpdate(downloadURL);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert("Failed to upload profile picture: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <img
        src={currentPhotoURL || "/default-avatar.png"}
        alt="Profile"
        className="w-24 h-24 rounded-full object-cover border border-white/10"
        referrerPolicy="no-referrer"
      />
      <label className="cursor-pointer bg-[#F5A623] text-[#111] px-4 py-2 rounded-lg font-bold text-sm">
        {loading ? "Uploading..." : "Change Picture"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={loading} />
      </label>
    </div>
  );
}
