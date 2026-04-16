/**
 * Mini Game Engine - Events System
 * 事件系统，提供事件广播和订阅功能
 */

import { Object } from '../core/Object.js';

export class GameEvent {
    constructor(type, data = {}, sender = null) {
        this._type = type;
        this._data = { ...data };
        this._sender = sender;
        this._timestamp = performance.now();
        this._isCancelled = false;
        this._isPropagationStopped = false;
    }

    get type() { return this._type; }
    get data() { return this._data; }
    get sender() { return this._sender; }
    get timestamp() { return this._timestamp; }
    get isCancelled() { return this._isCancelled; }
    get isPropagationStopped() { return this._isPropagationStopped; }

    cancel() {
        this._isCancelled = true;
    }

    stopPropagation() {
        this._isPropagationStopped = true;
    }

    clone() {
        const clone = new GameEvent(this._type, this._data, this._sender);
        clone._timestamp = this._timestamp;
        return clone;
    }
}

export class EventListener {
    constructor(callback, priority = 0, once = false, context = null) {
        this._callback = callback;
        this._priority = priority;
        this._once = once;
        this._context = context;
        this._isActive = true;
    }

    get callback() { return this._callback; }
    get priority() { return this._priority; }
    get once() { return this._once; }
    get context() { return this._context; }
    get isActive() { return this._isActive; }

    invoke(event) {
        if (!this._isActive) return;
        try {
            if (this._context) {
                this._callback.call(this._context, event);
            } else {
                this._callback(event);
            }
        } catch (error) {
            console.error(`Error in event listener for ${event.type}:`, error);
        }
        if (this._once) {
            this._isActive = false;
        }
    }

    disable() {
        this._isActive = false;
    }
}

export class EventManager {
    static _instance = null;

    static get instance() {
        if (!this._instance) {
            this._instance = new EventManager();
        }
        return this._instance;
    }

    constructor() {
        this._listeners = new Map();
        this._eventQueue = [];
        this._isProcessing = false;
        this._globalListeners = [];
    }

    subscribe(eventType, callback, priority = 0, context = null) {
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, []);
        }
        
        const listener = new EventListener(callback, priority, false, context);
        const listeners = this._listeners.get(eventType);
        listeners.push(listener);
        listeners.sort((a, b) => b.priority - a.priority);
        
        return listener;
    }

    subscribeOnce(eventType, callback, priority = 0, context = null) {
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, []);
        }
        
        const listener = new EventListener(callback, priority, true, context);
        const listeners = this._listeners.get(eventType);
        listeners.push(listener);
        listeners.sort((a, b) => b.priority - a.priority);
        
        return listener;
    }

    subscribeToAll(callback, priority = 0, context = null) {
        const listener = new EventListener(callback, priority, false, context);
        this._globalListeners.push(listener);
        this._globalListeners.sort((a, b) => b.priority - a.priority);
        return listener;
    }

    unsubscribe(eventType, listener) {
        if (!this._listeners.has(eventType)) return;
        
        const listeners = this._listeners.get(eventType);
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    unsubscribeByCallback(eventType, callback) {
        if (!this._listeners.has(eventType)) return;
        
        const listeners = this._listeners.get(eventType);
        for (let i = listeners.length - 1; i >= 0; i--) {
            if (listeners[i].callback === callback) {
                listeners.splice(i, 1);
            }
        }
    }

    broadcast(event) {
        const eventObj = event instanceof GameEvent ? event : new GameEvent(event.type || event, event.data || event);
        
        for (const listener of this._globalListeners) {
            if (listener.isActive) {
                listener.invoke(eventObj);
            }
        }
        
        if (eventObj.isPropagationStopped) return;
        
        const listeners = this._listeners.get(eventObj.type);
        if (!listeners || listeners.length === 0) return;
        
        for (const listener of listeners) {
            if (listener.isActive && !eventObj.isCancelled) {
                listener.invoke(eventObj);
            }
        }
        
        for (let i = listeners.length - 1; i >= 0; i--) {
            if (!listeners[i].isActive) {
                listeners.splice(i, 1);
            }
        }
    }

    broadcastAsync(event, delay = 0) {
        setTimeout(() => {
            this.broadcast(event);
        }, delay);
    }

    queueEvent(event) {
        this._eventQueue.push(event);
    }

    processQueue() {
        if (this._isProcessing) return;
        this._isProcessing = true;
        
        while (this._eventQueue.length > 0) {
            const event = this._eventQueue.shift();
            this.broadcast(event);
        }
        
        this._isProcessing = false;
    }

    clear(eventType = null) {
        if (eventType) {
            this._listeners.delete(eventType);
        } else {
            this._listeners.clear();
            this._globalListeners = [];
        }
    }

    hasListeners(eventType) {
        const listeners = this._listeners.get(eventType);
        return listeners && listeners.length > 0;
    }

    getListenerCount(eventType) {
        const listeners = this._listeners.get(eventType);
        return listeners ? listeners.length : 0;
    }
}

export const Events = {
    subscribe: (eventType, callback, priority, context) => 
        EventManager.instance.subscribe(eventType, callback, priority, context),
    subscribeOnce: (eventType, callback, priority, context) => 
        EventManager.instance.subscribeOnce(eventType, callback, priority, context),
    unsubscribe: (eventType, listener) => 
        EventManager.instance.unsubscribe(eventType, listener),
    broadcast: (event) => 
        EventManager.instance.broadcast(event),
    broadcastAsync: (event, delay) => 
        EventManager.instance.broadcastAsync(event, delay),
    queue: (event) => 
        EventManager.instance.queueEvent(event),
    processQueue: () => 
        EventManager.instance.processQueue(),
    clear: (eventType) => 
        EventManager.instance.clear(eventType)
};

