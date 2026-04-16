/**
 * Mini Game Engine - Collider Components
 * 碰撞体组件，提供各种碰撞检测形状
 */

import * as CANNON from 'cannon-es';
import { Object } from '../core/Object.js';
import { PhysicsMaterial } from './PhysicsManager.js';

export const ColliderType = {
    BOX: 'box',
    SPHERE: 'sphere',
    CAPSULE: 'capsule',
    CYLINDER: 'cylinder',
    PLANE: 'plane',
    CONE: 'cone',
    MESH: 'mesh',
    COMPOUND: 'compound'
};

export class Collider extends Object {
    static _componentType = 'Collider';

    constructor(gameObject = null, options = {}) {
        super();
        this._gameObject = gameObject;
        this._cannonShape = null;
        this._rigidbody = null;
        this._isAttached = false;
        
        this._isTrigger = options.isTrigger || false;
        this._isEnabled = options.isEnabled !== false;
        this._center = options.center || { x: 0, y: 0, z: 0 };
        this._rotationOffset = options.rotationOffset || { x: 0, y: 0, z: 0, w: 1 };
        this._material = options.material || null;
        
        this._colliderType = ColliderType.BOX;
    }

    get componentType() { return Collider._componentType; }
    get gameObject() { return this._gameObject; }
    get cannonShape() { return this._cannonShape; }
    get rigidbody() { return this._rigidbody; }
    get isAttached() { return this._isAttached; }
    get colliderType() { return this._colliderType; }

    get isTrigger() { return this._isTrigger; }
    set isTrigger(value) {
        this._isTrigger = value;
        if (this._rigidbody && this._rigidbody.cannonBody) {
            this._rigidbody.cannonBody.userData.isTrigger = value;
        }
    }

    get isEnabled() { return this._isEnabled; }
    set isEnabled(value) {
        if (this._isEnabled !== value) {
            this._isEnabled = value;
            this._onEnableChanged();
        }
    }

    get center() { return { ...this._center }; }
    set center(value) {
        this._center = { ...value };
        this._updateShapePosition();
    }

    get rotationOffset() { return { ...this._rotationOffset }; }
    set rotationOffset(value) {
        this._rotationOffset = { ...value };
        this._updateShapeRotation();
    }

    get material() { return this._material; }
    set material(value) {
        this._material = value;
        this._updateMaterial();
    }

    _initShape() {
        throw new Error('Subclasses must implement _initShape()');
    }

    _updateShapePosition() {
        if (this._rigidbody && this._cannonShape) {
            const index = this._rigidbody.cannonBody?.shapes.indexOf(this._cannonShape);
            if (index > -1 && this._rigidbody.cannonBody) {
                this._rigidbody.cannonBody.shapeOffsets[index].set(
                    this._center.x,
                    this._center.y,
                    this._center.z
                );
            }
        }
    }

    _updateShapeRotation() {
        if (this._rigidbody && this._cannonShape) {
            const index = this._rigidbody.cannonBody?.shapes.indexOf(this._cannonShape);
            if (index > -1 && this._rigidbody.cannonBody) {
                this._rigidbody.cannonBody.shapeOrientations[index].set(
                    this._rotationOffset.x,
                    this._rotationOffset.y,
                    this._rotationOffset.z,
                    this._rotationOffset.w
                );
            }
        }
    }

    _updateMaterial() {
        if (this._cannonShape && this._material) {
            this._cannonShape.material = this._material.cannonMaterial;
        }
    }

    _onEnableChanged() {
        if (this._isAttached && this._rigidbody) {
            if (this._isEnabled) {
                this.attachToRigidbody(this._rigidbody);
            } else {
                this.detach();
            }
        }
    }

    attachToRigidbody(rigidbody) {
        if (!rigidbody || !this._cannonShape) return false;
        if (!this._isEnabled) return false;
        
        if (this._isAttached && this._rigidbody === rigidbody) return true;
        
        if (this._isAttached) {
            this.detach();
        }
        
        this._rigidbody = rigidbody;
        rigidbody.addCollider(this);
        this._isAttached = true;
        
        return true;
    }

