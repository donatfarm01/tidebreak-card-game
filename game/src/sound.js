// sound.js — tiny synthesized sounds for Tidebreak, no audio files.
// One job: short WebAudio beeps (click, card snap, win, loss) with a
// mute switch. The audio context is created lazily on the first user
// gesture, so the game never tries to play before it is allowed to.

let audioContext = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function context() {
  if (audioContext) return audioContext;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  audioContext = new AudioCtx();
  return audioContext;
}

function tone(frequency, startAt, duration, type, volume) {
  const ctx = context();
  if (!ctx || muted) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(ctx.currentTime + startAt);
  oscillator.stop(ctx.currentTime + startAt + duration);
}

export function playClick() {
  tone(660, 0, 0.07, 'triangle', 0.12);
}

export function playCardSnap() {
  tone(220, 0, 0.09, 'square', 0.1);
  tone(440, 0.05, 0.1, 'triangle', 0.12);
}

export function playWinChord() {
  tone(523, 0, 0.18, 'triangle', 0.14);
  tone(659, 0.12, 0.18, 'triangle', 0.14);
  tone(784, 0.24, 0.3, 'triangle', 0.16);
}

export function playLossTone() {
  tone(392, 0, 0.22, 'sine', 0.14);
  tone(311, 0.18, 0.3, 'sine', 0.14);
  tone(233, 0.36, 0.45, 'sine', 0.12);
}
