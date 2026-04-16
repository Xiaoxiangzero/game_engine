/**
 * Mini Game Engine - Audio Manager
 * 音频管理器，使用Web Audio API
 */

import { Object } from '../core/Object.js';
import { Events, EventTypes } from '../events/EventManager.js';

export class AudioClip {
    constructor(name = 'Untitled', options = {}) {
        this._name = name;
        this._audioBuffer = null;
        this._url = options.url || null;
        this._isLoaded = false;
        this._isLoading = false;
        this._loadError = null;
        this._length = 0;
        this._channels = 0;
        this._sampleRate = 0;
        this._preload = options.preload !== false;
        
        if (this._url && this._preload) {
            this.load();
        }
    }

    get name() { return this._name; }
    get audioBuffer() { return this._audioBuffer; }
    get isLoaded() { return this._isLoaded; }
    get isLoading() { return this._isLoading; }
    get loadError() { return this._loadError; }
    get length() { return this._length; }
    get channels() { return this._channels; }
    get sampleRate() { return this._sampleRate; }

    async load() {
        if (this._isLoaded) return true;
        if (this._isLoading) {
            return new Promise((resolve, reject) => {
                const checkLoaded = () => {
                    if (this._isLoaded) resolve(true);
                    else if (this._loadError) reject(this._loadError);
                    else setTimeout(checkLoaded, 50);
                };
                checkLoaded();
            });
        }

        this._isLoading = true;

        try {
            const audioContext = AudioManager.audioContext;
            const response = await fetch(this._url);
            const arrayBuffer = await response.arrayBuffer();
            this._audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            this._length = this._audioBuffer.duration;
            this._channels = this._audioBuffer.numberOfChannels;
            this._sampleRate = this._audioBuffer.sampleRate;
            
            this._isLoaded = true;
            this._isLoading = false;
            
            Events.broadcast({
                type: EventTypes.RESOURCE_LOAD_COMPLETE,
                data: { resource: this, type: 'AudioClip' }
            });
            
            return true;
        } catch (error) {
            this._loadError = error;
            this._isLoading = false;
            
            Events.broadcast({
                type: EventTypes.RESOURCE_LOAD_ERROR,
                data: { resource: this, error: error }
            });
            
            console.error(`Failed to load AudioClip ${this._name}:`, error);
            return false;
        }
    }

    static async fromArrayBuffer(name, arrayBuffer) {
        const clip = new AudioClip(name);
        try {
            const audioContext = AudioManager.audioContext;
            clip._audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            clip._length = clip._audioBuffer.duration;
            clip._channels = clip._audioBuffer.numberOfChannels;
            clip._sampleRate = clip._audioBuffer.sampleRate;
            clip._isLoaded = true;
            return clip;
        } catch (error) {
            clip._loadError = error;
            console.error(`Failed to create AudioClip from ArrayBuffer:`, error);
            return clip;
        }
    }
}

export class AudioSource extends Object {
    static _componentType = 'AudioSource';

    constructor(gameObject = null) {
        super();
        this._gameObject = gameObject;
        this._clip = null;
        this._audioContext = AudioManager.audioContext;
        this._gainNode = null;
        this._pannerNode = null;
        this._bufferSource = null;
        
        this._volume = 1.0;
        this._pitch = 1.0;
        this._loop = false;
        this._mute = false;
        this._spatialBlend = 1.0;
        this._minDistance = 1;
        this._maxDistance = 100;
        this._rolloffMode = 'logarithmic';
        this._dopplerLevel = 1.0;
        this._spread = 0;
        
        this._isPlaying = false;
        this._isPaused = false;
        this._startTime = 0;
        this._pauseTime = 0;
        this._playbackRate = 1.0;
        
        this._onAudioEnd = null;
        this._initAudioNodes();
    }

    _initAudioNodes() {
        this._gainNode = this._audioContext.createGain();
        this._gainNode.gain.value = this._volume;
        
        this._pannerNode = this._audioContext.createPanner();
        this._pannerNode.panningModel = 'HRTF';
        this._pannerNode.distanceModel = this._rolloffMode;
        this._pannerNode.refDistance = this._minDistance;
        this._pannerNode.maxDistance = this._maxDistance;
        this._pannerNode.rolloffFactor = 1.0;
        this._pannerNode.coneInnerAngle = 360;
        this._pannerNode.coneOuterAngle = 360;
        this._pannerNode.coneOuterGain = 0;
        
        this._gainNode.connect(this._pannerNode);
        this._pannerNode.connect(this._audioContext.destination);
    }

