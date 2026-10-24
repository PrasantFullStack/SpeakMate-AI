/**
 * Raw PCM 16kHz Microphone Capture & Gapless 24kHz Audio Playback Utility
 * Designed specifically for the Gemini Live API (`gemini-3.8-live`) and
 * unary WAV playback for `gemini-3.8-flash-lite-tts`.
 */

export function float32ToPcm16Base64(float32Array: Float32Array): string {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function calculateRmsLevel(float32Array: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < float32Array.length; i++) {
    sum += float32Array[i] * float32Array[i];
  }
  const rms = Math.sqrt(sum / float32Array.length);
  return Math.min(100, Math.round(rms * 400));
}

export class GaplessPcmPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  private getContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx({ sampleRate: 24000 });
      this.nextStartTime = 0;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public playPcm24kBase64(base64Pcm: string): void {
    try {
      const ctx = this.getContext();
      const binary = window.atob(base64Pcm);
      const byteLength = binary.length;
      const bytes = new Uint8Array(byteLength);
      for (let i = 0; i < byteLength; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      if (this.nextStartTime < now) {
        this.nextStartTime = now + 0.02;
      }
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
      };
    } catch (_err) {
      // Ignore audio decode glitches on headless browsers without audio devices
    }
  }

  public stopAll(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch (_e) {}
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
  }

  public close(): void {
    this.stopAll();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
  }
}

export function playWavBase64OrSpeak(
  wavBase64: string | null | undefined,
  fallbackText: string,
  bcp47Lang: string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (wavBase64) {
    try {
      const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
      onStart?.();
      audio.onended = () => onEnd?.();
      audio.onerror = () => onEnd?.();
      audio.play().catch(() => {
        onEnd?.();
      });
      return;
    } catch (_e) {}
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(fallbackText);
      utterance.lang = bcp47Lang;
      utterance.rate = 0.96;
      onStart?.();
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
      return;
    } catch (_e) {}
  }

  onStart?.();
  setTimeout(() => onEnd?.(), 600);
}
