import * as THREE from 'three';

export const ColliderType = {
  BOX: 'box',
  SPHERE: 'sphere',
  CAPSULE: 'capsule'
};

export class Collider {
  constructor(options = {}) {
    this.type = options.type || ColliderType.BOX;
    this.object = options.object || null;
    this.isStatic = options.isStatic || false;
    this.isTrigger = options.isTrigger || false;
    
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.mass = options.mass || 1;
    this.bounciness = options.bounciness || 0.3;
    this.friction = options.friction || 0.5;
    this.useGravity = options.useGravity !== false;
    
    if (this.type === ColliderType.BOX) {
      this.size = options.size || new THREE.Vector3(1, 1, 1);
      this.center = options.center || new THREE.Vector3(0, 0, 0);
      this._boundingBox = new THREE.Box3();
    } else if (this.type === ColliderType.SPHERE) {
      this.radius = options.radius || 0.5;
      this.center = options.center || new THREE.Vector3(0, 0, 0);
      this._boundingSphere = new THREE.Sphere();
    } else if (this.type === ColliderType.CAPSULE) {
      this.radius = options.radius || 0.5;
      this.height = options.height || 1;
      this.center = options.center || new THREE.Vector3(0, 0, 0);
    }
    
    this._worldCenter = new THREE.Vector3();
    this._isColliding = false;
    this._collidingWith = new Set();
    
    this.onCollisionEnter = null;
    this.onCollisionStay = null;
    this.onCollisionExit = null;
    
    this.onTriggerEnter = null;
    this.onTriggerStay = null;
    this.onTriggerExit = null;
    
    this._sleeping = false;
    this._sleepTimer = 0;
    
    this.updateBounds();
  }
  
  get isSleeping() {
    return this._sleeping;
  }
  
  set isSleeping(value) {
    this._sleeping = value;
    if (!value) {
      this._sleepTimer = 0;
    }
  }
  
  updateBounds() {
    if (!this.object) return;
    
    const worldMatrix = this.object.matrixWorld;
    this._worldCenter.copy(this.center).applyMatrix4(worldMatrix);
    
    if (this.type === ColliderType.BOX) {
      const min = new THREE.Vector3(
        this._worldCenter.x - this.size.x / 2,
        this._worldCenter.y - this.size.y / 2,
        this._worldCenter.z - this.size.z / 2
      );
      const max = new THREE.Vector3(
        this._worldCenter.x + this.size.x / 2,
        this._worldCenter.y + this.size.y / 2,
        this._worldCenter.z + this.size.z / 2
      );
      this._boundingBox.set(min, max);
    } else if (this.type === ColliderType.SPHERE) {
      this._boundingSphere.set(this._worldCenter.clone(), this.radius);
    }
  }
  
  getWorldCenter() {
    return this._worldCenter.clone();
  }
  
  intersects(other) {
    if (this.type === ColliderType.BOX && other.type === ColliderType.BOX) {
      return this._boundingBox.intersectsBox(other._boundingBox);
    } else if (this.type === ColliderType.SPHERE && other.type === ColliderType.SPHERE) {
      return this._boundingSphere.intersectsSphere(other._boundingSphere);
    } else if (this.type === ColliderType.BOX && other.type === ColliderType.SPHERE) {
      return this._boundingBox.intersectsSphere(other._boundingSphere);
    } else if (this.type === ColliderType.SPHERE && other.type === ColliderType.BOX) {
      return other._boundingBox.intersectsSphere(this._boundingSphere);
    }
    return false;
  }
  
  getCollisionInfo(other) {
    if (this.type === ColliderType.BOX && other.type === ColliderType.BOX) {
      return this._getBoxBoxCollisionInfo(other);
    } else if (this.type === ColliderType.SPHERE && other.type === ColliderType.SPHERE) {
      return this._getSphereSphereCollisionInfo(other);
    } else if (this.type === ColliderType.BOX && other.type === ColliderType.SPHERE) {
      return this._getBoxSphereCollisionInfo(other);
    } else if (this.type === ColliderType.SPHERE && other.type === ColliderType.BOX) {
      const info = other._getBoxSphereCollisionInfo(this);
      if (info) {
        info.normal = info.normal.negate();
        info.thisCollider = this;
        info.otherCollider = other;
      }
      return info;
    }
    return null;
  }
  
