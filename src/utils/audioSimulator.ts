// Web Audio API synthesizer for interactive audio feedback in browser preview
class WebAudioPlayer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private timerId: number | null = null;
  private currentFrequencyIndex = 0;

  // Pentatonic pleasant chill frequencies
  private chords = [
    [261.63, 329.63, 392.00], // C major
    [220.00, 261.63, 329.63], // A minor
    [174.61, 220.00, 261.63], // F major
    [196.00, 246.94, 293.66], // G major
  ];

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public play(volume: number = 0.5) {
    if (this.isPlaying) return;
    try {
      const ctx = this.getContext();
      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime((volume / 100) * 0.15, ctx.currentTime + 0.1);

      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(800, ctx.currentTime);

      this.gainNode.connect(this.filterNode);
      this.filterNode.connect(ctx.destination);

      this.isPlaying = true;
      this.scheduleArpeggio();
    } catch {
      // AudioContext may be restricted before user gesture
    }
  }

  private scheduleArpeggio() {
    if (!this.isPlaying || !this.ctx || !this.gainNode) return;

    try {
      const ctx = this.ctx;
      const chord = this.chords[this.currentFrequencyIndex % this.chords.length];
      this.currentFrequencyIndex++;

      chord.forEach((freq, i) => {
        if (!this.gainNode) return;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.25);

        noteGain.gain.setValueAtTime(0, ctx.currentTime + i * 0.25);
        noteGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.25 + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.8);

        osc.connect(noteGain);
        noteGain.connect(this.gainNode);

        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.85);
      });

      this.timerId = window.setTimeout(() => {
        this.scheduleArpeggio();
      }, 1000);
    } catch {
      // Ignore audio interruption
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      } catch {
        // Safe fail
      }
    }
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch {
        // Safe fail
      }
      this.oscillator = null;
    }
  }

  public setVolume(volume: number) {
    if (this.gainNode && this.ctx) {
      try {
        const val = Math.max(0, Math.min(1, (volume / 100) * 0.2));
        this.gainNode.gain.setValueAtTime(val, this.ctx.currentTime);
      } catch {
        // Safe fail
      }
    }
  }

  public playCueSound(type: 'skip' | 'alert' | 'success') {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'skip') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        osc.type = 'triangle';
      } else if (type === 'alert') {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.setValueAtTime(240, ctx.currentTime + 0.08);
        osc.type = 'sawtooth';
      } else {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);
        osc.type = 'sine';
      }

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // User hasn't interacted with audio yet
    }
  }
}

export const audioPlayer = new WebAudioPlayer();