    get clip() { return this._clip; }
    set clip(value) {
        this._clip = value;
        if (this._isPlaying) {
            this.stop();
        }
    }

    get volume() { return this._volume; }
    set volume(value) {
        this._volume = Math.max(0, Math.min(1, value));
        if (this._gainNode) {
            this._gainNode.gain.value = this._mute ? 0 : this._volume;
        }
    }

    get pitch() { return this._pitch; }
    set pitch(value) {
        this._pitch = Math.max(0.01, value);
        if (this._bufferSource && this._isPlaying) {
            this._bufferSource.playbackRate.value = this._pitch * this._playbackRate;
        }
    }

    get loop() { return this._loop; }
    set loop(value) {
        this._loop = value;
        if (this._bufferSource) {
            this._bufferSource.loop = value;
        }
    }

    get mute() { return this._mute; }
    set mute(value) {
        this._mute = value;
        if (this._gainNode) {
            this._gainNode.gain.value = this._mute ? 0 : this._volume;
        }
    }

    get spatialBlend() { return this._spatialBlend; }
    set spatialBlend(value) {
        this._spatialBlend = Math.max(0, Math.min(1, value));
    }

    get minDistance() { return this._minDistance; }
    set minDistance(value) {
        this._minDistance = Math.max(0, value);
        if (this._pannerNode) {
            this._pannerNode.refDistance = this._minDistance;
        }
    }

    get maxDistance() { return this._maxDistance; }
    set maxDistance(value) {
        this._maxDistance = Math.max(0, value);
        if (this._pannerNode) {
            this._pannerNode.maxDistance = this._maxDistance;
        }
    }

    get isPlaying() { return this._isPlaying; }
    get isPaused() { return this._isPaused; }

    get time() {
        if (!this._isPlaying) return this._pauseTime;
        const currentTime = this._audioContext.currentTime;
        return (currentTime - this._startTime) * this._playbackRate;
    }

    set time(value) {
        if (this._clip && this._clip.isLoaded) {
            this._pauseTime = Math.max(0, Math.min(this._clip.length, value));
            if (this._isPlaying) {
                this.stop();
                this.play(this._pauseTime);
            }
        }
    }

    play(delay = 0) {
        if (!this._clip || !this._clip.isLoaded) {
            console.warn('AudioClip not loaded:', this._clip?.name);
            return;
        }

        if (this._isPlaying) {
            this.stop();
        }

        this._bufferSource = this._audioContext.createBufferSource();
        this._bufferSource.buffer = this._clip.audioBuffer;
        this._bufferSource.loop = this._loop;
        this._bufferSource.playbackRate.value = this._pitch * this._playbackRate;
        
        this._bufferSource.connect(this._gainNode);
        
        this._onAudioEnd = () => {
            if (!this._loop) {
                this._isPlaying = false;
                this._pauseTime = 0;
                Events.broadcast({
                    type: EventTypes.AUDIO_COMPLETE,
                    data: { source: this, clip: this._clip }
                });
            }
        };
        
        this._bufferSource.onended = this._onAudioEnd;
        
        this._startTime = this._audioContext.currentTime + delay - (this._pauseTime / this._playbackRate);
        this._isPlaying = true;
        this._isPaused = false;
        
        this._bufferSource.start(this._audioContext.currentTime + delay, this._pauseTime);
        
        Events.broadcast({
            type: EventTypes.AUDIO_PLAY,
            data: { source: this, clip: this._clip }
        });
    }

    playOneShot(clip, volumeScale = 1.0) {
        if (!clip || !clip.isLoaded) return;
        
        const source = this._audioContext.createBufferSource();
        const gain = this._audioContext.createGain();
        
        source.buffer = clip.audioBuffer;
        gain.gain.value = this._volume * volumeScale;
        
        source.connect(gain);
        gain.connect(this._audioContext.destination);
        
        source.start();
        
        Events.broadcast({
            type: EventTypes.AUDIO_PLAY,
            data: { source: this, clip: clip }
        });
    }