    detach() {
        if (!this._isAttached || !this._rigidbody) return;
        
        this._rigidbody.removeCollider(this);
        this._rigidbody = null;
        this._isAttached = false;
    }

    closestPoint(point) {
        if (!this._cannonShape) return null;
        
        const cannonPoint = new CANNON.Vec3(point.x, point.y, point.z);
        const result = new CANNON.Vec3();
        
        if (this._cannonShape.calculateLocalAABB) {
            this._cannonShape.calculateLocalAABB();
        }
        
        return {
            x: result.x,
            y: result.y,
            z: result.z
        };
    }

    destroy() {
        this.detach();
        this._cannonShape = null;
        this._rigidbody = null;
        this._gameObject = null;
        this._material = null;
        
        super.destroy();
    }
}

export class BoxCollider extends Collider {
    static _componentType = 'BoxCollider';

    constructor(gameObject = null, options = {}) {
        super(gameObject, options);
        this._colliderType = ColliderType.BOX;
        this._size = options.size || { x: 1, y: 1, z: 1 };
        this._initShape();
    }

    get size() { return { ...this._size }; }
    set size(value) {
        this._size = { ...value };
        this._updateShape();
    }

    _initShape() {
        const halfExtents = new CANNON.Vec3(
            this._size.x / 2,
            this._size.y / 2,
            this._size.z / 2
        );
        this._cannonShape = new CANNON.Box(halfExtents);
        
        if (this._material) {
            this._updateMaterial();
        }
    }

    _updateShape() {
        if (this._rigidbody && this._cannonShape) {
            this.detach();
            this._initShape();
            this.attachToRigidbody(this._rigidbody);
        }
    }
}

export class SphereCollider extends Collider {
    static _componentType = 'SphereCollider';

    constructor(gameObject = null, options = {}) {
        super(gameObject, options);
        this._colliderType = ColliderType.SPHERE;
        this._radius = options.radius !== undefined ? options.radius : 0.5;
        this._initShape();
    }

    get radius() { return this._radius; }
    set radius(value) {
        this._radius = Math.max(0, value);
        this._updateShape();
    }

    _initShape() {
        this._cannonShape = new CANNON.Sphere(this._radius);
        
        if (this._material) {
            this._updateMaterial();
        }
    }

    _updateShape() {
        if (this._rigidbody && this._cannonShape) {
            this.detach();
            this._initShape();
            this.attachToRigidbody(this._rigidbody);
        }
    }
}

export class CapsuleCollider extends Collider {
    static _componentType = 'CapsuleCollider';

    constructor(gameObject = null, options = {}) {
        super(gameObject, options);
        this._colliderType = ColliderType.CAPSULE;
        this._radius = options.radius !== undefined ? options.radius : 0.5;
        this._height = options.height !== undefined ? options.height : 2;
        this._direction = options.direction || 'Y';
        this._initShape();
    }

    get radius() { return this._radius; }
    set radius(value) {
        this._radius = Math.max(0, value);
        this._updateShape();
    }

    get height() { return this._height; }
    set height(value) {
        this._height = Math.max(0, value);
        this._updateShape();
    }

    get direction() { return this._direction; }
    set direction(value) {
        this._direction = value;
        this._updateShape();
    }

    _initShape() {
        const halfHeight = Math.max(0, (this._height / 2) - this._radius);
        this._cannonShape = new CANNON.Cylinder(
            this._radius,
            this._radius,
            halfHeight * 2,
            8
        );
        
        if (this._material) {
            this._updateMaterial();
        }
    }

    _updateShape() {
        if (this._rigidbody && this._cannonShape) {
            this.detach();
            this._initShape();
            this.attachToRigidbody(this._rigidbody);
        }
    }
}

export class CylinderCollider extends Collider {
    static _componentType = 'CylinderCollider';

    constructor(gameObject = null, options = {}) {
        super(gameObject, options);
        this._colliderType = ColliderType.CYLINDER;
        this._radiusTop = options.radiusTop !== undefined ? options.radiusTop : 0.5;
        this._radiusBottom = options.radiusBottom !== undefined ? options.radiusBottom : 0.5;
        this._height = options.height !== undefined ? options.height : 1;
        this._segments = options.segments || 8;
        this._initShape();
    }

