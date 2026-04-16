/**
 * Mini Game Engine - Base Object
 * 所有引擎对象的基类
 */

let _objectIdCounter = 0;

export class Object {
    constructor() {
        this._id = ++_objectIdCounter;
        this._name = `Object_${this._id}`;
        this._userData = {};
        this._isDestroyed = false;
    }

    get id() { return this._id; }

    get name() { return this._name; }
    set name(value) { this._name = value || `Object_${this._id}`; }

    get userData() { return this._userData; }
    set userData(value) { this._userData = value || {}; }

    get isDestroyed() { return this._isDestroyed; }

    destroy() {
        if (this._isDestroyed) return;
        this._isDestroyed = true;
        this.onDestroy();
    }

    onDestroy() {
    }

    equals(other) {
        if (!other) return false;
        return this._id === other.id;
    }

    toString() {
        return `${this.constructor.name}(${this._id}, "${this._name}")`;
    }

    static Instantiate(original, position, rotation) {
        if (!original) return null;
        
        const instance = new original.constructor();
        instance._name = original._name;
        instance._userData = { ...original._userData };
        
        return instance;
    }

    static Destroy(obj, delay = 0) {
        if (!obj) return;
        
        if (delay > 0) {
            setTimeout(() => {
                obj.destroy();
            }, delay * 1000);
        } else {
            obj.destroy();
        }
    }

    static DontDestroyOnLoad(obj) {
        if (obj && obj._userData) {
            obj._userData._dontDestroyOnLoad = true;
        }
    }
}

export default Object;
