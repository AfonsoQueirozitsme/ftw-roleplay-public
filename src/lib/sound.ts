// src/lib/sound.ts
// Controlo central de sons: mute, volume, rate-limit e fallback beep.

export type SoundName = "ping" | "success" | "error";

const FILES: Record<SoundName, string> = {
  ping: "/sounds/ping.mp3",
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
};

const LS_MUTED = "sound:muted";
const LS_VOL = "sound:volume";

type Player = { el?: HTMLAudioElement; lastAt: number };
const players: Partial<Record<SoundName, Player>> = {};

function ensure(name: SoundName) {
  if (!players[name]) players[name] = { lastAt: 0 };
  const p = players[name]!;
  if (!p.el) {
    const el = new Audio(FILES[name]);
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    p.el = el;
  }
  return p;
}

function beep(freq = 880, ms = 160) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, ms);
  } catch { /* ignore */ }
}

export const sound = {
  get muted() { return localStorage.getItem(LS_MUTED) === "1"; },
  setMuted(v: boolean) { v ? localStorage.setItem(LS_MUTED, "1") : localStorage.removeItem(LS_MUTED); },
  get volume() {
    const v = Number(localStorage.getItem(LS_VOL));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  },
  setVolume(v: number) { localStorage.setItem(LS_VOL, String(Math.min(1, Math.max(0, v)))); },

  async play(name: SoundName = "ping", rateLimitMs = 700) {
    if (this.muted) return;
    const p = ensure(name);
    const now = Date.now();
    if (now - p.lastAt < rateLimitMs) return;
    p.lastAt = now;
    try {
      if (!p.el) throw new Error("no audio");
      p.el.currentTime = 0;
      p.el.volume = this.volume;
      await p.el.play();
    } catch {
      beep(name === "error" ? 320 : name === "success" ? 660 : 880);
    }
  },
};
