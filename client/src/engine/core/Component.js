/**
 * Mini Game Engine - Component Base
 * 组件基类，所有组件的父类
 */

import { Object } from './Object.js';
import { Time } from './Time.js';

export class Component extends Object {
    static _componentType = 'Component';

    constructor() {
        super();
        this._gameObject = null;
        this._enabled = true;
        this._started = false;
        this._awakeCalled = false;
    }

    static get componentType() { return this._componentType; }

    get gameObject() { return this._gameObject; }
    
    get transform() {
        return this._gameObject ? this._gameObject.transform : null;
    }

    get enabled() { return this._enabled; }
    set enabled(value) {
        if (this._enabled !== value) {
            this._enabled = value;
            if (value) {
                this.onEnable();
            } else {
                this.onDisable();
            }
        }
    }

    get isActiveAndEnabled() {
        return this._enabled && this._gameObject && this._gameObject.active;
    }

    _setGameObject(gameObject) {
        if (this._gameObject) {
            console.warn('Component is already attached to a GameObject');
            return;
        }
        this._gameObject = gameObject;
    }

    _callAwake() {
        if (!this._awakeCalled) {
            this._awakeCalled = true;
            this.awake();
        }
    }

    _callStart() {
        if (!this._started) {
            this._started = true;
            this.start();
        }
    }

    _callUpdate() {
        if (this.isActiveAndEnabled) {
            this.update(Time.deltaTime);
        }
    }

    _callLateUpdate() {
        if (this.isActiveAndEnabled) {
            this.lateUpdate(Time.deltaTime);
        }
    }

    _callFixedUpdate() {
        if (this.isActiveAndEnabled) {
            this.fixedUpdate();
        }
    }

    _callOnDestroy() {
        this.onDestroy();
    }

    awake() {
    }

    start() {
    }

    update(deltaTime) {
    }

    lateUpdate(deltaTime) {
    }

    fixedUpdate() {
    }

    onEnable() {
    }

    onDisable() {
    }

    onDestroy() {
        super.onDestroy();
    }

    getComponent(type) {
        if (!this._gameObject) return null;
        return this._gameObject.getComponent(type);
    }

    getComponentInChildren(type, includeInactive = false) {
        if (!this._gameObject) return null;
        return this._gameObject.getComponentInChildren(type, includeInactive);
    }

    getComponentInParent(type) {
        if (!this._gameObject) return null;
        return this._gameObject.getComponentInParent(type);
    }

    getComponents(type) {
        if (!this._gameObject) return [];
        return this._gameObject.getComponents(type);
    }

    getComponentsInChildren(type, includeInactive = false) {
        if (!this._gameObject) return [];
        return this._gameObject.getComponentsInChildren(type, includeInactive);
    }

    getComponentsInParent(type, includeInactive = false) {
        if (!this._gameObject) return [];
        return this._gameObject.getComponentsInParent(type, includeInactive);
    }

    compareTag(tag) {
        if (!this._gameObject) return false;
        return this._gameObject.tag === tag;
    }

    sendMessage(methodName, value, options) {
        if (!this._gameObject) return;
        this._gameObject.sendMessage(methodName, value, options);
    }

    broadcastMessage(methodName, value, options) {
        if (!this._gameObject) return;
        this._gameObject.broadcastMessage(methodName, value, options);
    }

    sendMessageUpwards(methodName, value, options) {
        if (!this._gameObject) return;
        this._gameObject.sendMessageUpwards(methodName, value, options);
    }
}

export class MonoBehaviour extends Component {
    static _componentType = 'MonoBehaviour';

    constructor() {
        super();
        this._coroutines = [];
    }

    startCoroutine(generator) {
        const coroutine = {
            generator: generator,
            isRunning: true,
            waitFor: null,
            waitTime: 0
        };
        
        this._coroutines.push(coroutine);
        this._processCoroutine(coroutine);
        
        return coroutine;
    }

    stopCoroutine(coroutine) {
        const index = this._coroutines.indexOf(coroutine);
        if (index > -1) {
            coroutine.isRunning = false;
            this._coroutines.splice(index, 1);
        }
    }

    stopAllCoroutines() {
        for (const coroutine of this._coroutines) {
            coroutine.isRunning = false;
        }
        this._coroutines = [];
    }

    _processCoroutine(coroutine) {
        if (!coroutine.isRunning) return;
        
        try {
            const result = coroutine.generator.next();
            if (result.done) {
                this.stopCoroutine(coroutine);
                return;
            }
            
            const value = result.value;
            if (value instanceof WaitForSeconds) {
                coroutine.waitFor = 'seconds';
                coroutine.waitTime = value.seconds;
            } else if (value instanceof WaitForEndOfFrame) {
                coroutine.waitFor = 'endOfFrame';
            } else if (value instanceof WaitForFixedUpdate) {
                coroutine.waitFor = 'fixedUpdate';
            } else if (value && typeof value.then === 'function') {
                value.then(() => this._processCoroutine(coroutine));
                return;
            } else {
                setTimeout(() => this._processCoroutine(coroutine), 0);
            }
        } catch (error) {
            console.error('Coroutine error:', error);
            this.stopCoroutine(coroutine);
        }
    }

    update(deltaTime) {
        for (let i = this._coroutines.length - 1; i >= 0; i--) {
            const coroutine = this._coroutines[i];
            if (!coroutine.isRunning) continue;
            
            if (coroutine.waitFor === 'seconds') {
                coroutine.waitTime -= deltaTime;
                if (coroutine.waitTime <= 0) {
                    coroutine.waitFor = null;
                    this._processCoroutine(coroutine);
                }
            }
        }
    }
}

export class WaitForSeconds {
    constructor(seconds) {
        this.seconds = seconds;
    }
}

export class WaitForEndOfFrame {
    constructor() {}
}

export class WaitForFixedUpdate {
    constructor() {}
}

export default { Component, MonoBehaviour, WaitForSeconds, WaitForEndOfFrame, WaitForFixedUpdate };
