import { UrgencyLevel } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Synthesizes chime / alarm alerts directly using the Web Audio API without needing external mp3 files.
 */
export function playAlertSound(level: UrgencyLevel = 'firm') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (level === 'gentle') {
      // Gentle two-note chime (E5 -> G5)
      playTone(ctx, 659.25, now, 0.25, 'sine', 0.2);
      playTone(ctx, 783.99, now + 0.15, 0.4, 'sine', 0.2);
    } else if (level === 'firm') {
      // Crisp assertive double-beep (A5 -> E6)
      playTone(ctx, 880, now, 0.12, 'triangle', 0.3);
      playTone(ctx, 1318.51, now + 0.14, 0.28, 'triangle', 0.3);
    } else if (level === 'urgent') {
      // Fast pulsing warning tone
      playTone(ctx, 987.77, now, 0.1, 'sawtooth', 0.35);
      playTone(ctx, 783.99, now + 0.12, 0.1, 'sawtooth', 0.35);
      playTone(ctx, 987.77, now + 0.24, 0.25, 'sawtooth', 0.35);
    } else {
      // Relentless emergency siren chime
      playTone(ctx, 1046.5, now, 0.08, 'square', 0.3);
      playTone(ctx, 1318.51, now + 0.09, 0.08, 'square', 0.3);
      playTone(ctx, 1567.98, now + 0.18, 0.08, 'square', 0.3);
      playTone(ctx, 2093.0, now + 0.27, 0.35, 'square', 0.35);
    }
  } catch (err) {
    console.warn('AudioContext playback error:', err);
  }
}

/**
 * Celebratory chime when user marks a task done!
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Ascending major chord arpeggio (C5 - E5 - G5 - C6)
    playTone(ctx, 523.25, now, 0.12, 'sine', 0.25);
    playTone(ctx, 659.25, now + 0.09, 0.12, 'sine', 0.25);
    playTone(ctx, 783.99, now + 0.18, 0.15, 'sine', 0.25);
    playTone(ctx, 1046.5, now + 0.27, 0.5, 'triangle', 0.3);
  } catch (err) {
    console.warn('Success sound error:', err);
  }
}

/**
 * Soft tone for snoozing
 */
export function playSnoozeSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Descending tone (G5 -> C5)
    playTone(ctx, 783.99, now, 0.15, 'sine', 0.2);
    playTone(ctx, 523.25, now + 0.12, 0.3, 'sine', 0.15);
  } catch (err) {
    console.warn('Snooze sound error:', err);
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainLevel = 0.2
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

let activeAudioElement: HTMLAudioElement | null = null;

/**
 * Plays voice message either via Gemini TTS audio data or Web Speech API fallback
 */
export async function speakAgentMessage(
  text: string,
  voiceName: string = 'Kore'
): Promise<void> {
  // Stop any currently playing audio element
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  try {
    // Try server-side Gemini TTS first
    const response = await fetch('/api/agent/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audioData) {
        const audio = new Audio(data.audioData);
        activeAudioElement = audio;
        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Gemini TTS failed or unavailable, falling back to Web Speech API:', err);
  }

  // Fallback: Web Speech API
  if ('speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (speechErr) {
      console.warn('Web Speech API error:', speechErr);
    }
  }
}

export function stopAllSpeech() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