  _getBoxBoxCollisionInfo(other) {
    const thisCenter = this._worldCenter;
    const otherCenter = other._worldCenter;
    
    const dx = otherCenter.x - thisCenter.x;
    const dy = otherCenter.y - thisCenter.y;
    const dz = otherCenter.z - thisCenter.z;
    
    const overlapX = (this.size.x / 2 + other.size.x / 2) - Math.abs(dx);
    const overlapY = (this.size.y / 2 + other.size.y / 2) - Math.abs(dy);
    const overlapZ = (this.size.z / 2 + other.size.z / 2) - Math.abs(dz);
    
    if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) {
      return null;
    }
    
    let normal = new THREE.Vector3();
    let overlap = 0;
    
    if (overlapX <= overlapY && overlapX <= overlapZ) {
      overlap = overlapX;
      normal.x = dx > 0 ? 1 : -1;
    } else if (overlapY <= overlapX && overlapY <= overlapZ) {
      overlap = overlapY;
      normal.y = dy > 0 ? 1 : -1;
    } else {
      overlap = overlapZ;
      normal.z = dz > 0 ? 1 : -1;
    }
    
    return {
      thisCollider: this,
      otherCollider: other,
      normal: normal.normalize(),
      overlap: overlap,
      contactPoint: thisCenter.clone().add(normal.clone().multiplyScalar(overlap / 2))
    };
  }
  
  _getSphereSphereCollisionInfo(other) {
    const thisCenter = this._worldCenter;
    const otherCenter = other._worldCenter;
    
    const distance = thisCenter.distanceTo(otherCenter);
    const minDistance = this.radius + other.radius;
    
    if (distance >= minDistance) {
      return null;
    }
    
    const normal = distance > 0.0001 
      ? otherCenter.clone().sub(thisCenter).normalize()
      : new THREE.Vector3(0, 1, 0);
    const overlap = minDistance - distance;
    
    return {
      thisCollider: this,
      otherCollider: other,
      normal: normal,
      overlap: overlap,
      contactPoint: thisCenter.clone().add(normal.clone().multiplyScalar(this.radius))
    };
  }
  
  _getBoxSphereCollisionInfo(other) {
    const boxCenter = this._worldCenter;
    
    const boxMin = new THREE.Vector3(
      boxCenter.x - this.size.x / 2,
      boxCenter.y - this.size.y / 2,
      boxCenter.z - this.size.z / 2
    );
    const boxMax = new THREE.Vector3(
      boxCenter.x + this.size.x / 2,
      boxCenter.y + this.size.y / 2,
      boxCenter.z + this.size.z / 2
    );
    
    const sphereCenter = other._worldCenter;
    const sphereRadius = other.radius;
    
    let closestPoint = new THREE.Vector3(
      Math.max(boxMin.x, Math.min(sphereCenter.x, boxMax.x)),
      Math.max(boxMin.y, Math.min(sphereCenter.y, boxMax.y)),
      Math.max(boxMin.z, Math.min(sphereCenter.z, boxMax.z))
    );
    
    const isInside = sphereCenter.x >= boxMin.x && sphereCenter.x <= boxMax.x &&
                      sphereCenter.y >= boxMin.y && sphereCenter.y <= boxMax.y &&
                      sphereCenter.z >= boxMin.z && sphereCenter.z <= boxMax.z;
    
    if (isInside) {
      const distToMinX = sphereCenter.x - boxMin.x;
      const distToMaxX = boxMax.x - sphereCenter.x;
      const distToMinY = sphereCenter.y - boxMin.y;
      const distToMaxY = boxMax.y - sphereCenter.y;
      const distToMinZ = sphereCenter.z - boxMin.z;
      const distToMaxZ = boxMax.z - sphereCenter.z;
      
      let minDist = Math.min(distToMinX, distToMaxX, distToMinY, distToMaxY, distToMinZ, distToMaxZ);
      let normal = new THREE.Vector3();
      
      if (minDist === distToMinY) {
        closestPoint.set(sphereCenter.x, boxMin.y, sphereCenter.z);
        normal.set(0, -1, 0);
      } else if (minDist === distToMaxY) {
        closestPoint.set(sphereCenter.x, boxMax.y, sphereCenter.z);
        normal.set(0, 1, 0);
      } else if (minDist === distToMinX) {
        closestPoint.set(boxMin.x, sphereCenter.y, sphereCenter.z);
        normal.set(-1, 0, 0);
      } else if (minDist === distToMaxX) {
        closestPoint.set(boxMax.x, sphereCenter.y, sphereCenter.z);
        normal.set(1, 0, 0);
      } else if (minDist === distToMinZ) {
        closestPoint.set(sphereCenter.x, sphereCenter.y, boxMin.z);
        normal.set(0, 0, -1);
      } else {
        closestPoint.set(sphereCenter.x, sphereCenter.y, boxMax.z);
        normal.set(0, 0, 1);
      }
      
      const distance = minDist;
      const overlap = sphereRadius + distance;
      
      return {
        thisCollider: this,
        otherCollider: other,
        normal: normal,
        overlap: overlap,
        contactPoint: closestPoint.clone()
      };
    }
    
    const distanceSq = closestPoint.distanceToSquared(sphereCenter);
    
    if (distanceSq >= sphereRadius * sphereRadius) {
      return null;
    }
    
    const distance = Math.sqrt(distanceSq);
    const normal = distance > 0.0001
      ? sphereCenter.clone().sub(closestPoint).normalize()
      : new THREE.Vector3(0, 1, 0);
    
    const overlap = sphereRadius - distance;
    
    return {
      thisCollider: this,
      otherCollider: other,
      normal: normal,
      overlap: overlap,
      contactPoint: closestPoint
    };
  }
}

