/**
 * Mini Game Engine - Material System
 * 材质系统，支持PBR材质
 */

import { Object } from '../core/Object.js';
import * as THREE from 'three';

export const MaterialType = {
    STANDARD: 'standard',
    PHYSICAL: 'physical',
    BASIC: 'basic',
    LAMBERT: 'lambert',
    PHONG: 'phong',
    MATCAP: 'matcap',
    TOON: 'toon',
    SHADOW: 'shadow'
};

export const BlendMode = {
    NORMAL: 1,
    ADDITIVE: 2,
    MULTIPLY: 3,
    SUBTRACT: 4
};

export class Material extends Object {
    constructor(type = MaterialType.STANDARD, options = {}) {
        super();
        this._type = type;
        this._threeMaterial = null;
        this._name = options.name || 'Material';
        this._isDirty = true;
        
        this._color = options.color || { r: 1, g: 1, b: 1 };
        this._opacity = options.opacity !== undefined ? options.opacity : 1;
        this._transparent = options.transparent || false;
        this._alphaTest = options.alphaTest || 0;
        this._blending = options.blending || BlendMode.NORMAL;
        this._side = options.side || THREE.FrontSide;
        
        this._wireframe = options.wireframe || false;
        this._flatShading = options.flatShading || false;
        this._vertexColors = options.vertexColors || false;
        
        this._map = options.map || null;
        this._normalMap = options.normalMap || null;
        this._emissiveMap = options.emissiveMap || null;
        this._alphaMap = options.alphaMap || null;
        this._aoMap = options.aoMap || null;
        
        this._emissive = options.emissive || { r: 0, g: 0, b: 0 };
        this._emissiveIntensity = options.emissiveIntensity !== undefined ? options.emissiveIntensity : 1;
        
        this._aoMapIntensity = options.aoMapIntensity !== undefined ? options.aoMapIntensity : 1;
        
        this._createMaterial();
    }

    get threeMaterial() { return this._threeMaterial; }
    get type() { return this._type; }
    get name() { return this._name; }
    set name(value) {
        this._name = value;
        if (this._threeMaterial) {
            this._threeMaterial.name = value;
        }
    }

    get color() { return { ...this._color }; }
    set color(value) {
        this._color = { ...value };
        this._markDirty();
        if (this._threeMaterial && this._threeMaterial.color) {
            this._threeMaterial.color.setRGB(value.r, value.g, value.b);
        }
    }

