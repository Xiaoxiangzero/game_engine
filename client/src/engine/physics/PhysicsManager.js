/**
 * Mini Game Engine - Physics Manager
 * 物理管理器，集成Cannon.js物理引擎
 */

import * as CANNON from 'cannon-es';
import { Object } from '../core/Object.js';
import { Events, EventTypes } from '../events/EventManager.js';
import { Time } from '../core/Time.js';

export class PhysicsMaterial {
    constructor(friction = 0.3, restitution = 0.3) {
        this._friction = friction;
        this._restitution = restitution;
        this._cannonMaterial = new CANNON.Material();
        this._cannonMaterial.friction = friction;
        this._cannonMaterial.restitution = restitution;
    }

    get friction() { return this._friction; }
    set friction(value) {
        this._friction = value;
        this._cannonMaterial.friction = value;
    }

    get restitution() { return this._restitution; }
    set restitution(value) {
        this._restitution = value;
        this._cannonMaterial.restitution = value;
    }

    get cannonMaterial() { return this._cannonMaterial; }

    clone() {
        return new PhysicsMaterial(this._friction, this._restitution);
    }

    static get defaultMaterial() {
        if (!PhysicsMaterial._default) {
            PhysicsMaterial._default = new PhysicsMaterial(0.3, 0.3);
        }
        return PhysicsMaterial._default;
    }

    static get ice() { return new PhysicsMaterial(0.02, 0.1); }
    static get rubber() { return new PhysicsMaterial(0.9, 0.8); }
    static get metal() { return new PhysicsMaterial(0.4, 0.6); }
    static get wood() { return new PhysicsMaterial(0.6, 0.2); }
    static get concrete() { return new PhysicsMaterial(0.8, 0.1); }
}

export class ContactMaterial {
    constructor(materialA, materialB, friction = 0.3, restitution = 0.3) {
        this._materialA = materialA;
        this._materialB = materialB;
        this._friction = friction;
        this._restitution = restitution;
        
        this._cannonContactMaterial = new CANNON.ContactMaterial(
            materialA.cannonMaterial,
            materialB.cannonMaterial,
            {
                friction: friction,
                restitution: restitution,
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 3
            }
        );
    }

    get materialA() { return this._materialA; }
    get materialB() { return this._materialB; }
    get cannonContactMaterial() { return this._cannonContactMaterial; }

    get friction() { return this._friction; }
    set friction(value) {
        this._friction = value;
        this._cannonContactMaterial.friction = value;
    }

    get restitution() { return this._restitution; }
    set restitution(value) {
        this._restitution = value;
        this._cannonContactMaterial.restitution = value;
    }
}

export class PhysicsCollision {
    constructor(bodyA, bodyB, contactPoint, contactNormal, impulse = 0) {
        this._bodyA = bodyA;
        this._bodyB = bodyB;
        this._contactPoint = contactPoint ? { ...contactPoint } : { x: 0, y: 0, z: 0 };
        this._contactNormal = contactNormal ? { ...contactNormal } : { x: 0, y: 1, z: 0 };
        this._impulse = impulse;
        this._relativeVelocity = { x: 0, y: 0, z: 0 };
    }

    get bodyA() { return this._bodyA; }
    get bodyB() { return this._bodyB; }
    get contactPoint() { return this._contactPoint; }
    get contactNormal() { return this._contactNormal; }
    get impulse() { return this._impulse; }
    get relativeVelocity() { return this._relativeVelocity; }

    getGameObjectA() {
        return this._bodyA ? this._bodyA.gameObject : null;
    }

    getGameObjectB() {
        return this._bodyB ? this._bodyB.gameObject : null;
    }

    getOtherGameObject(gameObject) {
        const objA = this.getGameObjectA();
        const objB = this.getGameObjectB();
        return objA === gameObject ? objB : objA;
    }
}

export class PhysicsManager extends Object {
    static _instance = null;

    static get instance() {
        if (!this._instance) {
            this._instance = new PhysicsManager();
        }
        return this._instance;
    }

