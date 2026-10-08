/**
 * Service de sons temps réel et tonalités d'appel Web Audio API
 * Fonctionne sans dépendance de fichier externe sur Web, Android et iOS.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private currentRingtoneInterval: any = null;
  private isRingtonePlaying = false;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Tonalité de sonnerie pour appel entrant (mélodie douce et rythmée)
   */
  public startIncomingRingtone(): () => void {
    this.stopRingtone();
    this.isRingtonePlaying = true;

    const playToneBurst = () => {
      if (!this.isRingtonePlaying) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Fréquences harmonieuses 520Hz & 660Hz (style carillon moderne)
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.setValueAtTime(660, now + 0.15);
      osc1.frequency.setValueAtTime(520, now + 0.3);
      osc1.frequency.setValueAtTime(780, now + 0.45);

      osc2.frequency.setValueAtTime(260, now);
      osc2.frequency.setValueAtTime(330, now + 0.15);
      osc2.frequency.setValueAtTime(260, now + 0.3);
      osc2.frequency.setValueAtTime(390, now + 0.45);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gainNode.gain.setValueAtTime(0.2, now + 0.7);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.0);
      osc2.stop(now + 1.0);
    };

    playToneBurst();
    this.currentRingtoneInterval = setInterval(playToneBurst, 2200);

    return () => this.stopRingtone();
  }

  /**
   * Tonalité d'attente / composition pour l'initiateur de l'appel
   */
  public startDialingTone(): () => void {
    this.stopRingtone();
    this.isRingtonePlaying = true;

    const playDialBurst = () => {
      if (!this.isRingtonePlaying) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gainNode.gain.setValueAtTime(0.08, now + 1.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.25);
      osc2.stop(now + 1.25);
    };

    playDialBurst();
    this.currentRingtoneInterval = setInterval(playDialBurst, 3000);

    return () => this.stopRingtone();
  }

  /**
   * Arrêt complet de toute sonnerie active
   */
  public stopRingtone(): void {
    this.isRingtonePlaying = false;
    if (this.currentRingtoneInterval) {
      clearInterval(this.currentRingtoneInterval);
      this.currentRingtoneInterval = null;
    }
  }

  /**
   * Bip sonore positif quand un participant rejoint le salon
   */
  public playJoinSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Bip sonore descendant quand un appel prend fin
   */
  public playLeaveSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export const soundService = new SoundService();
