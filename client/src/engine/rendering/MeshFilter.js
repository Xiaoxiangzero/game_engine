/**
 * Mini Game Engine - MeshFilter Component
 * 网格过滤器组件，管理网格数据
 */

import { Object } from '../core/Object.js';
import * as THREE from 'three';

export class MeshFilter extends Object {
    static _componentType = 'MeshFilter';

    constructor(gameObject = null, options = {}) {
        super();
        this._gameObject = gameObject;
        this._mesh = options.mesh || null;
        this._sharedMesh = options.sharedMesh || null;
        this._isInitialized = false;
    }

    get componentType() { return MeshFilter._componentType; }
    get gameObject() { return this._gameObject; }
    get isInitialized() { return this._isInitialized; }

    get mesh() {
        return this._mesh;
    }
    set mesh(value) {
        if (this._mesh === value) return;
        this._mesh = value;
        this._onMeshChanged();
    }

    get sharedMesh() {
        return this._sharedMesh || this._mesh;
    }
    set sharedMesh(value) {
        if (this._sharedMesh === value) return;
        this._sharedMesh = value;
        this._onMeshChanged();
    }

    _onMeshChanged() {
        if (this._gameObject) {
            const renderer = this._gameObject.getComponent('MeshRenderer');
            if (renderer) {
                renderer.updateMesh();
            }
        }
    }

    get vertices() {
        if (!this._mesh || !this._mesh.geometry) return [];
        const position = this._mesh.geometry.getAttribute('position');
        if (!position) return [];
        
        const vertices = [];
        for (let i = 0; i < position.count; i++) {
            vertices.push({
                x: position.getX(i),
                y: position.getY(i),
                z: position.getZ(i)
            });
        }
        return vertices;
    }

    get triangles() {
        if (!this._mesh || !this._mesh.geometry) return [];
        const index = this._mesh.geometry.getIndex();
        if (!index) return [];
        
        const triangles = [];
        for (let i = 0; i < index.count; i += 3) {
            triangles.push([
                index.getX(i),
                index.getX(i + 1),
                index.getX(i + 2)
            ]);
        }
        return triangles;
    }

    get normals() {
        if (!this._mesh || !this._mesh.geometry) return [];
        const normal = this._mesh.geometry.getAttribute('normal');
        if (!normal) return [];
        
        const normals = [];
        for (let i = 0; i < normal.count; i++) {
            normals.push({
                x: normal.getX(i),
                y: normal.getY(i),
                z: normal.getZ(i)
            });
        }
        return normals;
    }

    get uvs() {
        if (!this._mesh || !this._mesh.geometry) return [];
        const uv = this._mesh.geometry.getAttribute('uv');
        if (!uv) return [];
        
        const uvs = [];
        for (let i = 0; i < uv.count; i++) {
            uvs.push({
                x: uv.getX(i),
                y: uv.getY(i)
            });
        }
        return uvs;
    }

    get bounds() {
        if (!this._mesh || !this._mesh.geometry) return null;
        
        const geometry = this._mesh.geometry;
        geometry.computeBoundingBox();
        
        const box = geometry.boundingBox;
        if (!box) return null;
        
        return {
            min: { x: box.min.x, y: box.min.y, z: box.min.z },
            max: { x: box.max.x, y: box.max.y, z: box.max.z },
            center: {
                x: (box.min.x + box.max.x) / 2,
                y: (box.min.y + box.max.y) / 2,
                z: (box.min.z + box.max.z) / 2
            },
            size: {
                x: box.max.x - box.min.x,
                y: box.max.y - box.min.y,
                z: box.max.z - box.min.z
            }
        };
    }

    recalculateNormals() {
        if (this._mesh && this._mesh.geometry) {
            this._mesh.geometry.computeVertexNormals();
        }
    }

    recalculateBounds() {
        if (this._mesh && this._mesh.geometry) {
            this._mesh.geometry.computeBoundingBox();
            this._mesh.geometry.computeBoundingSphere();
        }
    }

    static createBox(width = 1, height = 1, depth = 1) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial();
        return new THREE.Mesh(geometry, material);
    }

    static createSphere(radius = 0.5, segments = 32) {
        const geometry = new THREE.SphereGeometry(radius, segments, segments);
        const material = new THREE.MeshStandardMaterial();
        return new THREE.Mesh(geometry, material);
    }

    static createCylinder(radiusTop = 0.5, radiusBottom = 0.5, height = 1, segments = 32) {
        const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
        const material = new THREE.MeshStandardMaterial();
        return new THREE.Mesh(geometry, material);
    }

    static createCapsule(radius = 0.5, height = 1, segments = 32) {
        const geometry = new THREE.CapsuleGeometry(radius, height, segments, segments);
        const material = new THREE.MeshStandardMaterial();
        return new THREE.Mesh(geometry, material);
    }

    static createPlane(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
        const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
        const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
        return new THREE.Mesh(geometry, material);
    }

    static createTorus(radius = 1, tube = 0.4, radialSegments = 12, tubularSegments = 48) {
        const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
        const material = new THREE.MeshStandardMaterial();
        return new THREE.Mesh(geometry, material);
    }

    destroy() {
        if (this._mesh) {
            if (this._mesh.geometry) {
                this._mesh.geometry.dispose();
            }
        }
        this._mesh = null;
        this._sharedMesh = null;
        this._gameObject = null;
        
        super.destroy();
    }
}

export default MeshFilter;
