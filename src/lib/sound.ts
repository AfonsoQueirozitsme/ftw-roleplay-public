// src/lib/sound.ts
// Módulo simples de som (sem dependências). Usa HTMLAudioElement por evento.
type Name = "ping" | "success" | "error";

class Sound {
  private buffers: Record<Name, HTMLAudioElement> = {
    ping: new Audio("/sounds/ping.mp3"),
    success: new Audio("/sounds/success.mp3"),
    error: new Audio("/sounds/error.mp3"),
  };
  muted = false;
  volume = 0.7;

  constructor() {
    try {
      const m = localStorage.getItem("snd:muted");
      const v = localStorage.getItem("snd:vol");
      if (m != null) this.muted = m === "1";
      if (v != null) this.volume = Math.max(0, Math.min(1, Number(v)));
      Object.values(this.buffers).forEach(a => (a.volume = this.volume));
    } catch {}
  }

  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem("snd:muted", m ? "1" : "0"); } catch {}
  }
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem("snd:vol", String(this.volume)); } catch {}
    Object.values(this.buffers).forEach(a => (a.volume = this.volume));
  }
  play(n: Name) {
    if (this.muted) return;
    const a = this.buffers[n];
    if (!a) return;
    try { a.currentTime = 0; a.play().catch(() => {}); } catch {}
  }
}

export const sound = new Sound();
