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
    this.bounciness = options.bounciness || 0.5;
    this.friction = options.friction || 0.3;
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
    
    this.updateBounds();
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
    
    const normal = otherCenter.clone().sub(thisCenter).normalize();
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
    const boxMin = this._boundingBox.min;
    const boxMax = this._boundingBox.max;
    const sphereCenter = other._worldCenter;
    
    const closestPoint = new THREE.Vector3(
      Math.max(boxMin.x, Math.min(sphereCenter.x, boxMax.x)),
      Math.max(boxMin.y, Math.min(sphereCenter.y, boxMax.y)),
      Math.max(boxMin.z, Math.min(sphereCenter.z, boxMax.z))
    );
    
    const distance = closestPoint.distanceTo(sphereCenter);
    
    if (distance >= other.radius) {
      return null;
    }
    
    const normal = sphereCenter.clone().sub(closestPoint);
    if (normal.lengthSq() === 0) {
      normal.set(0, 1, 0);
    }
    normal.normalize();
    
    const overlap = other.radius - distance;
    
    return {
      thisCollider: this,
      otherCollider: other,
      normal: normal.negate(),
      overlap: overlap,
      contactPoint: closestPoint
    };
  }
  
  resolveCollision(other, info) {
    if (this.isTrigger || other.isTrigger) {
      return;
    }
    
    if (this.type === ColliderType.BOX && other.type === ColliderType.BOX) {
      this._resolveBoxBox(other, info);
    } else if (this.type === ColliderType.SPHERE && other.type === ColliderType.SPHERE) {
      this._resolveSphereSphere(other, info);
    } else if (this.type === ColliderType.BOX && other.type === ColliderType.SPHERE) {
      this._resolveBoxSphere(other, info);
    } else if (this.type === ColliderType.SPHERE && other.type === ColliderType.BOX) {
      other._resolveBoxSphere(this, {
        ...info,
        normal: info.normal.negate()
      });
    }
  }
  
  _resolveBoxBox(other, info) {
    const normal = info.normal;
    const overlap = info.overlap;
    
    if (!this.isStatic && !other.isStatic) {
      const totalMass = this.mass + other.mass;
      const thisRatio = other.mass / totalMass;
      const otherRatio = this.mass / totalMass;
      
      this.object.position.sub(normal.clone().multiplyScalar(overlap * thisRatio));
      other.object.position.add(normal.clone().multiplyScalar(overlap * otherRatio));
      
      const relativeVelocity = this.velocity.clone().sub(other.velocity);
      const normalVelocity = relativeVelocity.dot(normal);
      
      if (normalVelocity > 0) {
        const restitution = Math.max(this.bounciness, other.bounciness);
        const impulse = -(1 + restitution) * normalVelocity * this.mass * other.mass / totalMass;
        
        this.velocity.add(normal.clone().multiplyScalar(impulse / this.mass));
        other.velocity.add(normal.clone().multiplyScalar(-impulse / other.mass));
        
        const friction = Math.min(this.friction, other.friction);
        if (friction > 0) {
          const tangent = relativeVelocity.clone().sub(normal.clone().multiplyScalar(normalVelocity));
          const tangentSpeed = tangent.length();
          
          if (tangentSpeed > 0.001) {
            tangent.normalize();
            const frictionImpulse = -friction * Math.abs(impulse);
            
            this.velocity.add(tangent.clone().multiplyScalar(frictionImpulse / this.mass));
            other.velocity.add(tangent.clone().multiplyScalar(-frictionImpulse / other.mass));
          }
        }
      }
    } else if (!this.isStatic) {
      this.object.position.sub(normal.clone().multiplyScalar(overlap));
      
      const normalVelocity = this.velocity.dot(normal);
      
      if (normalVelocity > 0) {
        const restitution = Math.max(this.bounciness, other.bounciness);
        const newNormalVelocity = -restitution * normalVelocity;
        
        const tangent = this.velocity.clone().sub(normal.clone().multiplyScalar(normalVelocity));
        tangent.multiplyScalar(1 - Math.min(this.friction, other.friction));
        
        this.velocity.copy(tangent.add(normal.clone().multiplyScalar(newNormalVelocity)));
      }
    } else if (!other.isStatic) {
      other.object.position.add(normal.clone().multiplyScalar(overlap));
      
      const normalVelocity = other.velocity.dot(normal.clone().negate());
      
      if (normalVelocity > 0) {
        const restitution = Math.max(this.bounciness, other.bounciness);
        const newNormalVelocity = -restitution * normalVelocity;
        
        const tangent = other.velocity.clone().sub(normal.clone().negate().multiplyScalar(normalVelocity));
        tangent.multiplyScalar(1 - Math.min(this.friction, other.friction));
        
        other.velocity.copy(tangent.add(normal.clone().negate().multiplyScalar(newNormalVelocity)));
      }
    }
  }
  
  _resolveSphereSphere(other, info) {
    const direction = info.normal;
    const overlap = info.overlap;
    
    if (!this.isStatic && !other.isStatic) {
      const totalMass = this.mass + other.mass;
      const thisRatio = other.mass / totalMass;
      const otherRatio = this.mass / totalMass;
      
      this.object.position.sub(direction.clone().multiplyScalar(overlap * thisRatio));
      other.object.position.add(direction.clone().multiplyScalar(overlap * otherRatio));
      
      const relativeVelocity = this.velocity.clone().sub(other.velocity);
      const normalVelocity = relativeVelocity.dot(direction);
      
      if (normalVelocity > 0) {
        const restitution = Math.max(this.bounciness, other.bounciness);
        const impulse = -(1 + restitution) * normalVelocity * this.mass * other.mass / totalMass;
        
        this.velocity.add(direction.clone().multiplyScalar(impulse / this.mass));
        other.velocity.add(direction.clone().multiplyScalar(-impulse / other.mass));
      }
    } else if (!this.isStatic) {
      this.object.position.sub(direction.clone().multiplyScalar(overlap));
      
      const normalVelocity = this.velocity.dot(direction);
      
      if (normalVelocity > 0) {
        const restitution = Math.max(this.bounciness, other.bounciness);
        const newNormalVelocity = -restitution * normalVelocity;
        
        const tangent = this.velocity.clone().sub(direction.clone().multiplyScalar(normalVelocity));
        tangent.multiplyScalar(1 - Math.min(this.friction, other.friction));
        
        this.velocity.copy(tangent.add(direction.clone().multiplyScalar(newNormalVelocity)));
      }
    } else if (!other.isStatic) {
      other.object.position.add(direction.clone().multiplyScalar(overlap));
      
      const normalVelocity = other.velocity.dot(direction.clone().negate());
      
      if (normalVelocity > 0) {
        const restitution = Math.max(this.bounciness, other.bounciness);
        const newNormalVelocity = -restitution * normalVelocity;
        
        const tangent = other.velocity.clone().sub(direction.clone().negate().multiplyScalar(normalVelocity));
        tangent.multiplyScalar(1 - Math.min(this.friction, other.friction));
        
        other.velocity.copy(tangent.add(direction.clone().negate().multiplyScalar(newNormalVelocity)));
      }
    }
  }
  
  _resolveBoxSphere(other, info) {
    this._resolveBoxBox(other, info);
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
      bounciness: options.bounciness || 0.5,
      friction: options.friction || 0.3
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
    dt = Math.min(dt, 0.016);
    
    for (const collider of this.colliders) {
      collider.updateBounds();
    }
    
    for (const collider of this.colliders) {
      if (!collider.isStatic && collider.object) {
        if (collider.useGravity) {
          collider.velocity.add(this.gravity.clone().multiplyScalar(dt));
        }
        
        collider.object.position.add(collider.velocity.clone().multiplyScalar(dt));
        
        collider.object.updateMatrixWorld();
        collider.updateBounds();
      }
    }
    
    this._collisionPairsLastFrame = new Set(this._collisionPairsThisFrame);
    this._collisionPairsThisFrame = new Set();
    
    this.checkCollisions();
    
    if (this._debugMode) {
      this._updateDebugMeshes();
    }
  }
  
  checkCollisions() {
    for (let i = 0; i < this.colliders.length; i++) {
      for (let j = i + 1; j < this.colliders.length; j++) {
        const a = this.colliders[i];
        const b = this.colliders[j];
        
        if (a.isStatic && b.isStatic) continue;
        
        const info = a.getCollisionInfo(b);
        
        if (info) {
          const pairId = `${this.colliders.indexOf(a)}-${this.colliders.indexOf(b)}`;
          this._collisionPairsThisFrame.add(pairId);
          
          this._triggerCollisionEvents(a, b, pairId);
          
          if (!a.isTrigger && !b.isTrigger) {
            a.resolveCollision(b, info);
          }
        }
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
  
  clear() {
    this.colliders = [];
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
    bounciness: options.bounciness || 0.5,
    friction: options.friction || 0.3
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
    bounciness: options.bounciness || 0.5,
    friction: options.friction || 0.3
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
    bounciness: options.bounciness || 0.5,
    friction: options.friction || 0.3
  });
}
