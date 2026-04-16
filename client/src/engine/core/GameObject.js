/**
 * Mini Game Engine - GameObject
 * 游戏对象类，场景中所有实体的容器
 */

import { Object } from './Object.js';
import { Component } from './Component.js';

let _gameObjectIdCounter = 0;

export class Transform {
    constructor(gameObject) {
        this._gameObject = gameObject;
        this._parent = null;
        this._children = [];
        
        this._position = { x: 0, y: 0, z: 0 };
        this._rotation = { x: 0, y: 0, z: 0 };
        this._scale = { x: 1, y: 1, z: 1 };
        
        this._eulerAngles = { x: 0, y: 0, z: 0 };
        this._quaternion = { x: 0, y: 0, z: 0, w: 1 };
        
        this._localPosition = { x: 0, y: 0, z: 0 };
        this._localRotation = { x: 0, y: 0, z: 0 };
        this._localScale = { x: 1, y: 1, z: 1 };
        
        this._forward = { x: 0, y: 0, z: -1 };
        this._up = { x: 0, y: 1, z: 0 };
        this._right = { x: 1, y: 0, z: 0 };
        
        this._hasChanged = false;
    }

    get gameObject() { return this._gameObject; }

    get position() {
        if (this._parent) {
            return this._transformPoint(this._localPosition);
        }
        return { ...this._position };
    }
    
    set position(value) {
        if (this._parent) {
            this._localPosition = this._inverseTransformPoint(value);
        } else {
            this._position = { ...value };
        }
        this._hasChanged = true;
        this._updateVectors();
    }

    get localPosition() {
        return { ...this._localPosition };
    }
    
    set localPosition(value) {
        this._localPosition = { ...value };
        if (!this._parent) {
            this._position = { ...value };
        }
        this._hasChanged = true;
        this._updateVectors();
    }

    get rotation() {
        return { ...this._quaternion };
    }
    
    set rotation(value) {
        this._quaternion = { ...value };
        this._quaternionToEuler();
        this._hasChanged = true;
        this._updateVectors();
    }

    get localRotation() {
        return { ...this._localRotation };
    }
    
    set localRotation(value) {
        this._localRotation = { ...value };
        this._hasChanged = true;
        this._updateVectors();
    }

    get eulerAngles() {
        return { ...this._eulerAngles };
    }
    
    set eulerAngles(value) {
        this._eulerAngles = { ...value };
        this._eulerToQuaternion();
        this._hasChanged = true;
        this._updateVectors();
    }

    get localEulerAngles() {
        return this._eulerToDegrees(this._localRotation);
    }
    
    set localEulerAngles(value) {
        this._localRotation = this._degreesToEuler(value);
        this._hasChanged = true;
        this._updateVectors();
    }

    get scale() {
        if (this._parent) {
            const parentScale = this._parent.scale;
            return {
                x: parentScale.x * this._localScale.x,
                y: parentScale.y * this._localScale.y,
                z: parentScale.z * this._localScale.z
            };
        }
        return { ...this._localScale };
    }
    
    set scale(value) {
        if (this._parent) {
            const parentScale = this._parent.scale;
            this._localScale = {
                x: value.x / parentScale.x,
                y: value.y / parentScale.y,
                z: value.z / parentScale.z
            };
        } else {
            this._localScale = { ...value };
        }
        this._hasChanged = true;
    }

    get localScale() {
        return { ...this._localScale };
    }
    
    set localScale(value) {
        this._localScale = { ...value };
        this._hasChanged = true;
    }

    get parent() { return this._parent; }
    
    set parent(value) {
        if (this._parent === value) return;
        
        if (this._parent) {
            const index = this._parent._children.indexOf(this);
            if (index > -1) {
                this._parent._children.splice(index, 1);
            }
        }
        
        const worldPos = this.position;
        const worldRot = this.rotation;
        const worldScale = this.scale;
        
        this._parent = value;
        
        if (this._parent) {
            this._parent._children.push(this);
            this._localPosition = this._inverseTransformPoint(worldPos);
        } else {
            this._position = worldPos;
            this._localPosition = { ...worldPos };
        }
        
        this._hasChanged = true;
    }

