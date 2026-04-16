/**
 * Mini Game Engine - Network Sync System
 * 网络同步系统，支持网格和变换同步
 */

import { Object } from '../core/Object.js';
import { Time } from '../core/Time.js';
import { Events, EventTypes } from '../events/EventManager.js';

export const SyncMode = {
    NONE: 0,
    TRANSFORM: 1,
    POSITION: 2,
    ROTATION: 3,
    SCALE: 4,
    CUSTOM: 5
};

export const InterpolationMode = {
    NONE: 0,
    LINEAR: 1,
    SMOOTH: 2,
    PREDICTIVE: 3
};

export class NetworkIdentity extends Object {
    static _componentType = 'NetworkIdentity';
    static _nextNetworkId = 1;

    constructor(gameObject = null, options = {}) {
        super();
        this._gameObject = gameObject;
        this._networkId = options.networkId || NetworkIdentity._getNextId();
        this._isLocalPlayer = options.isLocalPlayer || false;
        this._isServer = options.isServer || false;
        this._isOwner = options.isOwner !== false;
        this._syncMode = options.syncMode || SyncMode.TRANSFORM;
        this._syncInterval = options.syncInterval || 0.1;
        this._lastSyncTime = 0;
        
        this._syncComponents = [];
        this._onSpawnCallbacks = [];
        this._onDespawnCallbacks = [];
    }

    get componentType() { return NetworkIdentity._componentType; }
    get gameObject() { return this._gameObject; }
    get networkId() { return this._networkId; }
    get isLocalPlayer() { return this._isLocalPlayer; }
    get isServer() { return this._isServer; }
    get isOwner() { return this._isOwner; }
    get syncMode() { return this._syncMode; }
    set syncMode(value) { this._syncMode = value; }
    get syncInterval() { return this._syncInterval; }
    set syncInterval(value) { this._syncInterval = Math.max(0.01, value); }

    static _getNextId() {
        return NetworkIdentity._nextNetworkId++;
    }

    addSyncComponent(component) {
        if (!this._syncComponents.includes(component)) {
            this._syncComponents.push(component);
        }
    }

    removeSyncComponent(component) {
        const index = this._syncComponents.indexOf(component);
        if (index > -1) {
            this._syncComponents.splice(index, 1);
        }
    }

    shouldSync() {
        if (this._isLocalPlayer && !this._isOwner) return false;
        if (!this._isOwner && !this._isServer) return false;
        
        const now = Time.time;
        if (now - this._lastSyncTime >= this._syncInterval) {
            this._lastSyncTime = now;
            return true;
        }
        return false;
    }

    getSyncData() {
        const data = {
            networkId: this._networkId,
            timestamp: Time.time,
            components: []
        };

        for (const component of this._syncComponents) {
            if (component.getSyncData) {
                data.components.push({
                    type: component.constructor.name,
                    data: component.getSyncData()
                });
            }
        }

        return data;
    }

    applySyncData(data) {
        for (const compData of data.components) {
            const component = this._syncComponents.find(c => 
                c.constructor.name === compData.type
            );
            if (component && component.applySyncData) {
                component.applySyncData(compData.data);
            }
        }
    }

    onSpawn(callback) {
        this._onSpawnCallbacks.push(callback);
    }

    onDespawn(callback) {
        this._onDespawnCallbacks.push(callback);
    }

    spawn() {
        Events.broadcast({
            type: EventTypes.NETWORK_SYNC,
            data: {
                action: 'spawn',
                networkId: this._networkId,
                gameObject: this._gameObject
            }
        });

        for (const callback of this._onSpawnCallbacks) {
            callback(this);
        }
    }

    despawn() {
        Events.broadcast({
            type: EventTypes.NETWORK_SYNC,
            data: {
                action: 'despawn',
                networkId: this._networkId
            }
        });

        for (const callback of this._onDespawnCallbacks) {
            callback(this);
        }
    }
}

export class NetworkTransform extends Object {
    static _componentType = 'NetworkTransform';

