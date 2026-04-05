# 📧 이메일 리더

사진에서 이메일 주소를 읽어주는 모바일 웹앱.

명함이나 손글씨 메모를 촬영하면 AI가 이메일 주소를 인식하고, 바로 복사하거나 메일을 보낼 수 있습니다.

## 주요 기능

- **사진 촬영 / 갤러리 선택** — 카메라로 바로 찍거나 저장된 사진 사용
- **이미지 크롭** — 이메일이 있는 영역만 선택해서 인식 정확도 향상
- **손글씨 이메일 인식** — AI가 문맥을 고려해 도메인 오타 자동 교정 (예: `@mate.com` → `@nate.com`)
- **원터치 복사 & 메일 보내기** — 인식된 이메일을 바로 활용

## 기술 스택

- **Next.js 16** (App Router, Turbopack)
- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Google Gemini 2.5 Flash** (Vision API)
- **react-image-crop** (이미지 크롭)
- **Vercel** (배포)

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일에 Gemini API 키를 입력합니다:

```
GEMINI_API_KEY=your_api_key_here
```

> API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급받을 수 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`으로 접속합니다.

모바일에서 테스트하려면 같은 네트워크에서 `http://<내_IP>:3000`으로 접속합니다.

## 배포

Vercel에 GitHub 레포를 연결하면 `git push`만으로 자동 배포됩니다.

환경 변수 `GEMINI_API_KEY`를 Vercel 프로젝트 설정에서 추가해야 합니다.

## 라이선스

MIT