    constructor() {
        super();
        this._world = new CANNON.World();
        this._world.gravity.set(0, -9.82, 0);
        this._world.broadphase = new CANNON.NaiveBroadphase();
        this._world.solver.iterations = 10;
        this._world.solver.tolerance = 0.001;
        
        this._defaultMaterial = new CANNON.Material();
        this._defaultContactMaterial = new CANNON.ContactMaterial(
            this._defaultMaterial,
            this._defaultMaterial,
            {
                friction: 0.3,
                restitution: 0.3
            }
        );
        this._world.addContactMaterial(this._defaultContactMaterial);
        
        this._rigidbodies = new Set();
        this._colliders = new Set();
        this._contactMaterials = new Set();
        
        this._isSimulating = false;
        this._fixedTimeStep = 1 / 60;
        this._maxSubSteps = 3;
        this._timeAccumulator = 0;
        
        this._collisionEnterEvents = [];
        this._collisionStayEvents = [];
        this._collisionExitEvents = [];
        this._triggerEnterEvents = [];
        this._triggerStayEvents = [];
        this._triggerExitEvents = [];
        
        this._previousCollisions = new Map();
        this._currentCollisions = new Map();
        
        this._setupCollisionListeners();
    }

    get world() { return this._world; }
    get isSimulating() { return this._isSimulating; }
    get rigidbodies() { return Array.from(this._rigidbodies); }
    get colliders() { return Array.from(this._colliders); }

    get gravity() {
        return {
            x: this._world.gravity.x,
            y: this._world.gravity.y,
            z: this._world.gravity.z
        };
    }

    set gravity(value) {
        this._world.gravity.set(value.x, value.y, value.z);
    }

    get fixedTimeStep() { return this._fixedTimeStep; }
    set fixedTimeStep(value) { this._fixedTimeStep = Math.max(0.001, value); }

    get maxSubSteps() { return this._maxSubSteps; }
    set maxSubSteps(value) { this._maxSubSteps = Math.max(1, value); }

    _setupCollisionListeners() {
        this._world.addEventListener('beginContact', (event) => {
            this._handleBeginContact(event);
        });

        this._world.addEventListener('endContact', (event) => {
            this._handleEndContact(event);
        });

        this._world.addEventListener('preSolve', (event) => {
        });

        this._world.addEventListener('postSolve', (event) => {
        });
    }

    _handleBeginContact(event) {
        const bodyA = event.bodyA;
        const bodyB = event.bodyB;
        
        const key = this._getCollisionKey(bodyA, bodyB);
        
        if (event.contact && event.contact.getImpactVelocityAlongNormal) {
            const impulse = event.contact.getImpactVelocityAlongNormal();
            
            const contactPoint = event.contact.bi ? 
                { x: event.contact.bi.x, y: event.contact.bi.y, z: event.contact.bi.z } :
                { x: 0, y: 0, z: 0 };
            
            const contactNormal = event.contact.ni ?
                { x: event.contact.ni.x, y: event.contact.ni.y, z: event.contact.ni.z } :
                { x: 0, y: 1, z: 0 };
            
            const collision = new PhysicsCollision(
                bodyA.userData ? bodyA.userData.rigidbody : null,
                bodyB.userData ? bodyB.userData.rigidbody : null,
                contactPoint,
                contactNormal,
                impulse
            );
            
            const isTriggerA = bodyA.userData && bodyA.userData.isTrigger;
            const isTriggerB = bodyB.userData && bodyB.userData.isTrigger;
            
            if (isTriggerA || isTriggerB) {
                this._triggerEnterEvents.push({
                    key,
                    bodyA,
                    bodyB,
                    collision
                });
            } else {
                this._collisionEnterEvents.push({
                    key,
                    bodyA,
                    bodyB,
                    collision
                });
            }
            
            this._currentCollisions.set(key, {
                bodyA,
                bodyB,
                collision,
                isTrigger: isTriggerA || isTriggerB
            });
        }
    }

    _handleEndContact(event) {
        const bodyA = event.bodyA;
        const bodyB = event.bodyB;
        const key = this._getCollisionKey(bodyA, bodyB);
        
        const previous = this._previousCollisions.get(key);
        if (previous) {
            if (previous.isTrigger) {
                this._triggerExitEvents.push({
                    key,
                    bodyA,
                    bodyB,
                    collision: previous.collision
                });
            } else {
                this._collisionExitEvents.push({
                    key,
                    bodyA,
                    bodyB,
                    collision: previous.collision
                });
            }
            this._previousCollisions.delete(key);
        }
    }

    _getCollisionKey(bodyA, bodyB) {
        const idA = bodyA.id || bodyA.userData?.id;
        const idB = bodyB.id || bodyB.userData?.id;
        return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
    }

    addRigidbody(rigidbody) {
        if (!rigidbody || !rigidbody.cannonBody) return;
        
        this._rigidbodies.add(rigidbody);
        this._world.addBody(rigidbody.cannonBody);
    }

    removeRigidbody(rigidbody) {
        if (!rigidbody || !rigidbody.cannonBody) return;
        
        this._rigidbodies.delete(rigidbody);
        this._world.removeBody(rigidbody.cannonBody);
    }

