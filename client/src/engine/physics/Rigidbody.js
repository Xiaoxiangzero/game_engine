/**
 * Mini Game Engine - Rigidbody Component
 * 刚体组件，提供物理模拟功能
 */

import * as CANNON from 'cannon-es';
import { Object } from '../core/Object.js';
import { PhysicsManager } from './PhysicsManager.js';
import { Time } from '../core/Time.js';

export const RigidbodyType = {
    DYNAMIC: 'dynamic',
    STATIC: 'static',
    KINEMATIC: 'kinematic'
};

export class Rigidbody extends Object {
    static _componentType = 'Rigidbody';

    constructor(gameObject = null, options = {}) {
        super();
        this._gameObject = gameObject;
        this._cannonBody = null;
        this._colliders = [];
        this._isInWorld = false;
        
        this._mass = options.mass !== undefined ? options.mass : 1;
        this._type = options.type || RigidbodyType.DYNAMIC;
        this._useGravity = options.useGravity !== false;
        this._isKinematic = options.isKinematic || false;
        this._freezeRotation = options.freezeRotation || false;
        
        this._velocity = { x: 0, y: 0, z: 0 };
        this._angularVelocity = { x: 0, y: 0, z: 0 };
        this._centerOfMass = { x: 0, y: 0, z: 0 };
        
        this._drag = 0;
        this._angularDrag = 0.05;
        this._maxAngularVelocity = 7;
        
        this._sleepThreshold = 0.1;
        this._isSleeping = false;
        
        this._freezePositionX = false;
        this._freezePositionY = false;
        this._freezePositionZ = false;
        this._freezeRotationX = false;
        this._freezeRotationY = false;
        this._freezeRotationZ = false;
        
        this._initCannonBody();
    }

    get componentType() { return Rigidbody._componentType; }
    get gameObject() { return this._gameObject; }
    get cannonBody() { return this._cannonBody; }
    get colliders() { return [...this._colliders]; }
    get isInWorld() { return this._isInWorld; }

    get mass() { return this._mass; }
    set mass(value) {
        this._mass = Math.max(0, value);
        if (this._cannonBody) {
            this._cannonBody.mass = this._mass;
            this._cannonBody.updateMassProperties();
        }
    }

    get type() { return this._type; }
    set type(value) {
        this._type = value;
        if (this._cannonBody) {
            this._updateCannonBodyType();
        }
    }

    get useGravity() { return this._useGravity; }
    set useGravity(value) {
        this._useGravity = value;
        if (this._cannonBody) {
            this._cannonBody.gravityScale = value ? 1 : 0;
        }
    }

    get isKinematic() { return this._isKinematic; }
    set isKinematic(value) {
        this._isKinematic = value;
        if (this._cannonBody) {
            this._updateCannonBodyType();
        }
    }

    get freezeRotation() { return this._freezeRotation; }
    set freezeRotation(value) {
        this._freezeRotation = value;
        if (this._cannonBody) {
            this._cannonBody.angularDamping = value ? 1 : this._angularDrag;
        }
    }

    get velocity() {
        if (this._cannonBody) {
            return {
                x: this._cannonBody.velocity.x,
                y: this._cannonBody.velocity.y,
                z: this._cannonBody.velocity.z
            };
        }
        return { ...this._velocity };
    }
    set velocity(value) {
        this._velocity = { ...value };
        if (this._cannonBody) {
            this._cannonBody.velocity.set(value.x, value.y, value.z);
        }
    }

    get angularVelocity() {
        if (this._cannonBody) {
            return {
                x: this._cannonBody.angularVelocity.x,
                y: this._cannonBody.angularVelocity.y,
                z: this._cannonBody.angularVelocity.z
            };
        }
        return { ...this._angularVelocity };
    }
    set angularVelocity(value) {
        this._angularVelocity = { ...value };
        if (this._cannonBody) {
            this._cannonBody.angularVelocity.set(value.x, value.y, value.z);
        }
    }

    get drag() { return this._drag; }
    set drag(value) {
        this._drag = Math.max(0, value);
        if (this._cannonBody) {
            this._cannonBody.linearDamping = this._drag;
        }
    }

