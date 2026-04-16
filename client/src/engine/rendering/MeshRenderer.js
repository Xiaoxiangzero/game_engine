/**
 * Mini Game Engine - MeshRenderer Component
 * 网格渲染器组件，负责渲染网格
 */

import { Object } from '../core/Object.js';
import * as THREE from 'three';

export const ShadowCastingMode = {
    OFF: 'off',
    ON: 'on',
    TWO_SIDED: 'two-sided',
    SHADOWS_ONLY: 'shadows-only'
};

export const ReceiveShadowsMode = {
    OFF: false,
    ON: true
};

export class MeshRenderer extends Object {
    static _componentType = 'MeshRenderer';

    constructor(gameObject = null, options = {}) {
        super();
        this._gameObject = gameObject;
        this._mesh = null;
        this._materials = [];
        this._sharedMaterials = [];
        
        this._castShadows = options.castShadows !== false;
        this._receiveShadows = options.receiveShadows !== false;
        this._isEnabled = options.isEnabled !== false;
        this._sortingLayer = options.sortingLayer || 'Default';
        this._sortingOrder = options.sortingOrder || 0;
        this._renderingLayerMask = options.renderingLayerMask || -1;
        
        this._shadowCastingMode = options.shadowCastingMode || ShadowCastingMode.ON;
        
        this._isInitialized = false;
        this._threeMesh = null;
        
        if (options.materials) {
            this._materials = [...options.materials];
        }
    }

    get componentType() { return MeshRenderer._componentType; }
    get gameObject() { return this._gameObject; }
    get threeMesh() { return this._threeMesh; }
    get isInitialized() { return this._isInitialized; }

    get isEnabled() { return this._isEnabled; }
    set isEnabled(value) {
        if (this._isEnabled !== value) {
            this._isEnabled = value;
            this._updateVisibility();
        }
    }

    get castShadows() { return this._castShadows; }
    set castShadows(value) {
        this._castShadows = value;
        if (this._threeMesh) {
            this._threeMesh.castShadow = value;
        }
    }

    get receiveShadows() { return this._receiveShadows; }
    set receiveShadows(value) {
        this._receiveShadows = value;
        if (this._threeMesh) {
            this._threeMesh.receiveShadow = value;
        }
    }

    get sortingLayer() { return this._sortingLayer; }
    set sortingLayer(value) {
        this._sortingLayer = value;
    }

    get sortingOrder() { return this._sortingOrder; }
    set sortingOrder(value) {
        this._sortingOrder = value;
        if (this._threeMesh) {
            this._threeMesh.renderOrder = value;
        }
    }

    get shadowCastingMode() { return this._shadowCastingMode; }
    set shadowCastingMode(value) {
        this._shadowCastingMode = value;
        if (this._threeMesh) {
            switch (value) {
                case ShadowCastingMode.OFF:
                    this._threeMesh.castShadow = false;
                    break;
                case ShadowCastingMode.ON:
                case ShadowCastingMode.TWO_SIDED:
                    this._threeMesh.castShadow = true;
                    break;
                case ShadowCastingMode.SHADOWS_ONLY:
                    this._threeMesh.castShadow = true;
                    this._threeMesh.visible = false;
                    break;
            }
        }
    }

    get material() {
        return this._materials.length > 0 ? this._materials[0] : null;
    }
    set material(value) {
        if (this._materials.length === 0) {
            this._materials.push(value);
        } else {
            this._materials[0] = value;
        }
        this._updateMaterials();
    }

    get materials() {
        return [...this._materials];
    }
    set materials(value) {
        this._materials = [...value];
        this._updateMaterials();
    }

    get sharedMaterial() {
        return this._sharedMaterials.length > 0 ? this._sharedMaterials[0] : this._materials[0];
    }
    set sharedMaterial(value) {
        if (this._sharedMaterials.length === 0) {
            this._sharedMaterials.push(value);
        } else {
            this._sharedMaterials[0] = value;
        }
        this._updateMaterials();
    }

    get sharedMaterials() {
        return [...this._sharedMaterials];
    }
    set sharedMaterials(value) {
        this._sharedMaterials = [...value];
        this._updateMaterials();
    }

    get bounds() {
        if (!this._threeMesh) return null;
        
        const box = new THREE.Box3().setFromObject(this._threeMesh);
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

    initialize() {
        if (this._isInitialized) return;
        
        this._createOrUpdateThreeMesh();
        this._isInitialized = true;
    }

    _createOrUpdateThreeMesh() {
        const meshFilter = this._gameObject?.getComponent('MeshFilter');
        const sourceMesh = meshFilter?.mesh;
        
        if (sourceMesh) {
            if (this._threeMesh) {
                if (this._threeMesh.geometry !== sourceMesh.geometry) {
                    this._threeMesh.geometry = sourceMesh.geometry;
                }
            } else {
                const material = this._materials.length > 0 ? 
                    this._materials[0].threeMaterial : 
                    new THREE.MeshStandardMaterial();
                
                this._threeMesh = new THREE.Mesh(sourceMesh.geometry, material);
                this._threeMesh.castShadow = this._castShadows;
                this._threeMesh.receiveShadow = this._receiveShadows;
                this._threeMesh.renderOrder = this._sortingOrder;
                this._threeMesh.visible = this._isEnabled;
            }
            
            this._updateMaterials();
        }
    }

    _updateMaterials() {
        if (!this._threeMesh) return;
        
        const materials = this._sharedMaterials.length > 0 ? this._sharedMaterials : this._materials;
        
        if (materials.length === 0) return;
        
        if (materials.length === 1) {
            this._threeMesh.material = materials[0].threeMaterial || materials[0];
        } else {
            this._threeMesh.material = materials.map(m => m.threeMaterial || m);
        }
    }

    _updateVisibility() {
        if (this._threeMesh) {
            this._threeMesh.visible = this._isEnabled;
        }
    }

    updateMesh() {
        this._createOrUpdateThreeMesh();
    }

    setMaterial(index, material) {
        if (index >= 0 && index < this._materials.length) {
            this._materials[index] = material;
            this._updateMaterials();
        }
    }

    getMaterial(index = 0) {
        return this._materials[index] || null;
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }

    update() {
        if (!this._isInitialized && this._gameObject) {
            this.initialize();
        }
        
        if (this._threeMesh && this._gameObject) {
            const transform = this._gameObject.transform;
            if (transform) {
                this._threeMesh.position.set(
                    transform.position.x,
                    transform.position.y,
                    transform.position.z
                );
                this._threeMesh.quaternion.set(
                    transform.rotation.x,
                    transform.rotation.y,
                    transform.rotation.z,
                    transform.rotation.w
                );
                this._threeMesh.scale.set(
                    transform.scale.x,
                    transform.scale.y,
                    transform.scale.z
                );
            }
        }
    }

    destroy() {
        if (this._threeMesh) {
            if (this._threeMesh.geometry) {
                this._threeMesh.geometry.dispose();
            }
            if (Array.isArray(this._threeMesh.material)) {
                this._threeMesh.material.forEach(m => m.dispose());
            } else if (this._threeMesh.material) {
                this._threeMesh.material.dispose();
            }
        }
        
        this._threeMesh = null;
        this._materials = [];
        this._sharedMaterials = [];
        this._gameObject = null;
        
        super.destroy();
    }
}

export default MeshRenderer;
