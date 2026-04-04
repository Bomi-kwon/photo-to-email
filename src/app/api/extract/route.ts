import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

type ImageMediaType = (typeof ALLOWED_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = (await req.json()) as {
      image: string;
      mediaType: string;
    };

    if (!image || !mediaType) {
      return NextResponse.json(
        { error: "이미지가 필요합니다." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(mediaType as ImageMediaType)) {
      return NextResponse.json(
        { error: "지원하지 않는 이미지 형식이에요." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mediaType,
          data: image,
        },
      },
      {
        text: `이 이미지에서 이메일 주소를 모두 찾아주세요.

규칙:
- 손글씨, 인쇄물, 스크린샷 등 어떤 형태든 이메일 주소를 찾아주세요.
- 이메일 주소만 추출하세요. 다른 텍스트는 무시하세요.
- 각 이메일 주소를 한 줄에 하나씩 출력하세요.
- 이메일 주소가 없으면 "NONE"이라고만 출력하세요.
- 이메일 주소 외에 다른 설명이나 텍스트를 출력하지 마세요.`,
      },
    ]);

    const text = result.response.text();

    if (text.trim() === "NONE") {
      return NextResponse.json({ emails: [] });
    }

    const emails = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("@") && line.includes("."));

    return NextResponse.json({ emails });
  } catch (error) {
    console.error("Email extraction error:", error);
    return NextResponse.json(
      { error: "이메일 추출 중 오류가 발생했어요. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
