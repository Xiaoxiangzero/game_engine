export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.sounds = new Map();
    this.musicTracks = new Map();
    this.currentMusic = null;
    this.isMuted = false;
    this.masterVolume = 1.0;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.8;
    
    this.init();
  }

  init() {
    console.log('初始化 AudioManager...');
    
    document.addEventListener('click', () => {
      if (!this.audioContext) {
        this.createAudioContext();
      } else if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }, { once: true });
    
    console.log('AudioManager 初始化完成');
  }

  createAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);
      
      console.log('AudioContext 创建成功');
    } catch (error) {
      console.error('AudioContext 创建失败:', error);
    }
  }

  ensureContext() {
    if (!this.audioContext) {
      this.createAudioContext();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playTone(frequency = 440, duration = 0.1, type = 'sine', volume = 0.3) {
    this.ensureContext();
    
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    const effectiveVolume = volume * this.sfxVolume * this.masterVolume;
    gainNode.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode };
  }

  playClick() {
    return this.playTone(800, 0.05, 'sine', 0.2);
  }

  playSuccess() {
    this.playTone(523.25, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.3), 100);
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.3), 200);
  }

  playError() {
    this.playTone(200, 0.15, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(150, 0.15, 'sawtooth', 0.2), 150);
  }

  playPickup() {
    return this.playTone(600, 0.08, 'sine', 0.25);
  }

  playBounce() {
    return this.playTone(300, 0.1, 'triangle', 0.2);
  }

  startBackgroundMusic(baseFreq = 110, interval = 1.5) {
    this.ensureContext();
    
    if (!this.audioContext) return;
    
    this.stopBackgroundMusic();
    
    const playNote = () => {
      if (!this.audioContext) return;
      
      const frequencies = [
        baseFreq,
        baseFreq * 1.25,
        baseFreq * 1.5,
        baseFreq * 2.0,
        baseFreq * 1.5,
        baseFreq * 1.25,
        baseFreq,
        baseFreq * 0.75
      ];
      
      const time = this.audioContext.currentTime;
      
      frequencies.forEach((freq, i) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time + i * interval);
        
        const effectiveVolume = 0.05 * this.musicVolume * this.masterVolume;
        gain.gain.setValueAtTime(effectiveVolume, time + i * interval);
        gain.gain.exponentialRampToValueAtTime(0.001, time + i * interval + 0.8);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(time + i * interval);
        osc.stop(time + i * interval + 1.0);
      });
    };
    
    playNote();
    this.currentMusic = setInterval(playNote, 12000);
  }

  stopBackgroundMusic() {
    if (this.currentMusic) {
      clearInterval(this.currentMusic);
      this.currentMusic = null;
    }
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
    }
    return this.isMuted;
  }

  isMuted() {
    return this.isMuted;
  }

  generateSound(name, options = {}) {
    this.sounds.set(name, {
      frequency: options.frequency || 440,
      duration: options.duration || 0.1,
      type: options.type || 'sine',
      volume: options.volume || 0.3
    });
  }

  playSound(name) {
    const sound = this.sounds.get(name);
    if (sound) {
      return this.playTone(
        sound.frequency,
        sound.duration,
        sound.type,
        sound.volume
      );
    }
    return null;
  }
}