    constructor(gameObject = null, options = {}) {
        super();
        this._gameObject = gameObject;
        this._networkIdentity = null;
        
        this._syncMode = options.syncMode || SyncMode.TRANSFORM;
        this._interpolationMode = options.interpolationMode || InterpolationMode.SMOOTH;
        this._interpolationSpeed = options.interpolationSpeed || 10;
        
        this._syncPosition = options.syncPosition !== false;
        this._syncRotation = options.syncRotation !== false;
        this._syncScale = options.syncScale === true;
        
        this._sendVelocity = options.sendVelocity === true;
        this._sendAngularVelocity = options.sendAngularVelocity === true;
        
        this._lastSentPosition = null;
        this._lastSentRotation = null;
        this._lastSentScale = null;
        
        this._targetPosition = null;
        this._targetRotation = null;
        this._targetScale = null;
        
        this._velocity = { x: 0, y: 0, z: 0 };
        this._angularVelocity = { x: 0, y: 0, z: 0 };
        
        this._networkPositionHistory = [];
        this._networkRotationHistory = [];
        this._maxHistorySize = 10;
        
        this._isInterpolating = false;
        this._interpolationStartTime = 0;
        this._interpolationDuration = 0;
        
        this._snapThreshold = options.snapThreshold || 5;
        this._snapAngleThreshold = options.snapAngleThreshold || 180;
        
        this._teleportOnNextSync = false;
    }

    get componentType() { return NetworkTransform._componentType; }
    get gameObject() { return this._gameObject; }
    get networkIdentity() { return this._networkIdentity; }

    get syncMode() { return this._syncMode; }
    set syncMode(value) { this._syncMode = value; }

    get interpolationMode() { return this._interpolationMode; }
    set interpolationMode(value) { this._interpolationMode = value; }

    get interpolationSpeed() { return this._interpolationSpeed; }
    set interpolationSpeed(value) { this._interpolationSpeed = Math.max(0.1, value); }

    setNetworkIdentity(identity) {
        this._networkIdentity = identity;
        if (identity) {
            identity.addSyncComponent(this);
        }
    }

    getSyncData() {
        if (!this._gameObject || !this._gameObject.transform) {
            return null;
        }

        const transform = this._gameObject.transform;
        const data = {
            timestamp: Time.time,
            mode: this._syncMode
        };

        if (this._syncPosition && this._syncMode !== SyncMode.ROTATION) {
            data.position = { ...transform.position };
        }

        if (this._syncRotation && this._syncMode !== SyncMode.POSITION) {
            data.rotation = { ...transform.rotation };
        }

        if (this._syncScale) {
            data.scale = { ...transform.scale };
        }

        if (this._sendVelocity) {
            data.velocity = { ...this._velocity };
        }

        if (this._sendAngularVelocity) {
            data.angularVelocity = { ...this._angularVelocity };
        }

        this._lastSentPosition = data.position ? { ...data.position } : null;
        this._lastSentRotation = data.rotation ? { ...data.rotation } : null;
        this._lastSentScale = data.scale ? { ...data.scale } : null;

        return data;
    }

    applySyncData(data) {
        if (!data || !this._gameObject || !this._gameObject.transform) {
            return;
        }

        const transform = this._gameObject.transform;

        if (this._teleportOnNextSync) {
            this._teleportOnNextSync = false;
            
            if (data.position && this._syncPosition) {
                transform.position = { ...data.position };
            }
            if (data.rotation && this._syncRotation) {
                transform.rotation = { ...data.rotation };
            }
            if (data.scale && this._syncScale) {
                transform.scale = { ...data.scale };
            }
            return;
        }

        let needsSnap = false;

        if (data.position && this._syncPosition) {
            const currentPos = transform.position;
            const distance = Math.sqrt(
                Math.pow(data.position.x - currentPos.x, 2) +
                Math.pow(data.position.y - currentPos.y, 2) +
                Math.pow(data.position.z - currentPos.z, 2)
            );
            
            if (distance > this._snapThreshold) {
                needsSnap = true;
            }
            
            this._targetPosition = { ...data.position };
            this._networkPositionHistory.push({
                position: { ...data.position },
                timestamp: data.timestamp || Time.time
            });
            
            if (this._networkPositionHistory.length > this._maxHistorySize) {
                this._networkPositionHistory.shift();
            }
        }

        if (data.rotation && this._syncRotation) {
            this._targetRotation = { ...data.rotation };
            this._networkRotationHistory.push({
                rotation: { ...data.rotation },
                timestamp: data.timestamp || Time.time
            });
            
            if (this._networkRotationHistory.length > this._maxHistorySize) {
                this._networkRotationHistory.shift();
            }
        }

        if (data.scale && this._syncScale) {
            this._targetScale = { ...data.scale };
        }

        if (needsSnap) {
            this._snapToTarget();
        } else if (this._interpolationMode !== InterpolationMode.NONE) {
            this._startInterpolation();
        } else {
            this._snapToTarget();
        }
    }