    get childCount() { return this._children.length; }

    get forward() { return { ...this._forward }; }
    get up() { return { ...this._up }; }
    get right() { return { ...this._right }; }

    get root() {
        let current = this;
        while (current._parent) {
            current = current._parent;
        }
        return current;
    }

    get hasChanged() { return this._hasChanged; }
    
    set hasChanged(value) {
        this._hasChanged = value;
    }

    _updateVectors() {
        const rad = (deg) => deg * Math.PI / 180;
        const euler = this._eulerAngles;
        
        const sx = Math.sin(rad(euler.x));
        const cx = Math.cos(rad(euler.x));
        const sy = Math.sin(rad(euler.y));
        const cy = Math.cos(rad(euler.y));
        const sz = Math.sin(rad(euler.z));
        const cz = Math.cos(rad(euler.z));
        
        this._forward = {
            x: -sx * sy,
            y: cx,
            z: -sx * cy
        };
        
        const len = Math.sqrt(
            this._forward.x * this._forward.x +
            this._forward.y * this._forward.y +
            this._forward.z * this._forward.z
        );
        if (len > 0) {
            this._forward.x /= len;
            this._forward.y /= len;
            this._forward.z /= len;
        }
        
        this._up = { x: 0, y: 1, z: 0 };
        this._right = { x: 1, y: 0, z: 0 };
    }

    _transformPoint(point) {
        if (!this._parent) return point;
        
        const parentPos = this._parent.position;
        return {
            x: parentPos.x + point.x,
            y: parentPos.y + point.y,
            z: parentPos.z + point.z
        };
    }

    _inverseTransformPoint(point) {
        if (!this._parent) return point;
        
        const parentPos = this._parent.position;
        return {
            x: point.x - parentPos.x,
            y: point.y - parentPos.y,
            z: point.z - parentPos.z
        };
    }

    _quaternionToEuler() {
        const q = this._quaternion;
        const x = q.x, y = q.y, z = q.z, w = q.w;
        
        const sinr_cosp = 2 * (w * x + y * z);
        const cosr_cosp = 1 - 2 * (x * x + y * y);
        this._eulerAngles.x = Math.atan2(sinr_cosp, cosr_cosp) * 180 / Math.PI;
        
        const sinp = 2 * (w * y - z * x);
        if (Math.abs(sinp) >= 1) {
            this._eulerAngles.y = Math.sign(sinp) * Math.PI / 2 * 180 / Math.PI;
        } else {
            this._eulerAngles.y = Math.asin(sinp) * 180 / Math.PI;
        }
        
        const siny_cosp = 2 * (w * z + x * y);
        const cosy_cosp = 1 - 2 * (y * y + z * z);
        this._eulerAngles.z = Math.atan2(siny_cosp, cosy_cosp) * 180 / Math.PI;
    }

    _eulerToQuaternion() {
        const rad = (deg) => deg * Math.PI / 180;
        const x = rad(this._eulerAngles.x / 2);
        const y = rad(this._eulerAngles.y / 2);
        const z = rad(this._eulerAngles.z / 2);
        
        const cx = Math.cos(x), sx = Math.sin(x);
        const cy = Math.cos(y), sy = Math.sin(y);
        const cz = Math.cos(z), sz = Math.sin(z);
        
        this._quaternion = {
            x: sx * cy * cz - cx * sy * sz,
            y: cx * sy * cz + sx * cy * sz,
            z: cx * cy * sz - sx * sy * cz,
            w: cx * cy * cz + sx * sy * sz
        };
    }

    _eulerToDegrees(euler) {
        return {
            x: euler.x * 180 / Math.PI,
            y: euler.y * 180 / Math.PI,
            z: euler.z * 180 / Math.PI
        };
    }