export class CollisionManager {
  constructor() {
    this.colliders = [];
    this._objectToCollider = new Map();
    this.gravity = new THREE.Vector3(0, -9.8, 0);
    this._collisionPairsThisFrame = new Set();
    this._collisionPairsLastFrame = new Set();
    this._debugMode = false;
    this._debugMeshes = [];
    this._scene = null;
    this.onCollision = null;
    
    this.maxSubSteps = 4;
    this.maxIterations = 4;
    this.sleepThreshold = 0.05;
    this.sleepTimeThreshold = 0.3;
    this.contactOffset = 0.001;
    this.minVelocityForBounce = 1.0;
  }
  
  addCollider(object, options = {}) {
    if (this._objectToCollider.has(object)) {
      return this._objectToCollider.get(object);
    }
    
    const colliderOptions = {
      object: object,
      type: options.type || ColliderType.BOX,
      isStatic: options.isStatic || false,
      isTrigger: options.isTrigger || false,
      mass: options.mass || 1,
      bounciness: options.bounciness || 0.3,
      friction: options.friction || 0.5
    };
    
    if (colliderOptions.type === ColliderType.BOX) {
      colliderOptions.size = options.size || new THREE.Vector3(1, 1, 1);
      colliderOptions.center = options.center || new THREE.Vector3(0, 0, 0);
    } else if (colliderOptions.type === ColliderType.SPHERE) {
      colliderOptions.radius = options.radius || 0.5;
      colliderOptions.center = options.center || new THREE.Vector3(0, 0, 0);
    } else if (colliderOptions.type === ColliderType.CAPSULE) {
      colliderOptions.radius = options.radius || 0.5;
      colliderOptions.height = options.height || 1;
      colliderOptions.center = options.center || new THREE.Vector3(0, 0, 0);
    }
    
    const collider = new Collider(colliderOptions);
    this.colliders.push(collider);
    this._objectToCollider.set(object, collider);
    
    if (this._debugMode && this._scene) {
      this._createDebugMesh(collider);
    }
    
    return collider;
  }
  
  getCollider(object) {
    return this._objectToCollider.get(object) || null;
  }
  
  removeCollider(object) {
    const collider = this._objectToCollider.get(object);
    if (collider) {
      const index = this.colliders.indexOf(collider);
      if (index >= 0) {
        this.colliders.splice(index, 1);
      }
      this._objectToCollider.delete(object);
      
      if (this._debugMode && this._scene) {
        this._removeDebugMesh(collider);
      }
    }
  }
  
  setDebugMode(enabled, scene = null) {
    this._debugMode = enabled;
    if (scene) {
      this._scene = scene;
    }
    
    if (enabled) {
      for (const collider of this.colliders) {
        this._createDebugMesh(collider);
      }
    } else {
      for (const mesh of this._debugMeshes) {
        if (this._scene) {
          this._scene.remove(mesh);
        }
      }
      this._debugMeshes = [];
    }
  }
  
