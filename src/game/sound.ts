class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private vfxVolume: number = 0.5;
  private musicVolume: number = 0.5;
  
  private musicOscillators: OscillatorNode[] = [];
  private musicGainNode: GainNode | null = null;
  private currentMusicType: string = 'menu';
  private musicInterval: NodeJS.Timeout | null = null;
  private musicNoteIndex: number = 0;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setVFXVolume(volume: number) {
    this.vfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGainNode) {
      this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.3, this.getContext().currentTime);
    }
  }

  getVFXVolume(): number {
    return this.vfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  playShoot() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1 * this.vfxVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  playExplosion() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.2 * this.vfxVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }

  playPowerUp() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

      gainNode.gain.setValueAtTime(0.1 * this.vfxVolume, ctx.currentTime + i * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.15);

      oscillator.start(ctx.currentTime + i * 0.1);
      oscillator.stop(ctx.currentTime + i * 0.1 + 0.15);
    });
  }

  playGameOver() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const notes = [392, 349.23, 329.63, 261.63];

    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);

      gainNode.gain.setValueAtTime(0.15 * this.vfxVolume, ctx.currentTime + i * 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.25);

      oscillator.start(ctx.currentTime + i * 0.2);
      oscillator.stop(ctx.currentTime + i * 0.2 + 0.25);
    });
  }

  playDamage() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(100, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.15 * this.vfxVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  playTankExplosion() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    
    const createNoise = () => {
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      return noise;
    };

    const noise = createNoise();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(800, ctx.currentTime);
    lowpass.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5 * this.vfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
    
    noise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.8);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);
    oscGain.gain.setValueAtTime(0.3 * this.vfxVolume, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  playVictory() {
    if (!this.enabled || this.musicVolume === 0) return;
    this.stopMusic();
    const ctx = this.getContext();
    this.musicGainNode = ctx.createGain();
    this.musicGainNode.connect(ctx.destination);
    this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.35, ctx.currentTime);
    
    const melody = [
      { freq: 523.25, dur: 0.25 }, { freq: 659.25, dur: 0.25 }, { freq: 783.99, dur: 0.25 }, { freq: 1046.5, dur: 0.5 },
      { freq: 1046.5, dur: 0.25 }, { freq: 783.99, dur: 0.25 }, { freq: 659.25, dur: 0.25 }, { freq: 523.25, dur: 0.5 },
      { freq: 587.33, dur: 0.25 }, { freq: 698.46, dur: 0.25 }, { freq: 880, dur: 0.25 }, { freq: 1174.66, dur: 0.75 },
    ];
    
    let time = ctx.currentTime;
    melody.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.musicGainNode!);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, time);
      gain.gain.setValueAtTime(0.12 * this.musicVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.dur * 0.9);
      osc.start(time);
      osc.stop(time + note.dur);
      time += note.dur;
    });
  }

  playDefeat() {
    if (!this.enabled || this.musicVolume === 0) return;
    this.stopMusic();
    const ctx = this.getContext();
    this.musicGainNode = ctx.createGain();
    this.musicGainNode.connect(ctx.destination);
    this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.25, ctx.currentTime);
    
    const melody = [
      { freq: 293.66, dur: 0.5 }, { freq: 261.63, dur: 0.5 }, 
      { freq: 246.94, dur: 0.5 }, { freq: 220, dur: 0.5 },
      { freq: 196, dur: 0.7 }, { freq: 174.61, dur: 0.7 },
      { freq: 146.83, dur: 1.0 },
    ];
    
    let time = ctx.currentTime;
    melody.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.musicGainNode!);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, time);
      gain.gain.setValueAtTime(0.08 * this.musicVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.dur * 0.8);
      osc.start(time);
      osc.stop(time + note.dur);
      time += note.dur;
    });
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.musicOscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.musicOscillators = [];
    if (this.musicGainNode) {
      this.musicGainNode.disconnect();
      this.musicGainNode = null;
    }
  }

  playMusic(type: '' | 'menu' | 'victory' | 'defeat', gameMode?: 'battle' | 'survival', difficulty?: 'normal' | 'hard', mapIndex?: number) {
    if (!this.enabled || this.musicVolume === 0) return;
    
    this.stopMusic();
    this.currentMusicType = type;
    
    const ctx = this.getContext();
    this.musicGainNode = ctx.createGain();
    this.musicGainNode.connect(ctx.destination);
    this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.3, ctx.currentTime);

    const playChord = (baseNote: number, duration: number, chordType: 'major' | 'minor' | 'dim' = 'major') => {
      const ratios = {
        major: [1, 1.25, 1.5],
        minor: [1, 1.2, 1.5],
        dim: [1, 1.18, 1.41]
      };
      const [r1, r2, r3] = ratios[chordType];
      
      [r1, r2, r3].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicGainNode!);
        
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(baseNote * ratio, ctx.currentTime);
        
        const vol = 0.04 * this.musicVolume / (i + 1);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration * 0.8);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      });
    };

    const playMelody = (notes: {freq: number, dur: number}[], loop: boolean = false) => {
      let noteIndex = 0;
      
      const playNote = () => {
        if (!this.enabled || this.musicVolume === 0) return;
        const note = notes[noteIndex];
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicGainNode!);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.08 * this.musicVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.dur * 0.7);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + note.dur * 0.8);
        
        noteIndex = (noteIndex + 1) % notes.length;
        if (noteIndex === 0 && !loop) {
          if (this.musicInterval) clearInterval(this.musicInterval);
        }
      };
      
      playNote();
      if (loop || noteIndex < notes.length) {
        const totalDuration = notes.reduce((sum, n) => sum + n.dur, 0) * 1000 / notes.length;
        this.musicInterval = setInterval(playNote, totalDuration);
      }
    };

    if (type === 'victory') {
      const victoryMelody = [
        { freq: 523.25, dur: 0.3 }, { freq: 659.25, dur: 0.3 }, { freq: 783.99, dur: 0.3 }, { freq: 1046.5, dur: 0.6 },
        { freq: 1046.5, dur: 0.3 }, { freq: 783.99, dur: 0.3 }, { freq: 659.25, dur: 0.3 }, { freq: 523.25, dur: 0.6 },
        { freq: 587.33, dur: 0.3 }, { freq: 698.46, dur: 0.3 }, { freq: 880, dur: 0.3 }, { freq: 1174.66, dur: 0.9 },
      ];
      playMelody(victoryMelody);
      return;
    }

    if (type === 'defeat') {
      const defeatMelody = [
        { freq: 293.66, dur: 0.6 }, { freq: 246.94, dur: 0.6 }, 
        { freq: 220, dur: 0.6 }, { freq: 196, dur: 0.8 }, { freq: 164.81, dur: 1.2 },
      ];
      playMelody(defeatMelody, false);
      return;
    }

    const mapNames = ['open', 'maze', 'fortress', 'chaos'];
    const mapName = mapNames[mapIndex ?? 0] || 'open';
    
    if (type === 'menu' || type === '') {
      const menuLoop = [
        { freq: 392, dur: 0.5 }, { freq: 493.88, dur: 0.5 }, { freq: 523.25, dur: 0.5 }, { freq: 659.25, dur: 0.5 },
        { freq: 587.33, dur: 0.5 }, { freq: 523.25, dur: 0.5 }, { freq: 493.88, dur: 0.5 }, { freq: 440, dur: 0.5 },
      ];
      playMelody(menuLoop, true);
      return;
    }

    if (gameMode === 'survival') {
      if (difficulty === 'normal') {
        const simpleLoop = [
          { freq: 196, dur: 0.3 }, { freq: 246.94, dur: 0.3 }, { freq: 293.66, dur: 0.3 }, { freq: 246.94, dur: 0.3 },
          { freq: 196, dur: 0.3 }, { freq: 164.81, dur: 0.3 }, { freq: 196, dur: 0.3 }, { freq: 246.94, dur: 0.3 },
        ];
        playMelody(simpleLoop, true);
      } else {
        const hardLoop = [
          { freq: 220, dur: 0.2 }, { freq: 261.63, dur: 0.2 }, { freq: 329.63, dur: 0.2 }, { freq: 293.66, dur: 0.2 },
          { freq: 261.63, dur: 0.2 }, { freq: 220, dur: 0.2 }, { freq: 196, dur: 0.2 }, { freq: 220, dur: 0.2 },
        ];
        playMelody(hardLoop, true);
      }
      return;
    }

    if (mapName === 'maze') {
      if (difficulty === 'normal') {
        const mazeLoop = [
          { freq: 220, dur: 0.4 }, { freq: 261.63, dur: 0.4 }, { freq: 293.66, dur: 0.4 }, { freq: 329.63, dur: 0.4 },
          { freq: 293.66, dur: 0.4 }, { freq: 261.63, dur: 0.4 }, { freq: 220, dur: 0.4 }, { freq: 196, dur: 0.4 },
        ];
        playMelody(mazeLoop, true);
      } else {
        const mazeHardLoop = [
          { freq: 261.63, dur: 0.25 }, { freq: 311.13, dur: 0.25 }, { freq: 349.23, dur: 0.25 }, { freq: 392, dur: 0.25 },
          { freq: 349.23, dur: 0.25 }, { freq: 311.13, dur: 0.25 }, { freq: 261.63, dur: 0.25 }, { freq: 220, dur: 0.25 },
        ];
        playMelody(mazeHardLoop, true);
      }
      return;
    }

    if (mapName === 'fortress') {
      if (difficulty === 'normal') {
        const fortressLoop = [
          { freq: 261.63, dur: 0.5 }, { freq: 329.63, dur: 0.5 }, { freq: 392, dur: 0.5 }, { freq: 523.25, dur: 0.5 },
          { freq: 440, dur: 0.5 }, { freq: 392, dur: 0.5 }, { freq: 329.63, dur: 0.5 }, { freq: 261.63, dur: 0.5 },
        ];
        playMelody(fortressLoop, true);
      } else {
        const fortressHardLoop = [
          { freq: 293.66, dur: 0.3 }, { freq: 370, dur: 0.3 }, { freq: 440, dur: 0.3 }, { freq: 587.33, dur: 0.3 },
          { freq: 523.25, dur: 0.3 }, { freq: 440, dur: 0.3 }, { freq: 370, dur: 0.3 }, { freq: 293.66, dur: 0.3 },
        ];
        playMelody(fortressHardLoop, true);
      }
      return;
    }

    if (mapName === 'chaos') {
      if (difficulty === 'normal') {
        const chaosLoop = [
          { freq: 130.81, dur: 0.6 }, { freq: 155.56, dur: 0.6 }, { freq: 164.81, dur: 0.6 }, { freq: 196, dur: 0.6 },
        ];
        playMelody(chaosLoop, true);
      } else {
        const chaosHardLoop = [
          { freq: 146.83, dur: 0.4 }, { freq: 174.61, dur: 0.4 }, { freq: 196, dur: 0.4 }, { freq: 220, dur: 0.4 },
        ];
        playMelody(chaosHardLoop, true);
      }
      return;
    }

    if (difficulty === 'normal') {
      const battleLoop = [
        { freq: 220, dur: 0.35 }, { freq: 261.63, dur: 0.35 }, { freq: 293.66, dur: 0.35 }, { freq: 349.23, dur: 0.35 },
        { freq: 293.66, dur: 0.35 }, { freq: 261.63, dur: 0.35 }, { freq: 220, dur: 0.35 }, { freq: 196, dur: 0.35 },
      ];
      playMelody(battleLoop, true);
    } else {
      const battleHardLoop = [
        { freq: 261.63, dur: 0.2 }, { freq: 311.13, dur: 0.2 }, { freq: 392, dur: 0.2 }, { freq: 440, dur: 0.2 },
        { freq: 392, dur: 0.2 }, { freq: 311.13, dur: 0.2 }, { freq: 261.63, dur: 0.2 }, { freq: 220, dur: 0.2 },
      ];
      playMelody(battleHardLoop, true);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }
}

export const soundManager = new SoundManager();