/**
 * Mini Game Engine - Time Manager
 * 时间管理系统，提供全局时间相关功能
 */

export class Time {
    static _timeScale = 1.0;
    static _fixedDeltaTime = 0.02;
    static _maximumDeltaTime = 0.1;
    
    static _deltaTime = 0;
    static _unscaledDeltaTime = 0;
    static _time = 0;
    static _unscaledTime = 0;
    static _frameCount = 0;
    static _realTimeSinceStartup = 0;
    
    static _lastFrameTime = performance.now();
    static _startupTime = performance.now();
    
    static _frameTimeHistory = [];
    static _maxFrameHistory = 60;
    
    static get deltaTime() {
        return this._deltaTime * this._timeScale;
    }
    
    static get unscaledDeltaTime() {
        return this._unscaledDeltaTime;
    }
    
    static get fixedDeltaTime() {
        return this._fixedDeltaTime * this._timeScale;
    }
    
    static get time() {
        return this._time;
    }
    
    static get unscaledTime() {
        return this._unscaledTime;
    }
    
    static get realTimeSinceStartup() {
        return this._realTimeSinceStartup;
    }
    
    static get frameCount() {
        return this._frameCount;
    }
    
    static get timeScale() {
        return this._timeScale;
    }
    
    static set timeScale(value) {
        this._timeScale = Math.max(0, value);
    }
    
    static get maximumDeltaTime() {
        return this._maximumDeltaTime;
    }
    
    static set maximumDeltaTime(value) {
        this._maximumDeltaTime = Math.max(0.001, value);
    }
    
    static get fps() {
        if (this._frameTimeHistory.length === 0) return 0;
        const averageTime = this._frameTimeHistory.reduce((a, b) => a + b, 0) / this._frameTimeHistory.length;
        return averageTime > 0 ? 1000 / averageTime : 0;
    }
    
    static get smoothDeltaTime() {
        if (this._frameTimeHistory.length === 0) return this._deltaTime;
        return (this._frameTimeHistory.reduce((a, b) => a + b, 0) / this._frameTimeHistory.length) / 1000;
    }
    
    static update(currentTime) {
        const now = currentTime || performance.now();
        this._unscaledDeltaTime = (now - this._lastFrameTime) / 1000;
        this._deltaTime = Math.min(this._unscaledDeltaTime, this._maximumDeltaTime);
        
        this._unscaledTime += this._unscaledDeltaTime;
        this._time += this._deltaTime * this._timeScale;
        this._realTimeSinceStartup = (now - this._startupTime) / 1000;
        
        this._frameTimeHistory.push(now - this._lastFrameTime);
        if (this._frameTimeHistory.length > this._maxFrameHistory) {
            this._frameTimeHistory.shift();
        }
        
        this._lastFrameTime = now;
        this._frameCount++;
        
        return this._deltaTime;
    }
    
    static reset() {
        this._time = 0;
        this._unscaledTime = 0;
        this._frameCount = 0;
        this._frameTimeHistory = [];
        this._lastFrameTime = performance.now();
        this._startupTime = performance.now();
    }
    
    static captureFrameTime(timeMs) {
        this._frameTimeHistory.push(timeMs);
        if (this._frameTimeHistory.length > this._maxFrameHistory) {
            this._frameTimeHistory.shift();
        }
    }
}

export default Time;