    _snapToTarget() {
        if (!this._gameObject || !this._gameObject.transform) {
            return;
        }

        const transform = this._gameObject.transform;

        if (this._targetPosition) {
            transform.position = { ...this._targetPosition };
        }
        if (this._targetRotation) {
            transform.rotation = { ...this._targetRotation };
        }
        if (this._targetScale) {
            transform.scale = { ...this._targetScale };
        }

        this._isInterpolating = false;
    }

    _startInterpolation() {
        this._isInterpolating = true;
        this._interpolationStartTime = Time.time;
        this._interpolationDuration = 0.1;
    }

    update() {
        if (!this._gameObject || !this._gameObject.transform) {
            return;
        }

        if (this._networkIdentity) {
            const identity = this._networkIdentity;
            
            if (identity.isOwner || identity.isLocalPlayer) {
                this._updateSender();
            } else {
                this._updateInterpolator();
            }
        }
    }

    _updateSender() {
        if (!this._networkIdentity.shouldSync()) {
            return;
        }

        const transform = this._gameObject.transform;

        if (this._lastSentPosition) {
            this._velocity = {
                x: (transform.position.x - this._lastSentPosition.x) / Time.deltaTime,
                y: (transform.position.y - this._lastSentPosition.y) / Time.deltaTime,
                z: (transform.position.z - this._lastSentPosition.z) / Time.deltaTime
            };
        }
    }

    _updateInterpolator() {
        if (!this._isInterpolating) {
            return;
        }

        const transform = this._gameObject.transform;
        const deltaTime = Time.deltaTime;
        const t = Math.min(1, deltaTime * this._interpolationSpeed);

        if (this._targetPosition && this._syncPosition) {
            switch (this._interpolationMode) {
                case InterpolationMode.LINEAR:
                    transform.position = {
                        x: transform.position.x + (this._targetPosition.x - transform.position.x) * t,
                        y: transform.position.y + (this._targetPosition.y - transform.position.y) * t,
                        z: transform.position.z + (this._targetPosition.z - transform.position.z) * t
                    };
                    break;
                case InterpolationMode.SMOOTH:
                    const smoothT = t * t * (3 - 2 * t);
                    transform.position = {
                        x: transform.position.x + (this._targetPosition.x - transform.position.x) * smoothT,
                        y: transform.position.y + (this._targetPosition.y - transform.position.y) * smoothT,
                        z: transform.position.z + (this._targetPosition.z - transform.position.z) * smoothT
                    };
                    break;
                case InterpolationMode.PREDICTIVE:
                    if (this._velocity) {
                        const predictedPos = {
                            x: this._targetPosition.x + this._velocity.x * deltaTime,
                            y: this._targetPosition.y + this._velocity.y * deltaTime,
                            z: this._targetPosition.z + this._velocity.z * deltaTime
                        };
                        transform.position = {
                            x: transform.position.x + (predictedPos.x - transform.position.x) * t,
                            y: transform.position.y + (predictedPos.y - transform.position.y) * t,
                            z: transform.position.z + (predictedPos.z - transform.position.z) * t
                        };
                    }
                    break;
            }
        }

        if (this._targetRotation && this._syncRotation) {
            const current = transform.rotation;
            const target = this._targetRotation;
            
            const dot = current.x * target.x + current.y * target.y + current.z * target.z + current.w * target.w;
            
            if (Math.abs(dot) < 1 - 0.0001) {
                const blendT = t;
                
                const result = this._slerp(current, target, blendT);
                transform.rotation = result;
            }
        }

        if (this._targetScale && this._syncScale) {
            transform.scale = {
                x: transform.scale.x + (this._targetScale.x - transform.scale.x) * t,
                y: transform.scale.y + (this._targetScale.y - transform.scale.y) * t,
                z: transform.scale.z + (this._targetScale.z - transform.scale.z) * t
            };
        }

        const posThreshold = 0.001;
        const rotThreshold = 0.001;
        
        let done = true;
        
        if (this._targetPosition && this._syncPosition) {
            const posDiff = Math.sqrt(
                Math.pow(transform.position.x - this._targetPosition.x, 2) +
                Math.pow(transform.position.y - this._targetPosition.y, 2) +
                Math.pow(transform.position.z - this._targetPosition.z, 2)
            );
            if (posDiff > posThreshold) done = false;
        }
        
        if (this._targetRotation && this._syncRotation) {
            const dot = transform.rotation.x * this._targetRotation.x +
                       transform.rotation.y * this._targetRotation.y +
                       transform.rotation.z * this._targetRotation.z +
                       transform.rotation.w * this._targetRotation.w;
            if (Math.abs(1 - dot) > rotThreshold) done = false;
        }
        
        if (done) {
            this._isInterpolating = false;
        }
    }