  _createDebugMesh(collider) {
    if (!this._scene) return;
    
    let geometry, material;
    
    if (collider.type === ColliderType.BOX) {
      geometry = new THREE.BoxGeometry(collider.size.x, collider.size.y, collider.size.z);
      material = new THREE.MeshBasicMaterial({
        color: collider.isTrigger ? 0x00ffff : 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.5
      });
    } else if (collider.type === ColliderType.SPHERE) {
      geometry = new THREE.SphereGeometry(collider.radius, 16, 16);
      material = new THREE.MeshBasicMaterial({
        color: collider.isTrigger ? 0x00ffff : 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.5
      });
    } else {
      return;
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh._collider = collider;
    this._scene.add(mesh);
    this._debugMeshes.push(mesh);
  }
  
  _removeDebugMesh(collider) {
    const index = this._debugMeshes.findIndex(m => m._collider === collider);
    if (index >= 0) {
      const mesh = this._debugMeshes[index];
      if (this._scene) {
        this._scene.remove(mesh);
      }
      this._debugMeshes.splice(index, 1);
    }
  }
  
  _updateDebugMeshes() {
    for (const mesh of this._debugMeshes) {
      const collider = mesh._collider;
      if (collider && collider.object) {
        mesh.position.copy(collider.getWorldCenter());
      }
    }
  }
  
  update(dt) {
    const maxDt = 1 / 60;
    dt = Math.min(dt, maxDt * this.maxSubSteps);
    
    let remainingTime = dt;
    let subSteps = 0;
    
    while (remainingTime > 0.0001 && subSteps < this.maxSubSteps) {
      const subDt = Math.min(remainingTime, maxDt);
      this._subStep(subDt);
      remainingTime -= subDt;
      subSteps++;
    }
    
    if (this._debugMode) {
      this._updateDebugMeshes();
    }
  }
  
  _subStep(dt) {
    for (const collider of this.colliders) {
      if (collider.isStatic || !collider.object) continue;
      
      if (collider.isSleeping) continue;
      
      const speedSq = collider.velocity.lengthSq();
      if (speedSq < this.sleepThreshold * this.sleepThreshold) {
        collider._sleepTimer += dt;
        if (collider._sleepTimer >= this.sleepTimeThreshold) {
          collider.isSleeping = true;
          collider.velocity.set(0, 0, 0);
          continue;
        }
      } else {
        collider._sleepTimer = 0;
      }
      
      if (collider.useGravity) {
        collider.velocity.add(this.gravity.clone().multiplyScalar(dt));
      }
      
      collider.object.position.add(collider.velocity.clone().multiplyScalar(dt));
      collider.object.updateMatrixWorld();
      collider.updateBounds();
    }
    
    this._collisionPairsLastFrame = new Set(this._collisionPairsThisFrame);
    this._collisionPairsThisFrame = new Set();
    
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      this._resolveCollisions();
    }
    
    for (const collider of this.colliders) {
      if (!collider.isStatic && collider.object) {
        collider.object.updateMatrixWorld();
        collider.updateBounds();
      }
    }
    
    for (const pairId of this._collisionPairsLastFrame) {
      if (!this._collisionPairsThisFrame.has(pairId)) {
        const [aIndex, bIndex] = pairId.split('-').map(Number);
        const a = this.colliders[aIndex];
        const b = this.colliders[bIndex];
        
        if (a && b) {
          if (a.onCollisionExit && !a.isTrigger && !b.isTrigger) {
            a.onCollisionExit(b);
          }
          if (b.onCollisionExit && !a.isTrigger && !b.isTrigger) {
            b.onCollisionExit(a);
          }
          
          if (a.isTrigger || b.isTrigger) {
            if (a.onTriggerExit) a.onTriggerExit(b);
            if (b.onTriggerExit) b.onTriggerExit(a);
          }
        }
      }
    }
  }
  
