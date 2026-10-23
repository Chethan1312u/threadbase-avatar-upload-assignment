import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(selectedFile) {
    setError("");
    setUploadedUrl("");
    setProgress(0);

    if (!selectedFile) return;

    if (!ALLOWED.includes(selectedFile.type)) {
      setFile(null);
      setPreviewUrl("");
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setFile(null);
      setPreviewUrl("");
      setError("File must be 5MB or smaller.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  async function upload() {
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);
    setError("");
    setUploadedUrl("");
    setProgress(0);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });
      setProgress(100);
      setUploadedUrl(
        new URL(
          response.data.url,
          apiClient.defaults.baseURL || window.location.origin,
        ).href,
      );
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          uploadError.message ||
          "Upload failed. Please try again.",
      );
    }
  }

  return (
    <div>
      <div
        className={`drop-zone${isDragging ? " dragging" : ""}`}
        onClick={(event) => {
          if (event.target !== inputRef.current) inputRef.current.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Drag an image here, or click to choose</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            handleFile(event.target.files[0]);
            event.target.value = "";
          }}
        />
      </div>

      {previewUrl && <img className="preview" src={previewUrl} alt="Avatar preview" />}
      {error && <p className="error" role="alert">{error}</p>}
      {progress > 0 && (
        <div
          className="bar"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>
      )}
      {uploadedUrl && (
        <p>
          Uploaded: <a href={uploadedUrl}>{uploadedUrl}</a>
        </p>
      )}
      <button onClick={upload} disabled={!file}>Upload</button>
    </div>
  );
}