    get opacity() { return this._opacity; }
    set opacity(value) {
        this._opacity = Math.max(0, Math.min(1, value));
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.opacity = this._opacity;
        }
    }

    get transparent() { return this._transparent; }
    set transparent(value) {
        this._transparent = value;
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.transparent = value;
        }
    }

    get alphaTest() { return this._alphaTest; }
    set alphaTest(value) {
        this._alphaTest = Math.max(0, Math.min(1, value));
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.alphaTest = this._alphaTest;
        }
    }

    get blending() { return this._blending; }
    set blending(value) {
        this._blending = value;
        this._markDirty();
        if (this._threeMaterial) {
            switch (value) {
                case BlendMode.NORMAL:
                    this._threeMaterial.blending = THREE.NormalBlending;
                    break;
                case BlendMode.ADDITIVE:
                    this._threeMaterial.blending = THREE.AdditiveBlending;
                    break;
                case BlendMode.MULTIPLY:
                    this._threeMaterial.blending = THREE.MultiplyBlending;
                    break;
                case BlendMode.SUBTRACT:
                    this._threeMaterial.blending = THREE.SubtractiveBlending;
                    break;
            }
        }
    }

    get side() { return this._side; }
    set side(value) {
        this._side = value;
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.side = value;
        }
    }

    get wireframe() { return this._wireframe; }
    set wireframe(value) {
        this._wireframe = value;
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.wireframe = value;
        }
    }

    get flatShading() { return this._flatShading; }
    set flatShading(value) {
        this._flatShading = value;
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.flatShading = value;
            this._threeMaterial.needsUpdate = true;
        }
    }

    get vertexColors() { return this._vertexColors; }
    set vertexColors(value) {
        this._vertexColors = value;
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.vertexColors = value;
            this._threeMaterial.needsUpdate = true;
        }
    }

    get emissive() { return { ...this._emissive }; }
    set emissive(value) {
        this._emissive = { ...value };
        this._markDirty();
        if (this._threeMaterial && this._threeMaterial.emissive) {
            this._threeMaterial.emissive.setRGB(value.r, value.g, value.b);
        }
    }

    get emissiveIntensity() { return this._emissiveIntensity; }
    set emissiveIntensity(value) {
        this._emissiveIntensity = Math.max(0, value);
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.emissiveIntensity = this._emissiveIntensity;
        }
    }

    get aoMapIntensity() { return this._aoMapIntensity; }
    set aoMapIntensity(value) {
        this._aoMapIntensity = Math.max(0, value);
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.aoMapIntensity = this._aoMapIntensity;
        }
    }

    _createMaterial() {
        switch (this._type) {
            case MaterialType.PHYSICAL:
                this._threeMaterial = new THREE.MeshPhysicalMaterial();
                break;
            case MaterialType.BASIC:
                this._threeMaterial = new THREE.MeshBasicMaterial();
                break;
            case MaterialType.LAMBERT:
                this._threeMaterial = new THREE.MeshLambertMaterial();
                break;
            case MaterialType.PHONG:
                this._threeMaterial = new THREE.MeshPhongMaterial();
                break;
            case MaterialType.MATCAP:
                this._threeMaterial = new THREE.MeshMatcapMaterial();
                break;
            case MaterialType.TOON:
                this._threeMaterial = new THREE.MeshToonMaterial();
                break;
            case MaterialType.SHADOW:
                this._threeMaterial = new THREE.ShadowMaterial();
                break;
            case MaterialType.STANDARD:
            default:
                this._threeMaterial = new THREE.MeshStandardMaterial();
                break;
        }
        
        this._applyProperties();
    }

    _applyProperties() {
        if (!this._threeMaterial) return;
        
        this._threeMaterial.name = this._name;
        
        if (this._threeMaterial.color) {
            this._threeMaterial.color.setRGB(this._color.r, this._color.g, this._color.b);
        }
        
        this._threeMaterial.opacity = this._opacity;
        this._threeMaterial.transparent = this._transparent;
        this._threeMaterial.alphaTest = this._alphaTest;
        this._threeMaterial.side = this._side;
        this._threeMaterial.wireframe = this._wireframe;
        this._threeMaterial.flatShading = this._flatShading;
        this._threeMaterial.vertexColors = this._vertexColors;
        
        if (this._threeMaterial.emissive) {
            this._threeMaterial.emissive.setRGB(this._emissive.r, this._emissive.g, this._emissive.b);
            this._threeMaterial.emissiveIntensity = this._emissiveIntensity;
        }
        
        this._threeMaterial.aoMapIntensity = this._aoMapIntensity;
        
        this._threeMaterial.needsUpdate = true;
    }

    _markDirty() {
        this._isDirty = true;
        if (this._threeMaterial) {
            this._threeMaterial.needsUpdate = true;
        }
    }

    setTexture(mapType, texture) {
        if (!this._threeMaterial) return;
        
        switch (mapType) {
            case 'map':
                this._map = texture;
                this._threeMaterial.map = texture;
                break;
            case 'normalMap':
                this._normalMap = texture;
                this._threeMaterial.normalMap = texture;
                break;
            case 'emissiveMap':
                this._emissiveMap = texture;
                this._threeMaterial.emissiveMap = texture;
                break;
            case 'alphaMap':
                this._alphaMap = texture;
                this._threeMaterial.alphaMap = texture;
                break;
            case 'aoMap':
                this._aoMap = texture;
                this._threeMaterial.aoMap = texture;
                break;
        }
        
        this._markDirty();
    }

    clone() {
        const cloned = new Material(this._type, {
            name: this._name + ' (Clone)',
            color: { ...this._color },
            opacity: this._opacity,
            transparent: this._transparent,
            alphaTest: this._alphaTest,
            blending: this._blending,
            side: this._side,
            wireframe: this._wireframe,
            flatShading: this._flatShading,
            vertexColors: this._vertexColors,
            emissive: { ...this._emissive },
            emissiveIntensity: this._emissiveIntensity,
            aoMapIntensity: this._aoMapIntensity
        });
        
        return cloned;
    }

    destroy() {
        if (this._threeMaterial) {
            this._threeMaterial.dispose();
        }
        this._threeMaterial = null;
        this._map = null;
        this._normalMap = null;
        this._emissiveMap = null;
        this._alphaMap = null;
        this._aoMap = null;
        
        super.destroy();
    }
}