export class EventTypes {
    static get GAME_START() { return 'game:start'; }
    static get GAME_STOP() { return 'game:stop'; }
    static get GAME_PAUSE() { return 'game:pause'; }
    static get GAME_RESUME() { return 'game:resume'; }
    
    static get SCENE_LOAD_START() { return 'scene:load:start'; }
    static get SCENE_LOAD_PROGRESS() { return 'scene:load:progress'; }
    static get SCENE_LOAD_COMPLETE() { return 'scene:load:complete'; }
    static get SCENE_UNLOAD() { return 'scene:unload'; }
    
    static get OBJECT_SPAWN() { return 'object:spawn'; }
    static get OBJECT_DESTROY() { return 'object:destroy'; }
    static get OBJECT_ENABLE() { return 'object:enable'; }
    static get OBJECT_DISABLE() { return 'object:disable'; }
    
    static get COMPONENT_ADD() { return 'component:add'; }
    static get COMPONENT_REMOVE() { return 'component:remove'; }
    static get COMPONENT_ENABLE() { return 'component:enable'; }
    static get COMPONENT_DISABLE() { return 'component:disable'; }
    
    static get COLLISION_ENTER() { return 'collision:enter'; }
    static get COLLISION_STAY() { return 'collision:stay'; }
    static get COLLISION_EXIT() { return 'collision:exit'; }
    
    static get TRIGGER_ENTER() { return 'trigger:enter'; }
    static get TRIGGER_STAY() { return 'trigger:stay'; }
    static get TRIGGER_EXIT() { return 'trigger:exit'; }
    
    static get ANIMATION_START() { return 'animation:start'; }
    static get ANIMATION_UPDATE() { return 'animation:update'; }
    static get ANIMATION_COMPLETE() { return 'animation:complete'; }
    static get ANIMATION_EVENT() { return 'animation:event'; }
    
    static get INPUT_KEY_DOWN() { return 'input:key:down'; }
    static get INPUT_KEY_UP() { return 'input:key:up'; }
    static get INPUT_KEY_HOLD() { return 'input:key:hold'; }
    
    static get INPUT_MOUSE_DOWN() { return 'input:mouse:down'; }
    static get INPUT_MOUSE_UP() { return 'input:mouse:up'; }
    static get INPUT_MOUSE_MOVE() { return 'input:mouse:move'; }
    static get INPUT_MOUSE_WHEEL() { return 'input:mouse:wheel'; }
    
    static get INPUT_TOUCH_START() { return 'input:touch:start'; }
    static get INPUT_TOUCH_MOVE() { return 'input:touch:move'; }
    static get INPUT_TOUCH_END() { return 'input:touch:end'; }
    
    static get AUDIO_PLAY() { return 'audio:play'; }
    static get AUDIO_STOP() { return 'audio:stop'; }
    static get AUDIO_PAUSE() { return 'audio:pause'; }
    static get AUDIO_COMPLETE() { return 'audio:complete'; }
    
    static get RESOURCE_LOAD_START() { return 'resource:load:start'; }
    static get RESOURCE_LOAD_PROGRESS() { return 'resource:load:progress'; }
    static get RESOURCE_LOAD_COMPLETE() { return 'resource:load:complete'; }
    static get RESOURCE_LOAD_ERROR() { return 'resource:load:error'; }
    static get RESOURCE_UNLOAD() { return 'resource:unload'; }
    
    static get PHYSICS_SIMULATE_START() { return 'physics:simulate:start'; }
    static get PHYSICS_SIMULATE_END() { return 'physics:simulate:end'; }
    static get PHYSICS_RIGIDBODY_WAKE() { return 'physics:rigidbody:wake'; }
    static get PHYSICS_RIGIDBODY_SLEEP() { return 'physics:rigidbody:sleep'; }
    
    static get RENDER_PRE_RENDER() { return 'render:pre'; }
    static get RENDER_POST_RENDER() { return 'render:post'; }
    static get RENDER_CAMERA_PRE_CULL() { return 'render:camera:precull'; }
    static get RENDER_CAMERA_POST_RENDER() { return 'render:camera:postrender'; }
    
    static get NETWORK_CONNECT() { return 'network:connect'; }
    static get NETWORK_DISCONNECT() { return 'network:disconnect'; }
    static get NETWORK_MESSAGE() { return 'network:message'; }
    static get NETWORK_SYNC() { return 'network:sync'; }
    
    static get UI_CLICK() { return 'ui:click'; }
    static get UI_HOVER() { return 'ui:hover'; }
    static get UI_VALUE_CHANGE() { return 'ui:value:change'; }
    static get UI_DRAG_START() { return 'ui:drag:start'; }
    static get UI_DRAG() { return 'ui:drag'; }
    static get UI_DRAG_END() { return 'ui:drag:end'; }
    
    static get DEBUG_LOG() { return 'debug:log'; }
    static get DEBUG_WARNING() { return 'debug:warning'; }
    static get DEBUG_ERROR() { return 'debug:error'; }
    static get DEBUG_ASSERT() { return 'debug:assert'; }
    
    static get CUSTOM_START() { return 'custom:'; }
}

export default { GameEvent, EventListener, EventManager, Events, EventTypes };