  _resolveCollisions() {
    const collisions = [];
    
    for (let i = 0; i < this.colliders.length; i++) {
      for (let j = i + 1; j < this.colliders.length; j++) {
        const a = this.colliders[i];
        const b = this.colliders[j];
        
        if (a.isStatic && b.isStatic) continue;
        if (a.isSleeping && b.isSleeping && a.isStatic === b.isStatic) continue;
        
        a.updateBounds();
        b.updateBounds();
        
        const info = a.getCollisionInfo(b);
        
        if (info && info.overlap > 0) {
          const pairId = `${i}-${j}`;
          this._collisionPairsThisFrame.add(pairId);
          
          this._triggerCollisionEvents(a, b, pairId);
          
          if (!a.isTrigger && !b.isTrigger) {
            collisions.push({ a, b, info, i, j });
          }
        }
      }
    }
    
    collisions.sort((c1, c2) => c2.info.overlap - c1.info.overlap);
    
    for (const collision of collisions) {
      this._applyCollisionResolution(collision.a, collision.b, collision.info);
    }
  }
  
  _triggerCollisionEvents(a, b, pairId) {
    const isNewCollision = !this._collisionPairsLastFrame.has(pairId);
    const eventType = isNewCollision ? 'enter' : 'stay';
    
    if (this.onCollision) {
      this.onCollision(eventType, a, b);
    }
    
    if (a.isTrigger || b.isTrigger) {
      if (isNewCollision) {
        if (a.onTriggerEnter) a.onTriggerEnter(b);
        if (b.onTriggerEnter) b.onTriggerEnter(a);
      } else {
        if (a.onTriggerStay) a.onTriggerStay(b);
        if (b.onTriggerStay) b.onTriggerStay(a);
      }
    } else {
      if (isNewCollision) {
        if (a.onCollisionEnter) a.onCollisionEnter(b);
        if (b.onCollisionEnter) b.onCollisionEnter(a);
      } else {
        if (a.onCollisionStay) a.onCollisionStay(b);
        if (b.onCollisionStay) b.onCollisionStay(a);
      }
    }
  }
  