    get angularDrag() { return this._angularDrag; }
    set angularDrag(value) {
        this._angularDrag = Math.max(0, value);
        if (this._cannonBody && !this._freezeRotation) {
            this._cannonBody.angularDamping = this._angularDrag;
        }
    }

    get isSleeping() { return this._isSleeping; }
    get isAwake() { return !this._isSleeping; }

    _initCannonBody() {
        this._cannonBody = new CANNON.Body({
            mass: this._mass,
            linearDamping: this._drag,
            angularDamping: this._freezeRotation ? 1 : this._angularDrag
        });
        
        this._cannonBody.gravityScale = this._useGravity ? 1 : 0;
        this._cannonBody.sleepSpeedLimit = this._sleepThreshold;
        
        this._cannonBody.userData = {
            rigidbody: this,
            gameObject: this._gameObject
        };
        
        this._updateCannonBodyType();
        
        if (this._gameObject && this._gameObject.transform) {
            const transform = this._gameObject.transform;
            this._cannonBody.position.set(
                transform.position.x,
                transform.position.y,
                transform.position.z
            );
            this._cannonBody.quaternion.set(
                transform.rotation.x,
                transform.rotation.y,
                transform.rotation.z,
                transform.rotation.w
            );
        }
    }

    _updateCannonBodyType() {
        if (!this._cannonBody) return;
        
        if (this._isKinematic || this._type === RigidbodyType.KINEMATIC) {
            this._cannonBody.type = CANNON.Body.KINEMATIC;
        } else if (this._type === RigidbodyType.STATIC || this._mass === 0) {
            this._cannonBody.type = CANNON.Body.STATIC;
        } else {
            this._cannonBody.type = CANNON.Body.DYNAMIC;
        }
    }

    addCollider(collider) {
        if (!collider || this._colliders.includes(collider)) return;
        
        this._colliders.push(collider);
        
        if (collider.cannonShape && this._cannonBody) {
            const offset = collider.center || { x: 0, y: 0, z: 0 };
            const rotation = collider.rotationOffset || { x: 0, y: 0, z: 0, w: 1 };
            
            const cannonOffset = new CANNON.Vec3(offset.x, offset.y, offset.z);
            const cannonRotation = new CANNON.Quaternion(
                rotation.x, rotation.y, rotation.z, rotation.w
            );
            
            this._cannonBody.addShape(collider.cannonShape, cannonOffset, cannonRotation);
            
            if (!this._isInWorld && this._gameObject) {
                this.addToWorld();
            }
        }
    }

    removeCollider(collider) {
        const index = this._colliders.indexOf(collider);
        if (index === -1) return;
        
        this._colliders.splice(index, 1);
        
        if (collider.cannonShape && this._cannonBody) {
            const shapeIndex = this._cannonBody.shapes.indexOf(collider.cannonShape);
            if (shapeIndex > -1) {
                this._cannonBody.shapes.splice(shapeIndex, 1);
                this._cannonBody.shapeOffsets.splice(shapeIndex, 1);
                this._cannonBody.shapeOrientations.splice(shapeIndex, 1);
                this._cannonBody.updateMassProperties();
            }
        }
    }

    addToWorld() {
        if (this._isInWorld) return;
        if (!this._cannonBody) return;
        
        PhysicsManager.instance.addRigidbody(this);
        this._isInWorld = true;
    }

    removeFromWorld() {
        if (!this._isInWorld) return;
        
        PhysicsManager.instance.removeRigidbody(this);
        this._isInWorld = false;
    }

    addForce(force, point) {
        if (!this._cannonBody || this._isSleeping) return;
        
        const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
        
        if (point) {
            const cannonPoint = new CANNON.Vec3(point.x, point.y, point.z);
            this._cannonBody.applyForce(cannonForce, cannonPoint);
        } else {
            this._cannonBody.applyForce(cannonForce);
        }
        
        this.wakeUp();
    }

