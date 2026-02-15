import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import apiClient from "../api/axios";

/**
 * ImageUpload — A file upload component that uploads to S3 via the backend
 * and returns the CDN URL.
 *
 * Props:
 *   value       — current image URL (string)
 *   onChange    — called with the new URL after successful upload
 *   onRemove   — called when user removes the image (optional)
 *   label      — label text (optional, default "Upload Image")
 *   className  — additional wrapper classes (optional)
 */
export default function ImageUpload({ value, onChange, onRemove, label = "Upload Image", className = "" }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiClient.post("/admin/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(res.data.data.url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  // If we have a value, show the preview
  if (value && value.trim()) {
    return (
      <div className={`relative inline-block ${className}`}>
        <img
          src={value}
          alt="Uploaded"
          className="h-24 w-24 rounded-md object-cover border border-gray-200"
          onError={(e) => { e.target.src = ""; }}
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Upload zone
  return (
    <div className={className}>
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
          dragOver
            ? "border-gray-900 bg-gray-50"
            : "border-gray-300 hover:border-gray-400"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-1" />
        ) : (
          <Upload className="h-6 w-6 text-gray-400 mb-1" />
        )}
        <span className="text-xs text-gray-500">
          {uploading ? "Uploading..." : label}
        </span>
        <span className="text-xs text-gray-400 mt-0.5">
          Click or drag & drop
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
