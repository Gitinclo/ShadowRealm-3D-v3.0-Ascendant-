export class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd * jitter), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playSwing(): void {
    this.playTone(340, 110, 0.14, 'sawtooth', 0.08);
  }

  playHit(isCrit: boolean): void {
    if (isCrit) {
      this.playTone(580, 180, 0.22, 'triangle', 0.14);
      this.playTone(960, 420, 0.18, 'sine', 0.1);
    } else {
      this.playTone(210, 75, 0.12, 'square', 0.09);
    }
  }

  playPower(): void {
    this.playTone(220, 620, 0.28, 'sawtooth', 0.11);
    this.playTone(440, 140, 0.32, 'triangle', 0.1);
  }

  playHeal(): void {
    this.playTone(420, 660, 0.22, 'sine', 0.09);
    this.playTone(640, 920, 0.3, 'triangle', 0.07);
  }

  playDash(): void {
    this.playTone(500, 140, 0.16, 'triangle', 0.08);
  }

  playJump(): void {
    this.playTone(180, 320, 0.12, 'sine', 0.07);
  }

  playHurt(): void {
    this.playTone(150, 55, 0.22, 'sawtooth', 0.13);
  }

  playTelegraph(): void {
    this.playTone(280, 480, 0.26, 'sine', 0.06);
  }

  playDomain(): void {
    this.playTone(110, 55, 0.75, 'sawtooth', 0.13);
    this.playTone(330, 165, 0.65, 'sine', 0.09);
  }

  playNuke(): void {
    this.playTone(95, 28, 0.9, 'sawtooth', 0.18);
    this.playTone(180, 40, 0.7, 'square', 0.12);
  }

  playLevelUp(): void {
    this.playTone(440, 660, 0.22, 'triangle', 0.1);
    setTimeout(() => this.playTone(660, 880, 0.32, 'triangle', 0.1), 110);
  }

  playDefeat(): void {
    this.playTone(220, 70, 0.65, 'sawtooth', 0.12);
  }
}
