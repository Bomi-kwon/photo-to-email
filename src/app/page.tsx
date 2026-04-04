"use client";

import { useState, useRef } from "react";

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [emails, setEmails] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("이미지 파일만 선택해주세요.");
      setStatus("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("파일이 너무 커요. 10MB 이하로 선택해주세요.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setEmails([]);
    setErrorMsg("");

    try {
      const base64 = await toBase64(file);
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mediaType: file.type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "서버 오류가 발생했어요.");
      }

      if (data.emails.length === 0) {
        setErrorMsg("이메일 주소를 찾지 못했어요.\n다른 사진으로 다시 시도해보세요.");
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

  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-lg mx-auto w-full">
      <h1 className="text-3xl font-bold text-indigo-600 mb-2">📧 이메일 리더</h1>
      <p className="text-lg text-gray-600 mb-8">사진에서 이메일 주소를 읽어드려요</p>

      {status === "idle" && (
        <div className="w-full space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          <button
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.setAttribute("capture", "environment");
                fileRef.current.click();
              }
            }}
            className="w-full py-6 bg-indigo-600 text-white text-2xl font-bold rounded-2xl shadow-lg active:bg-indigo-700 transition"
          >
            📷 사진 촬영하기
          </button>

          <button
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.removeAttribute("capture");
                fileRef.current.click();
              }
            }}
            className="w-full py-6 bg-white text-indigo-600 text-2xl font-bold rounded-2xl shadow-lg border-2 border-indigo-600 active:bg-indigo-50 transition"
          >
            🖼️ 갤러리에서 선택
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
        <div className="w-full flex flex-col items-center gap-6 mt-4">
          <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-xl text-red-700 whitespace-pre-line">{errorMsg}</p>
          </div>
          <button
            onClick={reset}
            className="w-full py-5 bg-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg active:bg-indigo-700 transition"
          >
            🔄 다시 시도하기
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

          <button
            onClick={reset}
            className="w-full py-5 mt-4 bg-white text-indigo-600 text-xl font-bold rounded-2xl shadow border-2 border-indigo-600 active:bg-indigo-50 transition"
          >
            🔄 다른 사진 읽기
          </button>
        </div>
      )}
    </main>
  );
}