export class PBRMaterial extends Material {
    constructor(options = {}) {
        super(MaterialType.STANDARD, options);
        
        this._roughness = options.roughness !== undefined ? options.roughness : 0.5;
        this._metalness = options.metalness !== undefined ? options.metalness : 0;
        this._roughnessMap = options.roughnessMap || null;
        this._metalnessMap = options.metalnessMap || null;
        this._envMap = options.envMap || null;
        this._envMapIntensity = options.envMapIntensity !== undefined ? options.envMapIntensity : 1;
        
        this._applyPBRProperties();
    }

    get roughness() { return this._roughness; }
    set roughness(value) {
        this._roughness = Math.max(0, Math.min(1, value));
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.roughness = this._roughness;
        }
    }

    get metalness() { return this._metalness; }
    set metalness(value) {
        this._metalness = Math.max(0, Math.min(1, value));
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.metalness = this._metalness;
        }
    }

    get envMapIntensity() { return this._envMapIntensity; }
    set envMapIntensity(value) {
        this._envMapIntensity = Math.max(0, value);
        this._markDirty();
        if (this._threeMaterial) {
            this._threeMaterial.envMapIntensity = this._envMapIntensity;
        }
    }

    _applyPBRProperties() {
        if (!this._threeMaterial) return;
        
        this._threeMaterial.roughness = this._roughness;
        this._threeMaterial.metalness = this._metalness;
        this._threeMaterial.envMapIntensity = this._envMapIntensity;
        
        if (this._roughnessMap) {
            this._threeMaterial.roughnessMap = this._roughnessMap;
        }
        if (this._metalnessMap) {
            this._threeMaterial.metalnessMap = this._metalnessMap;
        }
        if (this._envMap) {
            this._threeMaterial.envMap = this._envMap;
        }
        
        this._threeMaterial.needsUpdate = true;
    }

    setRoughnessMap(texture) {
        this._roughnessMap = texture;
        if (this._threeMaterial) {
            this._threeMaterial.roughnessMap = texture;
            this._markDirty();
        }
    }

    setMetalnessMap(texture) {
        this._metalnessMap = texture;
        if (this._threeMaterial) {
            this._threeMaterial.metalnessMap = texture;
            this._markDirty();
        }
    }

    setEnvMap(envMap) {
        this._envMap = envMap;
        if (this._threeMaterial) {
            this._threeMaterial.envMap = envMap;
            this._markDirty();
        }
    }

    clone() {
        const cloned = new PBRMaterial({
            name: this._name + ' (Clone)',
            color: { ...this._color },
            opacity: this._opacity,
            transparent: this._transparent,
            roughness: this._roughness,
            metalness: this._metalness,
            emissive: { ...this._emissive },
            emissiveIntensity: this._emissiveIntensity,
            envMapIntensity: this._envMapIntensity
        });
        
        return cloned;
    }

    static createDefault() {
        return new PBRMaterial({
            name: 'Default PBR Material',
            color: { r: 0.8, g: 0.8, b: 0.8 },
            roughness: 0.5,
            metalness: 0
        });
    }

    static createMetallic(roughness = 0.3) {
        return new PBRMaterial({
            name: 'Metallic Material',
            color: { r: 0.95, g: 0.93, b: 0.88 },
            roughness: roughness,
            metalness: 1
        });
    }

    static createPlastic(color = { r: 1, g: 0, b: 0 }, roughness = 0.4) {
        return new PBRMaterial({
            name: 'Plastic Material',
            color: color,
            roughness: roughness,
            metalness: 0
        });
    }

    static createGlass(opacity = 0.3, roughness = 0) {
        return new PBRMaterial({
            name: 'Glass Material',
            color: { r: 0.95, g: 0.98, b: 1 },
            opacity: opacity,
            transparent: true,
            roughness: roughness,
            metalness: 0.1,
            envMapIntensity: 1.5
        });
    }
}

export default { Material, PBRMaterial, MaterialType, BlendMode };