    _slerp(q1, q2, t) {
        let dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
        
        if (dot < 0) {
            q2 = { x: -q2.x, y: -q2.y, z: -q2.z, w: -q2.w };
            dot = -dot;
        }
        
        if (dot > 0.9995) {
            return {
                x: q1.x + (q2.x - q1.x) * t,
                y: q1.y + (q2.y - q1.y) * t,
                z: q1.z + (q2.z - q1.z) * t,
                w: q1.w + (q2.w - q1.w) * t
            };
        }
        
        const theta0 = Math.acos(dot);
        const theta = theta0 * t;
        const sinTheta = Math.sin(theta);
        const sinTheta0 = Math.sin(theta0);
        
        const s1 = Math.sin((1 - t) * theta0) / sinTheta0;
        const s2 = sinTheta / sinTheta0;
        
        return {
            x: s1 * q1.x + s2 * q2.x,
            y: s1 * q1.y + s2 * q2.y,
            z: s1 * q1.z + s2 * q2.z,
            w: s1 * q1.w + s2 * q2.w
        };
    }

    teleport(position, rotation, scale) {
        if (!this._gameObject || !this._gameObject.transform) {
            return;
        }

        const transform = this._gameObject.transform;

        if (position) {
            transform.position = { ...position };
            this._targetPosition = { ...position };
        }
        if (rotation) {
            transform.rotation = { ...rotation };
            this._targetRotation = { ...rotation };
        }
        if (scale) {
            transform.scale = { ...scale };
            this._targetScale = { ...scale };
        }

        this._isInterpolating = false;
        this._teleportOnNextSync = true;
    }

    setVelocity(velocity) {
        this._velocity = { ...velocity };
    }

    setAngularVelocity(angularVelocity) {
        this._angularVelocity = { ...angularVelocity };
    }

    destroy() {
        if (this._networkIdentity) {
            this._networkIdentity.removeSyncComponent(this);
        }
        this._gameObject = null;
        this._networkIdentity = null;
        this._networkPositionHistory = [];
        this._networkRotationHistory = [];
        
        super.destroy();
    }
}

export class NetworkSync extends Object {
    static _instance = null;

    static get instance() {
        if (!this._instance) {
            this._instance = new NetworkSync();
        }
        return this._instance;
    }

    constructor() {
        super();
        this._networkObjects = new Map();
        this._syncQueue = [];
        this._isServer = false;
        this._isClient = false;
        this._serverTimeOffset = 0;
        this._latency = 0;
        this._packetLossRate = 0;
    }

    get networkObjects() { return Array.from(this._networkObjects.values()); }
    get isServer() { return this._isServer; }
    get isClient() { return this._isClient; }
    get latency() { return this._latency; }

    registerNetworkObject(identity) {
        if (!identity) return;
        
        this._networkObjects.set(identity.networkId, identity);
        identity.spawn();
    }

    unregisterNetworkObject(identity) {
        if (!identity) return;
        
        this._networkObjects.delete(identity.networkId);
        identity.despawn();
    }

    getNetworkObject(networkId) {
        return this._networkObjects.get(networkId);
    }

    update() {
        for (const [networkId, identity] of this._networkObjects) {
            if (identity.isOwner && identity.shouldSync()) {
                const data = identity.getSyncData();
                if (data) {
                    this._syncQueue.push({
                        type: 'sync',
                        data: data,
                        timestamp: Time.time
                    });
                }
            }
        }

        this._processSyncQueue();
    }

    _processSyncQueue() {
        for (const syncData of this._syncQueue) {
            if (syncData.type === 'sync' && syncData.data) {
                const identity = this._networkObjects.get(syncData.data.networkId);
                if (identity && !identity.isOwner) {
                    identity.applySyncData(syncData.data);
                }
            }
        }
        this._syncQueue = [];
    }

    receiveSyncData(data) {
        const identity = this._networkObjects.get(data.networkId);
        if (identity) {
            identity.applySyncData(data);
        }
    }

    broadcastSyncData() {
        for (const [networkId, identity] of this._networkObjects) {
            if (identity.isOwner && identity.shouldSync()) {
                const data = identity.getSyncData();
                if (data) {
                    Events.broadcast({
                        type: EventTypes.NETWORK_MESSAGE,
                        data: {
                            type: 'sync',
                            payload: data
                        }
                    });
                }
            }
        }
    }

    clear() {
        for (const [networkId, identity] of this._networkObjects) {
            identity.despawn();
        }
        this._networkObjects.clear();
        this._syncQueue = [];
    }
}

export default { NetworkTransform, NetworkIdentity, NetworkSync, SyncMode, InterpolationMode };