  _applyCollisionResolution(a, b, info) {
    if (a.isTrigger || b.isTrigger) return;
    
    const normal = info.normal.clone();
    const overlap = info.overlap + this.contactOffset;
    
    if (!a.isStatic && a.object) a.isSleeping = false;
    if (!b.isStatic && b.object) b.isSleeping = false;
    
    if (!a.isStatic && !b.isStatic) {
      const totalMass = a.mass + b.mass;
      const thisRatio = b.mass / totalMass;
      const otherRatio = a.mass / totalMass;
      
      a.object.position.sub(normal.clone().multiplyScalar(overlap * thisRatio));
      b.object.position.add(normal.clone().multiplyScalar(overlap * otherRatio));
      
      const relativeVelocity = a.velocity.clone().sub(b.velocity);
      const normalVelocity = relativeVelocity.dot(normal);
      
      if (normalVelocity > 0.001) {
        const restitution = Math.min(a.bounciness, b.bounciness);
        const speed = Math.abs(normalVelocity);
        
        if (speed > this.minVelocityForBounce) {
          const impulse = -(1 + restitution) * normalVelocity * a.mass * b.mass / totalMass;
          
          a.velocity.add(normal.clone().multiplyScalar(impulse / a.mass));
          b.velocity.add(normal.clone().multiplyScalar(-impulse / b.mass));
        } else {
          a.velocity.sub(normal.clone().multiplyScalar(normalVelocity * thisRatio));
          b.velocity.add(normal.clone().multiplyScalar(normalVelocity * otherRatio));
        }
        
        const friction = Math.max(a.friction, b.friction);
        if (friction > 0) {
          const tangent = relativeVelocity.clone().sub(normal.clone().multiplyScalar(normalVelocity));
          const tangentSpeed = tangent.length();
          
          if (tangentSpeed > 0.001) {
            tangent.normalize();
            
            const normalImpulse = Math.abs(normalVelocity) * a.mass * b.mass / totalMass;
            const frictionImpulse = -friction * Math.min(tangentSpeed, normalImpulse);
            
            a.velocity.add(tangent.clone().multiplyScalar(frictionImpulse / a.mass));
            b.velocity.add(tangent.clone().multiplyScalar(-frictionImpulse / b.mass));
          }
        }
      }
    } else if (!a.isStatic && a.object) {
      a.object.position.sub(normal.clone().multiplyScalar(overlap));
      
      const normalVelocity = a.velocity.dot(normal);
      
      if (normalVelocity > 0.001) {
        const restitution = Math.min(a.bounciness, b.bounciness);
        const speed = Math.abs(normalVelocity);
        
        if (speed > this.minVelocityForBounce) {
          const newNormalVelocity = -restitution * normalVelocity;
          
          const tangent = a.velocity.clone().sub(normal.clone().multiplyScalar(normalVelocity));
          tangent.multiplyScalar(1 - Math.max(a.friction, b.friction));
          
          a.velocity.copy(tangent.add(normal.clone().multiplyScalar(newNormalVelocity)));
        } else {
          a.velocity.sub(normal.clone().multiplyScalar(normalVelocity));
          
          const tangent = a.velocity.clone();
          tangent.multiplyScalar(1 - Math.max(a.friction, b.friction));
          
          a.velocity.copy(tangent);
        }
      } else if (normalVelocity >= 0) {
        a.velocity.sub(normal.clone().multiplyScalar(normalVelocity));
        
        const friction = Math.max(a.friction, b.friction);
        if (friction > 0) {
          a.velocity.multiplyScalar(1 - friction * 0.5);
        }
      }
    } else if (!b.isStatic && b.object) {
      const negNormal = normal.clone().negate();
      b.object.position.add(normal.clone().multiplyScalar(overlap));
      
      const normalVelocity = b.velocity.dot(negNormal);
      
      if (normalVelocity > 0.001) {
        const restitution = Math.min(a.bounciness, b.bounciness);
        const speed = Math.abs(normalVelocity);
        
        if (speed > this.minVelocityForBounce) {
          const newNormalVelocity = -restitution * normalVelocity;
          
          const tangent = b.velocity.clone().sub(negNormal.clone().multiplyScalar(normalVelocity));
          tangent.multiplyScalar(1 - Math.max(a.friction, b.friction));
          
          b.velocity.copy(tangent.add(negNormal.clone().multiplyScalar(newNormalVelocity)));
        } else {
          b.velocity.sub(negNormal.clone().multiplyScalar(normalVelocity));
          
          const tangent = b.velocity.clone();
          tangent.multiplyScalar(1 - Math.max(a.friction, b.friction));
          
          b.velocity.copy(tangent);
        }
      } else if (normalVelocity >= 0) {
        b.velocity.sub(negNormal.clone().multiplyScalar(normalVelocity));
        
        const friction = Math.max(a.friction, b.friction);
        if (friction > 0) {
          b.velocity.multiplyScalar(1 - friction * 0.5);
        }
      }
    }
    
    if (a.object) a.object.updateMatrixWorld();
    if (b.object) b.object.updateMatrixWorld();
    a.updateBounds();
    b.updateBounds();
  }
  
  clear() {
    this.colliders = [];
    this._objectToCollider.clear();
    this._collisionPairsThisFrame.clear();
    this._collisionPairsLastFrame.clear();
  }
}

export function createBoxCollider(object, options = {}) {
  return new Collider({
    type: ColliderType.BOX,
    object: object,
    size: options.size || new THREE.Vector3(1, 1, 1),
    center: options.center || new THREE.Vector3(0, 0, 0),
    isStatic: options.isStatic || false,
    isTrigger: options.isTrigger || false,
    mass: options.mass || 1,
    bounciness: options.bounciness || 0.3,
    friction: options.friction || 0.5
  });
}

export function createSphereCollider(object, options = {}) {
  return new Collider({
    type: ColliderType.SPHERE,
    object: object,
    radius: options.radius || 0.5,
    center: options.center || new THREE.Vector3(0, 0, 0),
    isStatic: options.isStatic || false,
    isTrigger: options.isTrigger || false,
    mass: options.mass || 1,
    bounciness: options.bounciness || 0.3,
    friction: options.friction || 0.5
  });
}

export function createCapsuleCollider(object, options = {}) {
  return new Collider({
    type: ColliderType.CAPSULE,
    object: object,
    radius: options.radius || 0.5,
    height: options.height || 1,
    center: options.center || new THREE.Vector3(0, 0, 0),
    isStatic: options.isStatic || false,
    isTrigger: options.isTrigger || false,
    mass: options.mass || 1,
    bounciness: options.bounciness || 0.3,
    friction: options.friction || 0.5
  });
}