    get radiusTop() { return this._radiusTop; }
    set radiusTop(value) {
        this._radiusTop = Math.max(0, value);
        this._updateShape();
    }

    get radiusBottom() { return this._radiusBottom; }
    set radiusBottom(value) {
        this._radiusBottom = Math.max(0, value);
        this._updateShape();
    }

    get height() { return this._height; }
    set height(value) {
        this._height = Math.max(0, value);
        this._updateShape();
    }

    _initShape() {
        this._cannonShape = new CANNON.Cylinder(
            this._radiusTop,
            this._radiusBottom,
            this._height,
            this._segments
        );
        
        if (this._material) {
            this._updateMaterial();
        }
    }

    _updateShape() {
        if (this._rigidbody && this._cannonShape) {
            this.detach();
            this._initShape();
            this.attachToRigidbody(this._rigidbody);
        }
    }
}

export class PlaneCollider extends Collider {
    static _componentType = 'PlaneCollider';

    constructor(gameObject = null, options = {}) {
        super(gameObject, options);
        this._colliderType = ColliderType.PLANE;
        this._initShape();
    }

    _initShape() {
        this._cannonShape = new CANNON.Plane();
        
        if (this._material) {
            this._updateMaterial();
        }
    }
}

export class MeshCollider extends Collider {
    static _componentType = 'MeshCollider';

    constructor(gameObject = null, options = {}) {
        super(gameObject, options);
        this._colliderType = ColliderType.MESH;
        this._vertices = options.vertices || [];
        this._faces = options.faces || [];
        this._isConvex = options.isConvex !== false;
        this._mesh = null;
        this._initShape();
    }

    get vertices() { return [...this._vertices]; }
    set vertices(value) {
        this._vertices = [...value];
        this._updateShape();
    }

    get faces() { return [...this._faces]; }
    set faces(value) {
        this._faces = [...value];
        this._updateShape();
    }

    get isConvex() { return this._isConvex; }
    set isConvex(value) {
        this._isConvex = value;
        this._updateShape();
    }

    setFromMesh(threeMesh) {
        if (!threeMesh) return;
        
        const geometry = threeMesh.geometry;
        if (!geometry) return;
        
        const position = geometry.getAttribute('position');
        if (!position) return;
        
        const vertices = [];
        for (let i = 0; i < position.count; i++) {
            vertices.push({
                x: position.getX(i),
                y: position.getY(i),
                z: position.getZ(i)
            });
        }
        
        const faces = [];
        const index = geometry.getIndex();
        if (index) {
            for (let i = 0; i < index.count; i += 3) {
                faces.push([
                    index.getX(i),
                    index.getX(i + 1),
                    index.getX(i + 2)
                ]);
            }
        } else {
            for (let i = 0; i < position.count; i += 3) {
                faces.push([i, i + 1, i + 2]);
            }
        }
        
        this._vertices = vertices;
        this._faces = faces;
        this._updateShape();
    }

    _initShape() {
        if (this._vertices.length === 0) {
            this._cannonShape = null;
            return;
        }
        
        const cannonVertices = this._vertices.map(v => 
            new CANNON.Vec3(v.x, v.y, v.z)
        );
        
        const cannonFaces = this._faces.map(f => [...f]);
        
        if (this._isConvex) {
            this._cannonShape = new CANNON.ConvexPolyhedron({
                vertices: cannonVertices,
                faces: cannonFaces
            });
        } else {
            this._cannonShape = new CANNON.Trimesh(
                cannonVertices,
                cannonFaces
            );
        }
        
        if (this._material && this._cannonShape) {
            this._updateMaterial();
        }
    }

    _updateShape() {
        if (this._rigidbody && this._cannonShape) {
            this.detach();
            this._initShape();
            this.attachToRigidbody(this._rigidbody);
        }
    }
}

export default { 
    Collider, 
    BoxCollider, 
    SphereCollider, 
    CapsuleCollider, 
    CylinderCollider,
    PlaneCollider,
    MeshCollider,
    ColliderType
};