    addCollider(collider) {
        if (!collider) return;
        this._colliders.add(collider);
    }

    removeCollider(collider) {
        if (!collider) return;
        this._colliders.delete(collider);
    }

    addContactMaterial(contactMaterial) {
        if (!contactMaterial || !contactMaterial.cannonContactMaterial) return;
        
        this._contactMaterials.add(contactMaterial);
        this._world.addContactMaterial(contactMaterial.cannonContactMaterial);
    }

    removeContactMaterial(contactMaterial) {
        if (!contactMaterial || !contactMaterial.cannonContactMaterial) return;
        
        this._contactMaterials.delete(contactMaterial);
    }

    step(deltaTime) {
        Events.broadcast({
            type: EventTypes.PHYSICS_SIMULATE_START,
            data: { deltaTime }
        });

        this._timeAccumulator += deltaTime;
        
        while (this._timeAccumulator >= this._fixedTimeStep) {
            this._isSimulating = true;
            this._world.step(this._fixedTimeStep);
            this._timeAccumulator -= this._fixedTimeStep;
            
            this._processCollisionEvents();
            this._previousCollisions = new Map(this._currentCollisions);
            this._currentCollisions.clear();
        }
        
        this._isSimulating = false;
        
        Events.broadcast({
            type: EventTypes.PHYSICS_SIMULATE_END,
            data: {}
        });
    }

    _processCollisionEvents() {
        for (const event of this._collisionEnterEvents) {
            const rbA = event.bodyA.userData?.rigidbody;
            const rbB = event.bodyB.userData?.rigidbody;
            
            if (rbA && rbA.gameObject) {
                Events.broadcast({
                    type: EventTypes.COLLISION_ENTER,
                    data: {
                        gameObject: rbA.gameObject,
                        collision: event.collision,
                        other: rbB?.gameObject
                    },
                    sender: rbA.gameObject
                });
            }
            
            if (rbB && rbB.gameObject) {
                Events.broadcast({
                    type: EventTypes.COLLISION_ENTER,
                    data: {
                        gameObject: rbB.gameObject,
                        collision: event.collision,
                        other: rbA?.gameObject
                    },
                    sender: rbB.gameObject
                });
            }
        }
        this._collisionEnterEvents = [];

        for (const [key, data] of this._currentCollisions) {
            if (!data.isTrigger) {
                const rbA = data.bodyA.userData?.rigidbody;
                const rbB = data.bodyB.userData?.rigidbody;
                
                if (rbA && rbA.gameObject) {
                    Events.broadcast({
                        type: EventTypes.COLLISION_STAY,
                        data: {
                            gameObject: rbA.gameObject,
                            collision: data.collision,
                            other: rbB?.gameObject
                        },
                        sender: rbA.gameObject
                    });
                }
                
                if (rbB && rbB.gameObject) {
                    Events.broadcast({
                        type: EventTypes.COLLISION_STAY,
                        data: {
                            gameObject: rbB.gameObject,
                            collision: data.collision,
                            other: rbA?.gameObject
                        },
                        sender: rbB.gameObject
                    });
                }
            }
        }

        for (const event of this._collisionExitEvents) {
            const rbA = event.bodyA.userData?.rigidbody;
            const rbB = event.bodyB.userData?.rigidbody;
            
            if (rbA && rbA.gameObject) {
                Events.broadcast({
                    type: EventTypes.COLLISION_EXIT,
                    data: {
                        gameObject: rbA.gameObject,
                        collision: event.collision,
                        other: rbB?.gameObject
                    },
                    sender: rbA.gameObject
                });
            }
            
            if (rbB && rbB.gameObject) {
                Events.broadcast({
                    type: EventTypes.COLLISION_EXIT,
                    data: {
                        gameObject: rbB.gameObject,
                        collision: event.collision,
                        other: rbA?.gameObject
                    },
                    sender: rbB.gameObject
                });
            }
        }
        this._collisionExitEvents = [];

        for (const event of this._triggerEnterEvents) {
            const rbA = event.bodyA.userData?.rigidbody;
            const rbB = event.bodyB.userData?.rigidbody;
            
            if (rbA && rbA.gameObject) {
                Events.broadcast({
                    type: EventTypes.TRIGGER_ENTER,
                    data: {
                        gameObject: rbA.gameObject,
                        other: rbB?.gameObject
                    },
                    sender: rbA.gameObject
                });
            }
            
            if (rbB && rbB.gameObject) {
                Events.broadcast({
                    type: EventTypes.TRIGGER_ENTER,
                    data: {
                        gameObject: rbB.gameObject,
                        other: rbA?.gameObject
                    },
                    sender: rbB.gameObject
                });
            }
        }
        this._triggerEnterEvents = [];

        for (const [key, data] of this._currentCollisions) {
            if (data.isTrigger) {
                const rbA = data.bodyA.userData?.rigidbody;
                const rbB = data.bodyB.userData?.rigidbody;
                
                if (rbA && rbA.gameObject) {
                    Events.broadcast({
                        type: EventTypes.TRIGGER_STAY,
                        data: {
                            gameObject: rbA.gameObject,
                            other: rbB?.gameObject
                        },
                        sender: rbA.gameObject
                    });
                }
                
                if (rbB && rbB.gameObject) {
                    Events.broadcast({
                        type: EventTypes.TRIGGER_STAY,
                        data: {
                            gameObject: rbB.gameObject,
                            other: rbA?.gameObject
                        },
                        sender: rbB.gameObject
                    });
                }
            }
        }

        for (const event of this._triggerExitEvents) {
            const rbA = event.bodyA.userData?.rigidbody;
            const rbB = event.bodyB.userData?.rigidbody;
            
            if (rbA && rbA.gameObject) {
                Events.broadcast({
                    type: EventTypes.TRIGGER_EXIT,
                    data: {
                        gameObject: rbA.gameObject,
                        other: rbB?.gameObject
                    },
                    sender: rbA.gameObject
                });
            }
            
            if (rbB && rbB.gameObject) {
                Events.broadcast({
                    type: EventTypes.TRIGGER_EXIT,
                    data: {
                        gameObject: rbB.gameObject,
                        other: rbA?.gameObject
                    },
                    sender: rbB.gameObject
                });
            }
        }
        this._triggerExitEvents = [];
    }

