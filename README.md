# Interviews Cracker (`Interviews Cracker AI`) — AI Interview Preparation & Multi-Language Communication Coaching Platform

**Interviews Cracker** is an AI-powered interview preparation and communication coaching SaaS platform designed to help engineers and professionals worldwide ace technical interviews, HR behavioral rounds, and multi-language workplace conversations through real-time voice coaching.

## Core Positioning & Capabilities
- **Real-Time AI Voice Mock Interviews**: Two-way voice conversations powered by the Gemini Live API (`gemini-3.8-live`) with 16kHz PCM microphone capture and gapless 24kHz PCM playback, plus resilient hybrid text/TTS fallback (`gemini-3.8-flash` + `gemini-3.8-flash-lite-tts`).
- **Technical Interview Practice**: Dedicated mock interview scenarios covering **Java, Spring Boot, React, SQL**, system design, and stakeholder architecture reviews.
- **HR & Behavioral Interview Preparation**: Practice STAR-method leadership stories, career introductions, conflict resolution, and salary/offer negotiations.
- **Spoken English & Communication Coaching**: Real-time and post-session diagnostics for grammar, vocabulary, clarity, sentence structure, and pronunciation.
- **Bilingual Correction Explanations**: Toggleable real-time grammar corrections during voice conversations and detailed post-session reports explained in the learner's preferred language—including **Hindi-to-English (Hinglish)** explanations for Indian users.
- **10 Supported Languages (Extensible Architecture)**:
  1. **English** (`en-US` · Coach: Clara Vance)
  2. **Hindi** (`hi-IN` · Hindustani · Coach: Aarav Sharma)
  3. **Spanish** (`es-ES` · Español · Coach: Mateo Rivera)
  4. **French** (`fr-FR` · Français · Coach: Camille Laurent)
  5. **German** (`de-DE` · Deutsch · Coach: Lukas Weber)
  6. **Japanese** (`ja-JP` · Nihongo · Coach: Haruka Sato)
  7. **Korean** (`ko-KR` · Hangugeo · Coach: Ji-hoon Park)
  8. **Mandarin Chinese** (`zh-CN` · Putonghua · Coach: Lin Wei)
  9. **Italian** (`it-IT` · Italiano · Coach: Sofia Conti)
  10. **Portuguese** (`pt-BR` · Português · Coach: Lucas Almeida)
- **Personalized Learning Paths, Streaks & Subscriptions**: Daily goal reminders on login, vocabulary notebook with interactive revision drills, and server-enforced Free, Starter, and Pro plans with a Java Spring Boot + Spring Security + MySQL integration blueprint.

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