    _degreesToEuler(degrees) {
        return {
            x: degrees.x * Math.PI / 180,
            y: degrees.y * Math.PI / 180,
            z: degrees.z * Math.PI / 180
        };
    }

    Translate(translation, space = 'self') {
        if (space === 'self') {
            const pos = this.position;
            this.position = {
                x: pos.x + translation.x,
                y: pos.y + translation.y,
                z: pos.z + translation.z
            };
        } else {
            const pos = this.position;
            this.position = {
                x: pos.x + translation.x,
                y: pos.y + translation.y,
                z: pos.z + translation.z
            };
        }
    }

    Rotate(eulerAngles, space = 'self') {
        const angles = this.eulerAngles;
        this.eulerAngles = {
            x: angles.x + eulerAngles.x,
            y: angles.y + eulerAngles.y,
            z: angles.z + eulerAngles.z
        };
    }

    RotateAround(point, axis, angle) {
        const rad = angle * Math.PI / 180;
        const pos = this.position;
        
        const dx = pos.x - point.x;
        const dy = pos.y - point.y;
        const dz = pos.z - point.z;
        
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        let newX = dx, newY = dy, newZ = dz;
        
        if (axis.x !== 0) {
            newY = dy * cos - dz * sin;
            newZ = dy * sin + dz * cos;
        }
        if (axis.y !== 0) {
            newX = dx * cos + dz * sin;
            newZ = -dx * sin + dz * cos;
        }
        if (axis.z !== 0) {
            newX = dx * cos - dy * sin;
            newY = dx * sin + dy * cos;
        }
        
        this.position = {
            x: point.x + newX,
            y: point.y + newY,
            z: point.z + newZ
        };
    }

    LookAt(target, worldUp = { x: 0, y: 1, z: 0 }) {
        const pos = this.position;
        const dir = {
            x: target.x - pos.x,
            y: target.y - pos.y,
            z: target.z - pos.z
        };
        
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
        if (len > 0) {
            dir.x /= len;
            dir.y /= len;
            dir.z /= len;
        }
        
        const yaw = Math.atan2(-dir.x, -dir.z) * 180 / Math.PI;
        const pitch = Math.asin(dir.y) * 180 / Math.PI;
        
        this.eulerAngles = { x: pitch, y: yaw, z: 0 };
    }

    GetChild(index) {
        return this._children[index];
    }

    Find(name) {
        if (this._gameObject && this._gameObject.name === name) {
            return this;
        }
        
        for (const child of this._children) {
            if (child._gameObject && child._gameObject.name === name) {
                return child;
            }
            const found = child.Find(name);
            if (found) return found;
        }
        
        return null;
    }

    IsChildOf(parent) {
        let current = this._parent;
        while (current) {
            if (current === parent) return true;
            current = current._parent;
        }
        return false;
    }

    DetachChildren() {
        for (const child of this._children) {
            child._parent = null;
        }
        this._children = [];
    }

    SetAsFirstSibling() {
        if (!this._parent) return;
        const index = this._parent._children.indexOf(this);
        if (index > 0) {
            this._parent._children.splice(index, 1);
            this._parent._children.unshift(this);
        }
    }

    SetAsLastSibling() {
        if (!this._parent) return;
        const index = this._parent._children.indexOf(this);
        if (index > -1 && index < this._parent._children.length - 1) {
            this._parent._children.splice(index, 1);
            this._parent._children.push(this);
        }
    }

    SetSiblingIndex(index) {
        if (!this._parent) return;
        const currentIndex = this._parent._children.indexOf(this);
        if (currentIndex === index) return;
        
        this._parent._children.splice(currentIndex, 1);
        this._parent._children.splice(index, 0, this);
    }

    GetSiblingIndex() {
        if (!this._parent) return 0;
        return this._parent._children.indexOf(this);
    }

    InverseTransformPoint(position) {
        return this._inverseTransformPoint(position);
    }

    TransformPoint(position) {
        return this._transformPoint(position);
    }