    pause() {
        if (!this._isPlaying || this._isPaused) return;
        
        this._pauseTime = this.time;
        this._isPaused = true;
        this._isPlaying = false;
        
        if (this._bufferSource) {
            this._bufferSource.onended = null;
            this._bufferSource.stop();
            this._bufferSource = null;
        }
        
        Events.broadcast({
            type: EventTypes.AUDIO_PAUSE,
            data: { source: this }
        });
    }

    stop() {
        if (!this._isPlaying && !this._isPaused) return;
        
        this._pauseTime = 0;
        this._isPlaying = false;
        this._isPaused = false;
        
        if (this._bufferSource) {
            this._bufferSource.onended = null;
            this._bufferSource.stop();
            this._bufferSource = null;
        }
        
        Events.broadcast({
            type: EventTypes.AUDIO_STOP,
            data: { source: this }
        });
    }

    setSpatialPosition(x, y, z) {
        if (this._pannerNode) {
            this._pannerNode.positionX.value = x;
            this._pannerNode.positionY.value = y;
            this._pannerNode.positionZ.value = z;
        }
    }

    setVelocity(x, y, z) {
        if (this._pannerNode) {
            this._pannerNode.velocityX.value = x;
            this._pannerNode.velocityY.value = y;
            this._pannerNode.velocityZ.value = z;
        }
    }

    update() {
        if (this._spatialBlend > 0 && this._gameObject) {
            const transform = this._gameObject.transform;
            if (transform) {
                this.setSpatialPosition(
                    transform.position.x,
                    transform.position.y,
                    transform.position.z
                );
            }
        }
    }

    destroy() {
        this.stop();
        if (this._gainNode) {
            this._gainNode.disconnect();
        }
        if (this._pannerNode) {
            this._pannerNode.disconnect();
        }
    }
}

export class AudioListener extends Object {
    static _componentType = 'AudioListener';
    static _instance = null;

    constructor(gameObject = null) {
        super();
        if (AudioListener._instance) {
            console.warn('AudioListener already exists. Only one AudioListener is supported.');
        }
        AudioListener._instance = this;
        
        this._gameObject = gameObject;
        this._audioContext = AudioManager.audioContext;
        this._listener = this._audioContext.listener;
    }

    static get instance() {
        if (!AudioListener._instance) {
            AudioListener._instance = new AudioListener();
        }
        return AudioListener._instance;
    }

    setPosition(x, y, z) {
        if (this._listener.positionX) {
            this._listener.positionX.value = x;
            this._listener.positionY.value = y;
            this._listener.positionZ.value = z;
        } else if (this._listener.setPosition) {
            this._listener.setPosition(x, y, z);
        }
    }

    setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ) {
        if (this._listener.forwardX) {
            this._listener.forwardX.value = forwardX;
            this._listener.forwardY.value = forwardY;
            this._listener.forwardZ.value = forwardZ;
            this._listener.upX.value = upX;
            this._listener.upY.value = upY;
            this._listener.upZ.value = upZ;
        } else if (this._listener.setOrientation) {
            this._listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
        }
    }

    update() {
        if (this._gameObject) {
            const transform = this._gameObject.transform;
            if (transform) {
                this.setPosition(
                    transform.position.x,
                    transform.position.y,
                    transform.position.z
                );
            }
        }
    }
}

export class AudioManager extends Object {
    static _instance = null;
    static _audioContext = null;

    static get instance() {
        if (!AudioManager._instance) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    }

    static get audioContext() {
        if (!AudioManager._audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            AudioManager._audioContext = new AudioContextClass();
        }
        return AudioManager._audioContext;
    }

    constructor() {
        super();
        this._sources = new Set();
        this._masterVolume = 1.0;
        this._isMuted = false;
        
        this._musicVolume = 1.0;
        this._sfxVolume = 1.0;
        this._voiceVolume = 1.0;
        
        this._musicSources = new Set();
        this._sfxSources = new Set();
        this._voiceSources = new Set();
    }

