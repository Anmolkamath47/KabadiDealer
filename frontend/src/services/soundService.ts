class NotificationSoundService {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private loopTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  public unlockAudio() {
    this.initContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Play a clean, warm, pleasant melodic notification chime (like an elegant doorbell / mobile chime)
   * Four ascending harmonic notes: C5 -> E5 -> G5 -> C6
   */
  private playSmoothChime() {
    this.initContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().then(() => this.playSmoothChime()).catch(() => {});
      return;
    }

    const notes = [
      { freq: 523.25, time: 0.0, duration: 0.35, gain: 0.5 },  // C5
      { freq: 659.25, time: 0.12, duration: 0.35, gain: 0.55 }, // E5
      { freq: 783.99, time: 0.24, duration: 0.45, gain: 0.6 },  // G5
      { freq: 1046.5, time: 0.36, duration: 0.65, gain: 0.65 }, // C6
    ];

    const now = this.audioCtx.currentTime;

    notes.forEach((n) => {
      if (!this.audioCtx) return;

      // Primary tone (warm sine wave)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, now + n.time);

      gain.gain.setValueAtTime(0.0001, now + n.time);
      gain.gain.exponentialRampToValueAtTime(n.gain, now + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now + n.time);
      osc.stop(now + n.time + n.duration);

      // Subtle harmonic overtone for warm bell/chime acoustic depth
      const harmonicOsc = this.audioCtx.createOscillator();
      const harmonicGain = this.audioCtx.createGain();

      harmonicOsc.type = 'triangle';
      harmonicOsc.frequency.setValueAtTime(n.freq * 2, now + n.time);

      harmonicGain.gain.setValueAtTime(0.0001, now + n.time);
      harmonicGain.gain.exponentialRampToValueAtTime(n.gain * 0.2, now + n.time + 0.02);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.duration * 0.7);

      harmonicOsc.connect(harmonicGain);
      harmonicGain.connect(this.audioCtx.destination);

      harmonicOsc.start(now + n.time);
      harmonicOsc.stop(now + n.time + n.duration);
    });
  }

  /**
   * Start pleasant smooth notification chime loop
   */
  startSiren() {
    if (this.isPlaying) return;

    try {
      this.initContext();
      this.isPlaying = true;

      // Play immediately
      this.playSmoothChime();

      // Repeat politely every 2.0 seconds until accepted/dismissed
      this.loopTimer = setInterval(() => {
        if (!this.isPlaying) return;
        this.playSmoothChime();
      }, 2000);
    } catch (err) {
      console.warn('Web Audio notification chime error:', err);
    }
  }

  /**
   * Stop notification chime immediately
   */
  stopSiren() {
    if (!this.isPlaying) return;

    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }

    this.isPlaying = false;
  }
}

export const soundService = new NotificationSoundService();
