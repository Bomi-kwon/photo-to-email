"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type Status = "idle" | "cropping" | "loading" | "done" | "error";

function getCroppedImageBase64(
  image: HTMLImageElement,
  crop: PixelCrop,
  mimeType: string
): string {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas.toDataURL(mimeType).split(",")[1];
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [emails, setEmails] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  // Crop state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  function handleFileSelect(file: File) {
    if (file.type && !file.type.startsWith("image/")) {
      setErrorMsg("이미지 파일만 선택해주세요.");
      setStatus("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("파일이 너무 커요. 10MB 이하로 선택해주세요.");
      setStatus("error");
      return;
    }

    setMediaType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setStatus("cropping");
    };
    reader.readAsDataURL(file);
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
  }, []);

  async function handleExtract() {
    if (!imgRef.current || !imageSrc) return;

    setStatus("loading");
    setEmails([]);
    setErrorMsg("");

    try {
      let base64: string;
      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        base64 = getCroppedImageBase64(imgRef.current, completedCrop, mediaType);
      } else {
        // No crop selected — send full image
        base64 = imageSrc.split(",")[1];
      }

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "서버 오류가 발생했어요.");
      }

      if (data.emails.length === 0) {
        setErrorMsg(
          "이메일 주소를 찾지 못했어요.\n영역을 다시 선택하거나 다른 사진으로 시도해보세요."
        );
        setStatus("error");
      } else {
        setEmails(data.emails);
        setStatus("done");
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "오류가 발생했어요. 다시 시도해주세요."
      );
      setStatus("error");
    }
  }

  async function copyEmail(email: string, idx: number) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = email;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  }

  function reset() {
    setStatus("idle");
    setEmails([]);
    setErrorMsg("");
    setCopiedIdx(null);
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-lg mx-auto w-full">
      <h1 className="text-3xl font-bold text-indigo-600 mb-2">📧 이메일 리더</h1>
      <p className="text-lg text-gray-600 mb-8">사진에서 이메일 주소를 읽어드려요</p>

      {/* file inputs always in DOM — iOS drops onChange if unmounted while picker is open */}
      <input
        id="camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="fixed -top-[200px] left-0 opacity-0 pointer-events-none"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
      />
      <input
        id="gallery-input"
        type="file"
        accept="image/*"
        className="fixed -top-[200px] left-0 opacity-0 pointer-events-none"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
      />

      {status === "idle" && (
        <div className="w-full space-y-4">
          <label
            htmlFor="camera-input"
            className="block w-full py-6 bg-indigo-600 text-white text-2xl font-bold rounded-2xl shadow-lg active:bg-indigo-700 transition text-center cursor-pointer"
          >
            📷 사진 촬영하기
          </label>

          <label
            htmlFor="gallery-input"
            className="block w-full py-6 bg-white text-indigo-600 text-2xl font-bold rounded-2xl shadow-lg border-2 border-indigo-600 active:bg-indigo-50 transition text-center cursor-pointer"
          >
            🖼️ 갤러리에서 선택
          </label>
        </div>
      )}

      {status === "cropping" && imageSrc && (
        <div className="w-full flex flex-col gap-4">
          <p className="text-center text-gray-600 text-lg">
            이메일이 있는 부분을 손가락으로 선택하세요
          </p>
          <p className="text-center text-gray-400 text-sm">
            선택하지 않으면 전체 사진을 인식해요
          </p>

          <div className="w-full rounded-2xl overflow-hidden border-2 border-indigo-200 bg-gray-100">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
            >
              <img
                src={imageSrc}
                alt="업로드된 사진"
                onLoad={onImageLoad}
                style={{ maxWidth: "100%", maxHeight: "60vh", display: "block" }}
              />
            </ReactCrop>
          </div>

          <button
            onClick={handleExtract}
            className="w-full py-6 bg-indigo-600 text-white text-2xl font-bold rounded-2xl shadow-lg active:bg-indigo-700 transition"
          >
            {completedCrop && completedCrop.width > 0
              ? "✂️ 선택 영역에서 이메일 찾기"
              : "🔍 전체 사진에서 이메일 찾기"}
          </button>

          <button
            onClick={reset}
            className="w-full py-4 bg-white text-gray-500 text-lg font-bold rounded-2xl border border-gray-300 active:bg-gray-50 transition"
          >
            ← 돌아가기
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xl text-gray-700 font-medium">
            이메일 주소를 찾고 있어요...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="w-full flex flex-col items-center gap-4 mt-4">
          <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-xl text-red-700 whitespace-pre-line">{errorMsg}</p>
          </div>
          {imageSrc && (
            <button
              onClick={() => {
                setErrorMsg("");
                setCrop(undefined);
                setCompletedCrop(undefined);
                setStatus("cropping");
              }}
              className="w-full py-5 bg-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg active:bg-indigo-700 transition"
            >
              ✂️ 다른 영역 선택하기
            </button>
          )}
          <button
            onClick={reset}
            className="w-full py-5 bg-white text-indigo-600 text-xl font-bold rounded-2xl shadow border-2 border-indigo-600 active:bg-indigo-50 transition"
          >
            🔄 다른 사진으로 시도하기
          </button>
        </div>
      )}

      {status === "done" && (
        <div className="w-full flex flex-col gap-4">
          <p className="text-lg text-gray-500 text-center mb-2">
            {emails.length}개의 이메일을 찾았어요!
          </p>

          {emails.map((email, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-4"
            >
              <p className="text-2xl font-bold text-gray-900 break-all text-center select-all">
                {email}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => copyEmail(email, idx)}
                  className="flex-1 py-4 bg-gray-100 text-gray-800 text-lg font-bold rounded-xl active:bg-gray-200 transition"
                >
                  {copiedIdx === idx ? "✅ 복사됨!" : "📋 복사하기"}
                </button>

                <a
                  href={`mailto:${email}`}
                  className="flex-1 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl text-center active:bg-indigo-700 transition"
                >
                  ✉️ 메일 보내기
                </a>
              </div>
            </div>
          ))}

          {imageSrc && (
            <button
              onClick={() => {
                setCrop(undefined);
                setCompletedCrop(undefined);
                setEmails([]);
                setStatus("cropping");
              }}
              className="w-full py-5 mt-2 bg-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg active:bg-indigo-700 transition"
            >
              ✂️ 같은 사진에서 다른 영역 선택
            </button>
          )}

          <button
            onClick={reset}
            className="w-full py-5 bg-white text-indigo-600 text-xl font-bold rounded-2xl shadow border-2 border-indigo-600 active:bg-indigo-50 transition"
          >
            🔄 다른 사진 읽기
          </button>
        </div>
      )}
    </main>
  );
}