    addImpulse(impulse, point) {
        if (!this._cannonBody || this._isSleeping) return;
        
        const cannonImpulse = new CANNON.Vec3(impulse.x, impulse.y, impulse.z);
        
        if (point) {
            const cannonPoint = new CANNON.Vec3(point.x, point.y, point.z);
            this._cannonBody.applyImpulse(cannonImpulse, cannonPoint);
        } else {
            this._cannonBody.applyImpulse(cannonImpulse);
        }
        
        this.wakeUp();
    }

    addTorque(torque) {
        if (!this._cannonBody || this._isSleeping) return;
        
        const cannonTorque = new CANNON.Vec3(torque.x, torque.y, torque.z);
        this._cannonBody.applyTorque(cannonTorque);
        this.wakeUp();
    }

    addTorqueImpulse(torque) {
        if (!this._cannonBody || this._isSleeping) return;
        
        const cannonTorque = new CANNON.Vec3(torque.x, torque.y, torque.z);
        this._cannonBody.applyLocalTorque(cannonTorque);
        this.wakeUp();
    }

    movePosition(position) {
        if (!this._cannonBody) return;
        
        if (this._isKinematic || this._type === RigidbodyType.KINEMATIC) {
            this._cannonBody.position.set(position.x, position.y, position.z);
        } else {
            this.velocity = {
                x: (position.x - this._cannonBody.position.x) / Time.deltaTime,
                y: (position.y - this._cannonBody.position.y) / Time.deltaTime,
                z: (position.z - this._cannonBody.position.z) / Time.deltaTime
            };
        }
    }

    moveRotation(rotation) {
        if (!this._cannonBody) return;
        
        if (this._isKinematic || this._type === RigidbodyType.KINEMATIC) {
            this._cannonBody.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }
    }

    wakeUp() {
        if (this._cannonBody) {
            this._cannonBody.wakeUp();
        }
        this._isSleeping = false;
    }

    sleep() {
        if (this._cannonBody) {
            this._cannonBody.sleep();
        }
        this._isSleeping = true;
    }

    syncFromTransform() {
        if (!this._gameObject || !this._cannonBody) return;
        
        const transform = this._gameObject.transform;
        this._cannonBody.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z
        );
        this._cannonBody.quaternion.set(
            transform.rotation.x,
            transform.rotation.y,
            transform.rotation.z,
            transform.rotation.w
        );
    }

    syncToTransform() {
        if (!this._gameObject || !this._cannonBody) return;
        
        const transform = this._gameObject.transform;
        transform.position = {
            x: this._cannonBody.position.x,
            y: this._cannonBody.position.y,
            z: this._cannonBody.position.z
        };
        transform.rotation = {
            x: this._cannonBody.quaternion.x,
            y: this._cannonBody.quaternion.y,
            z: this._cannonBody.quaternion.z,
            w: this._cannonBody.quaternion.w
        };
    }

    setConstraints(freezePosition = {}, freezeRotation = {}) {
        this._freezePositionX = freezePosition.x || false;
        this._freezePositionY = freezePosition.y || false;
        this._freezePositionZ = freezePosition.z || false;
        this._freezeRotationX = freezeRotation.x || false;
        this._freezeRotationY = freezeRotation.y || false;
        this._freezeRotationZ = freezeRotation.z || false;
        
        if (this._cannonBody) {
            this._updateConstraints();
        }
    }

    _updateConstraints() {
        if (!this._cannonBody) return;
        
        const linearFactor = new CANNON.Vec3(
            this._freezePositionX ? 0 : 1,
            this._freezePositionY ? 0 : 1,
            this._freezePositionZ ? 0 : 1
        );
        
        const angularFactor = new CANNON.Vec3(
            this._freezeRotationX ? 0 : 1,
            this._freezeRotationY ? 0 : 1,
            this._freezeRotationZ ? 0 : 1
        );
        
        this._cannonBody.linearFactor = linearFactor;
        this._cannonBody.angularFactor = angularFactor;
    }

    destroy() {
        this.removeFromWorld();
        
        for (const collider of this._colliders) {
            collider.destroy();
        }
        this._colliders = [];
        
        this._cannonBody = null;
        this._gameObject = null;
        
        super.destroy();
    }
}

export default Rigidbody;