    TransformDirection(direction) {
        return { ...direction };
    }

    InverseTransformDirection(direction) {
        return { ...direction };
    }

    TransformVector(vector) {
        return {
            x: vector.x * this._localScale.x,
            y: vector.y * this._localScale.y,
            z: vector.z * this._localScale.z
        };
    }

    InverseTransformVector(vector) {
        return {
            x: vector.x / this._localScale.x,
            y: vector.y / this._localScale.y,
            z: vector.z / this._localScale.z
        };
    }
}

export class GameObject extends Object {
    constructor(name = 'GameObject') {
        super();
        this._name = name;
        this._tag = 'Untagged';
        this._layer = 0;
        this._active = true;
        this._activeInHierarchy = true;
        
        this._transform = new Transform(this);
        this._components = [];
        this._componentTypeMap = new Map();
        
        this._isStatic = false;
        this._scene = null;
        
        this._mesh = null;
    }

    get transform() { return this._transform; }
    get activeInHierarchy() { return this._activeInHierarchy; }
    
    get activeSelf() { return this._active; }
    set activeSelf(value) {
        if (this._active !== value) {
            this._active = value;
            this._updateActiveInHierarchy();
            if (value) {
                for (const comp of this._components) {
                    if (comp.enabled) {
                        comp.onEnable();
                    }
                }
            } else {
                for (const comp of this._components) {
                    if (comp.enabled) {
                        comp.onDisable();
                    }
                }
            }
        }
    }

    get tag() { return this._tag; }
    set tag(value) { this._tag = value; }

    get layer() { return this._layer; }
    set layer(value) { this._layer = value; }

    get isStatic() { return this._isStatic; }
    set isStatic(value) { this._isStatic = value; }

    get scene() { return this._scene; }

    get mesh() { return this._mesh; }
    set mesh(value) {
        this._mesh = value;
        if (value) {
            this._transform.position = {
                x: value.position.x,
                y: value.position.y,
                z: value.position.z
            };
        }
    }

    _updateActiveInHierarchy() {
        const parentActive = !this._transform.parent || 
            this._transform.parent.gameObject.activeInHierarchy;
        this._activeInHierarchy = this._active && parentActive;
        
        for (const child of this._transform._children) {
            child.gameObject._updateActiveInHierarchy();
        }
    }

    SetActive(value) {
        this.activeSelf = value;
    }

    AddComponent(type, options = {}) {
        if (!type) return null;
        
        const componentType = type.componentType || type.name;
        
        if (!type._allowMultiple && this._componentTypeMap.has(componentType)) {
            console.warn(`GameObject already has component: ${componentType}`);
            return this._componentTypeMap.get(componentType);
        }
        
        const component = new type();
        component._setGameObject(this);
        component.enabled = options.enabled !== false;
        
        this._components.push(component);
        
        if (!this._componentTypeMap.has(componentType)) {
            this._componentTypeMap.set(componentType, component);
        }
        
        if (this._activeInHierarchy && component.enabled) {
            component._callAwake();
        }
        
        return component;
    }

    GetComponent(type) {
        if (!type) return null;
        
        const componentType = type.componentType || type.name;
        
        if (this._componentTypeMap.has(componentType)) {
            return this._componentTypeMap.get(componentType);
        }
        
        for (const comp of this._components) {
            if (comp instanceof type) {
                return comp;
            }
        }
        
        return null;
    }

    GetComponentInChildren(type, includeInactive = false) {
        const result = this.GetComponent(type);
        if (result) return result;
        
        for (const childTransform of this._transform._children) {
            const child = childTransform.gameObject;
            if (!includeInactive && !child.activeInHierarchy) continue;
            
            const childResult = child.GetComponentInChildren(type, includeInactive);
            if (childResult) return childResult;
        }
        
        return null;
    }

    GetComponentInParent(type) {
        const result = this.GetComponent(type);
        if (result) return result;
        
        if (this._transform.parent) {
            return this._transform.parent.gameObject.GetComponentInParent(type);
        }
        
        return null;
    }

