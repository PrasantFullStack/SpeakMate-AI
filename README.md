# SpeakMate AI — Real-Time Multi-Language Voice Tutor SaaS Platform

SpeakMate AI helps learners worldwide master spoken languages through real-time two-way voice conversations with adaptive AI tutors, scenario-based role-play, and bilingual post-conversation diagnostics (including **Hindi-to-English** grammar explanations for Indian learners).

## Supported Languages (Extensible Architecture)
1. **English** (`en-US` · Tutor: Clara Vance)
2. **Hindi** (`hi-IN` · हिन्दी · Tutor: Aarav Sharma)
3. **Spanish** (`es-ES` · Español · Tutor: Mateo Rivera)
4. **French** (`fr-FR` · Français · Tutor: Camille Laurent)
5. **German** (`de-DE` · Deutsch · Tutor: Lukas Weber)
6. **Japanese** (`ja-JP` · 日本語 · Tutor: Haruka Sato)
7. **Korean** (`ko-KR` · 한국어 · Tutor: Ji-hoon Park)
8. **Mandarin Chinese** (`zh-CN` · 普通话 · Tutor: Lin Wei)
9. **Italian** (`it-IT` · Italiano · Tutor: Sofia Conti)
10. **Portuguese** (`pt-BR` · Português · Tutor: Lucas Almeida)

New languages can be registered dynamically via `registerLanguageConfig()` in `src/config/languages.ts`.

## Core Features
- **Personalized Onboarding**: Configure native language, preferred explanation language (including Hindi + English / Hinglish), target language, CEFR proficiency level (`Beginner`, `Intermediate`, `Advanced`), daily goal, and learning objective.
- **Real-Time Two-Way Voice Conversations**: Server-side WebSocket bridge (`/api/live-voice`) connecting to the Gemini Live API (`gemini-3.8-live`) with 16kHz PCM microphone capture and gapless 24kHz PCM playback.
- **Resilient Hybrid Voice/Text Fallback**: Automatically detects microphone availability and language acoustic support, falling back seamlessly to `gemini-3.8-flash` + `gemini-3.8-flash-lite-tts` speech synthesis when hardware microphone streams are unavailable.
- **Post-Conversation Bilingual Diagnostics**: Evaluates grammar, vocabulary, sentence structure, fluency, and pronunciation (with honest capability disclaimers where pitch-accent or tonal acoustics are approximated). Displays **Original Sentence**, **Corrected Sentence**, **Explanation in Preferred Language**, and **Natural Example**.
- **Vocabulary Notebook & Revision Exercises**: Save phrases directly from conversation feedback and test retention with interactive multiple-choice grammar drills.
- **Server-Enforced Subscription Quotas & Admin Analytics**: Free, Starter, and Pro plans enforced on the server, plus an Admin Console and production Java Spring Boot + Spring Security + MySQL integration blueprint.

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set `GEMINI_API_KEY` in `.env` (or configure via the AI Studio Secrets panel).
3. Start the full-stack server on port 3000:
   ```bash
   npm run dev
   ```
4. Run unit tests:
   ```bash
   npx --yes tsx --test src/utils/learningEngine.test.ts
   ```