    raycast(origin, direction, maxDistance = 100, layerMask = -1) {
        const ray = new CANNON.Ray();
        ray.from.copy(origin);
        ray.to.copy({
            x: origin.x + direction.x * maxDistance,
            y: origin.y + direction.y * maxDistance,
            z: origin.z + direction.z * maxDistance
        });
        
        const result = new CANNON.RaycastResult();
        const hit = ray.intersectWorld(this._world, {
            mode: CANNON.Ray.CLOSEST,
            result: result,
            skipBackfaces: true
        });
        
        if (hit) {
            return {
                hasHit: true,
                point: { x: result.hitPointWorld.x, y: result.hitPointWorld.y, z: result.hitPointWorld.z },
                normal: { x: result.hitNormalWorld.x, y: result.hitNormalWorld.y, z: result.hitNormalWorld.z },
                distance: result.distance,
                body: result.body,
                rigidbody: result.body?.userData?.rigidbody,
                gameObject: result.body?.userData?.rigidbody?.gameObject
            };
        }
        
        return { hasHit: false };
    }

    raycastAll(origin, direction, maxDistance = 100, layerMask = -1) {
        const ray = new CANNON.Ray();
        ray.from.copy(origin);
        ray.to.copy({
            x: origin.x + direction.x * maxDistance,
            y: origin.y + direction.y * maxDistance,
            z: origin.z + direction.z * maxDistance
        });
        
        const results = [];
        const result = new CANNON.RaycastResult();
        
        ray.intersectWorld(this._world, {
            mode: CANNON.Ray.ALL,
            result: result,
            skipBackfaces: true,
            callback: (hitResult) => {
                results.push({
                    hasHit: true,
                    point: { x: hitResult.hitPointWorld.x, y: hitResult.hitPointWorld.y, z: hitResult.hitPointWorld.z },
                    normal: { x: hitResult.hitNormalWorld.x, y: hitResult.hitNormalWorld.y, z: hitResult.hitNormalWorld.z },
                    distance: hitResult.distance,
                    body: hitResult.body,
                    rigidbody: hitResult.body?.userData?.rigidbody,
                    gameObject: hitResult.body?.userData?.rigidbody?.gameObject
                });
            }
        });
        
        return results;
    }

    clear() {
        for (const rb of this._rigidbodies) {
            if (rb.cannonBody) {
                this._world.removeBody(rb.cannonBody);
            }
        }
        this._rigidbodies.clear();
        this._colliders.clear();
        this._timeAccumulator = 0;
    }

    static get default() {
        return PhysicsManager.instance;
    }
}

export default { PhysicsMaterial, ContactMaterial, PhysicsCollision, PhysicsManager };