    GetComponents(type) {
        if (!type) return [];
        
        const results = [];
        for (const comp of this._components) {
            if (comp instanceof type) {
                results.push(comp);
            }
        }
        
        return results;
    }

    GetComponentsInChildren(type, includeInactive = false) {
        const results = this.GetComponents(type);
        
        for (const childTransform of this._transform._children) {
            const child = childTransform.gameObject;
            if (!includeInactive && !child.activeInHierarchy) continue;
            
            results.push(...child.GetComponentsInChildren(type, includeInactive));
        }
        
        return results;
    }

    GetComponentsInParent(type, includeInactive = false) {
        const results = this.GetComponents(type);
        
        if (this._transform.parent) {
            const parentResults = this._transform.parent.gameObject.GetComponentsInParent(type, includeInactive);
            results.push(...parentResults);
        }
        
        return results;
    }

    TryGetComponent(type, outComponent) {
        const comp = this.GetComponent(type);
        if (comp) {
            if (outComponent) {
                outComponent.value = comp;
            }
            return true;
        }
        return false;
    }

    CompareTag(tag) {
        return this._tag === tag;
    }

    SendMessage(methodName, value = null, options = {}) {
        const requireReceiver = options.requireReceiver !== false;
        
        for (const comp of this._components) {
            if (typeof comp[methodName] === 'function') {
                try {
                    comp[methodName](value);
                } catch (error) {
                    console.error(`Error in SendMessage ${methodName}:`, error);
                }
            }
        }
    }

    BroadcastMessage(methodName, value = null, options = {}) {
        this.SendMessage(methodName, value, options);
        
        for (const childTransform of this._transform._children) {
            childTransform.gameObject.BroadcastMessage(methodName, value, options);
        }
    }

    SendMessageUpwards(methodName, value = null, options = {}) {
        this.SendMessage(methodName, value, options);
        
        if (this._transform.parent) {
            this._transform.parent.gameObject.SendMessageUpwards(methodName, value, options);
        }
    }

    update(deltaTime) {
        if (!this._activeInHierarchy) return;
        
        if (this._mesh && this._transform.hasChanged) {
            this._mesh.position.set(
                this._transform.position.x,
                this._transform.position.y,
                this._transform.position.z
            );
            this._transform.hasChanged = false;
        }
        
        for (const comp of this._components) {
            if (comp.isActiveAndEnabled) {
                if (!comp._started) {
                    comp._callStart();
                }
                comp._callUpdate();
            }
        }
    }

    lateUpdate(deltaTime) {
        if (!this._activeInHierarchy) return;
        
        for (const comp of this._components) {
            if (comp.isActiveAndEnabled) {
                comp._callLateUpdate();
            }
        }
    }

    fixedUpdate() {
        if (!this._activeInHierarchy) return;
        
        for (const comp of this._components) {
            if (comp.isActiveAndEnabled) {
                comp._callFixedUpdate();
            }
        }
    }

    destroy() {
        if (this._isDestroyed) return;
        
        for (const comp of this._components) {
            comp._callOnDestroy();
        }
        
        super.destroy();
    }

    static CreatePrimitive(type, name) {
        const go = new GameObject(name || type);
        
        const meshFilter = go.AddComponent({
            componentType: 'MeshFilter',
            _allowMultiple: false
        });
        
        const meshRenderer = go.AddComponent({
            componentType: 'MeshRenderer',
            _allowMultiple: false
        });
        
        return go;
    }

    static Find(name) {
        console.warn('GameObject.Find is not implemented in this context');
        return null;
    }

    static FindWithTag(tag) {
        console.warn('GameObject.FindWithTag is not implemented in this context');
        return null;
    }

    static FindGameObjectsWithTag(tag) {
        console.warn('GameObject.FindGameObjectsWithTag is not implemented in this context');
        return [];
    }
}

export default { Transform, GameObject };