    get masterVolume() { return this._masterVolume; }
    set masterVolume(value) {
        this._masterVolume = Math.max(0, Math.min(1, value));
        this._updateAllVolumes();
    }

    get isMuted() { return this._isMuted; }
    set isMuted(value) {
        this._isMuted = value;
        this._updateAllVolumes();
    }

    get musicVolume() { return this._musicVolume; }
    set musicVolume(value) {
        this._musicVolume = Math.max(0, Math.min(1, value));
        this._updateCategoryVolumes('music');
    }

    get sfxVolume() { return this._sfxVolume; }
    set sfxVolume(value) {
        this._sfxVolume = Math.max(0, Math.min(1, value));
        this._updateCategoryVolumes('sfx');
    }

    get voiceVolume() { return this._voiceVolume; }
    set voiceVolume(value) {
        this._voiceVolume = Math.max(0, Math.min(1, value));
        this._updateCategoryVolumes('voice');
    }

    _updateAllVolumes() {
        const masterGain = this._isMuted ? 0 : this._masterVolume;
        for (const source of this._sources) {
            if (source._gainNode) {
                const categoryGain = this._getCategoryGain(source);
                source._gainNode.gain.value = source.volume * masterGain * categoryGain;
            }
        }
    }

    _updateCategoryVolumes(category) {
        const masterGain = this._isMuted ? 0 : this._masterVolume;
        let sources;
        let categoryGain;
        
        switch (category) {
            case 'music':
                sources = this._musicSources;
                categoryGain = this._musicVolume;
                break;
            case 'sfx':
                sources = this._sfxSources;
                categoryGain = this._sfxVolume;
                break;
            case 'voice':
                sources = this._voiceSources;
                categoryGain = this._voiceVolume;
                break;
            default:
                return;
        }
        
        for (const source of sources) {
            if (source._gainNode) {
                source._gainNode.gain.value = source.volume * masterGain * categoryGain;
            }
        }
    }

    _getCategoryGain(source) {
        if (this._musicSources.has(source)) return this._musicVolume;
        if (this._sfxSources.has(source)) return this._sfxVolume;
        if (this._voiceSources.has(source)) return this._voiceVolume;
        return 1.0;
    }

    registerSource(source, category = 'sfx') {
        this._sources.add(source);
        
        switch (category) {
            case 'music':
                this._musicSources.add(source);
                break;
            case 'sfx':
                this._sfxSources.add(source);
                break;
            case 'voice':
                this._voiceSources.add(source);
                break;
        }
    }

    unregisterSource(source) {
        this._sources.delete(source);
        this._musicSources.delete(source);
        this._sfxSources.delete(source);
        this._voiceSources.delete(source);
    }

    playOneShot(clip, volume = 1.0, category = 'sfx') {
        if (!clip || !clip.isLoaded) return;
        
        const source = new AudioSource();
        source.volume = volume;
        source.clip = clip;
        this.registerSource(source, category);
        
        source.play();
        
        setTimeout(() => {
            source.destroy();
            this.unregisterSource(source);
        }, (clip.length + 0.1) * 1000);
    }

    pauseAll() {
        for (const source of this._sources) {
            source.pause();
        }
    }

    resumeAll() {
        for (const source of this._sources) {
            if (source.isPaused) {
                source.play();
            }
        }
    }

    stopAll() {
        for (const source of this._sources) {
            source.stop();
        }
    }

    stopCategory(category) {
        let sources;
        switch (category) {
            case 'music':
                sources = this._musicSources;
                break;
            case 'sfx':
                sources = this._sfxSources;
                break;
            case 'voice':
                sources = this._voiceSources;
                break;
            default:
                return;
        }
        
        for (const source of sources) {
            source.stop();
        }
    }

    static resumeAudioContext() {
        if (AudioManager._audioContext && AudioManager._audioContext.state === 'suspended') {
            AudioManager._audioContext.resume();
        }
    }
}

document.addEventListener('click', AudioManager.resumeAudioContext, { once: true });
document.addEventListener('keydown', AudioManager.resumeAudioContext, { once: true });
document.addEventListener('touchstart', AudioManager.resumeAudioContext, { once: true });

export default { AudioClip, AudioSource, AudioListener, AudioManager };
