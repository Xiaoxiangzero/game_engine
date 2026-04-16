/**
 * Mini Game Engine - Resource Manager
 * 资源管理器，管理资源加载和缓存
 */

import { Object } from '../core/Object.js';
import { Events, EventTypes } from '../events/EventManager.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export class LoadableResource extends Object {
    constructor(url, options = {}) {
        super();
        this._url = url;
        this._data = null;
        this._isLoaded = false;
        this._isLoading = false;
        this._loadError = null;
        this._type = options.type || 'unknown';
        this._priority = options.priority || 0;
        this._tags = options.tags || [];
        this._loadTime = 0;
        this._dependencies = [];
        this._onCompleteCallbacks = [];
        this._onErrorCallbacks = [];
    }

    get url() { return this._url; }
    get data() { return this._data; }
    get isLoaded() { return this._isLoaded; }
    get isLoading() { return this._isLoading; }
    get loadError() { return this._loadError; }
    get type() { return this._type; }
    get priority() { return this._priority; }
    get tags() { return [...this._tags]; }
    get loadTime() { return this._loadTime; }
    get dependencies() { return [...this._dependencies]; }

    addTag(tag) {
        if (!this._tags.includes(tag)) {
            this._tags.push(tag);
        }
    }

    removeTag(tag) {
        const index = this._tags.indexOf(tag);
        if (index > -1) {
            this._tags.splice(index, 1);
        }
    }

    hasTag(tag) {
        return this._tags.includes(tag);
    }

    onComplete(callback) {
        if (this._isLoaded) {
            callback(this);
        } else {
            this._onCompleteCallbacks.push(callback);
        }
        return this;
    }

    onError(callback) {
        if (this._loadError) {
            callback(this, this._loadError);
        } else {
            this._onErrorCallbacks.push(callback);
        }
        return this;
    }

    _notifyComplete() {
        this._isLoaded = true;
        this._isLoading = false;
        
        Events.broadcast({
            type: EventTypes.RESOURCE_LOAD_COMPLETE,
            data: { resource: this, url: this._url }
        });
        
        for (const callback of this._onCompleteCallbacks) {
            try {
                callback(this);
            } catch (error) {
                console.error('Error in resource complete callback:', error);
            }
        }
        this._onCompleteCallbacks = [];
    }

    _notifyError(error) {
        this._loadError = error;
        this._isLoading = false;
        
        Events.broadcast({
            type: EventTypes.RESOURCE_LOAD_ERROR,
            data: { resource: this, url: this._url, error: error }
        });
        
        for (const callback of this._onErrorCallbacks) {
            try {
                callback(this, error);
            } catch (err) {
                console.error('Error in resource error callback:', err);
            }
        }
        this._onErrorCallbacks = [];
    }
}

export class ResourceCache {
    constructor() {
        this._cache = new Map();
        this._maxSize = 100;
        this._maxMemoryMB = 200;
    }

    get maxSize() { return this._maxSize; }
    set maxSize(value) { this._maxSize = Math.max(1, value); }

    get maxMemoryMB() { return this._maxMemoryMB; }
    set maxMemoryMB(value) { this._maxMemoryMB = Math.max(1, value); }

    has(key) {
        return this._cache.has(key);
    }

    get(key) {
        const entry = this._cache.get(key);
        if (entry) {
            entry.lastAccess = Date.now();
            return entry.data;
        }
        return null;
    }

    set(key, data, size = 0) {
        this._checkSize();
        
        this._cache.set(key, {
            data: data,
            size: size,
            created: Date.now(),
            lastAccess: Date.now()
        });
    }

    remove(key) {
        const entry = this._cache.get(key);
        if (entry) {
            if (entry.data && entry.data.dispose) {
                entry.data.dispose();
            }
            this._cache.delete(key);
        }
    }

    clear() {
        for (const [key, entry] of this._cache) {
            if (entry.data && entry.data.dispose) {
                entry.data.dispose();
            }
        }
        this._cache.clear();
    }

    _checkSize() {
        if (this._cache.size < this._maxSize) return;
        
        const entries = Array.from(this._cache.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        
        const removeCount = Math.ceil(this._maxSize * 0.2);
        for (let i = 0; i < removeCount && i < entries.length; i++) {
            const [key, entry] = entries[i];
            if (entry.data && entry.data.dispose) {
                entry.data.dispose();
            }
            this._cache.delete(key);
        }
    }

    get keys() {
        return Array.from(this._cache.keys());
    }

    get count() {
        return this._cache.size;
    }
}

export class ResourceManager extends Object {
    static _instance = null;

    static get instance() {
        if (!this._instance) {
            this._instance = new ResourceManager();
        }
        return this._instance;
    }

    constructor() {
        super();
        this._cache = new ResourceCache();
        this._loadingQueue = [];
        this._loadingResources = new Map();
        this._baseURL = '';
        this._crossOrigin = 'anonymous';
        this._loaders = new Map();
        
        this._initLoaders();
    }

    get baseURL() { return this._baseURL; }
    set baseURL(value) { this._baseURL = value; }

    get cache() { return this._cache; }
    get loadingCount() { return this._loadingResources.size; }

    _initLoaders() {
        this._loaders.set('gltf', new GLTFLoader());
        this._loaders.set('glb', new GLTFLoader());
        this._loaders.set('obj', new OBJLoader());
        this._loaders.set('mtl', new MTLLoader());
        
        this._textureLoader = new THREE.TextureLoader();
        this._textureLoader.setCrossOrigin(this._crossOrigin);
    }

    _getFullURL(url) {
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        return this._baseURL + url;
    }

    _getExtension(url) {
        const match = url.match(/\.([^.]+)$/);
        return match ? match[1].toLowerCase() : '';
    }

    async loadTexture(url, options = {}) {
        const fullURL = this._getFullURL(url);
        
        if (this._cache.has(fullURL)) {
            return this._cache.get(fullURL);
        }

        Events.broadcast({
            type: EventTypes.RESOURCE_LOAD_START,
            data: { url: fullURL, type: 'texture' }
        });

        return new Promise((resolve, reject) => {
            const onProgress = (xhr) => {
                if (options.onProgress) {
                    options.onProgress(xhr);
                }
            };

            this._textureLoader.load(
                fullURL,
                (texture) => {
                    if (options.flipY !== undefined) {
                        texture.flipY = options.flipY;
                    }
                    if (options.wrapS !== undefined) {
                        texture.wrapS = options.wrapS;
                    }
                    if (options.wrapT !== undefined) {
                        texture.wrapT = options.wrapT;
                    }
                    if (options.magFilter !== undefined) {
                        texture.magFilter = options.magFilter;
                    }
                    if (options.minFilter !== undefined) {
                        texture.minFilter = options.minFilter;
                    }

                    this._cache.set(fullURL, texture);
                    resolve(texture);
                },
                onProgress,
                (error) => {
                    console.error(`Failed to load texture: ${fullURL}`, error);
                    reject(error);
                }
            );
        });
    }

    async loadModel(url, options = {}) {
        const fullURL = this._getFullURL(url);
        const extension = this._getExtension(fullURL);

        Events.broadcast({
            type: EventTypes.RESOURCE_LOAD_START,
            data: { url: fullURL, type: 'model' }
        });

        switch (extension) {
            case 'gltf':
            case 'glb':
                return this._loadGLTF(fullURL, options);
            case 'obj':
                return this._loadOBJ(fullURL, options);
            default:
                console.warn(`Unsupported model format: ${extension}`);
                return null;
        }
    }

    async _loadGLTF(url, options = {}) {
        const loader = this._loaders.get('gltf');
        if (!loader) {
            throw new Error('GLTFLoader not available');
        }

        if (options.useDraco) {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath(options.dracoPath || 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
            loader.setDRACOLoader(dracoLoader);
        }

        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf) => {
                    if (options.autoCenter) {
                        const box = new THREE.Box3().setFromObject(gltf.scene);
                        const center = box.getCenter(new THREE.Vector3());
                        gltf.scene.position.sub(center);
                    }

                    if (options.computeVertexNormals) {
                        gltf.scene.traverse((child) => {
                            if (child.isMesh) {
                                child.geometry.computeVertexNormals();
                            }
                        });
                    }

                    this._cache.set(url, gltf);
                    resolve(gltf);
                },
                (xhr) => {
                    if (options.onProgress) {
                        options.onProgress(xhr);
                    }
                },
                (error) => {
                    console.error(`Failed to load GLTF: ${url}`, error);
                    reject(error);
                }
            );
        });
    }

    async _loadOBJ(url, options = {}) {
        const loader = this._loaders.get('obj');
        if (!loader) {
            throw new Error('OBJLoader not available');
        }

        return new Promise((resolve, reject) => {
            const loadOBJ = () => {
                loader.load(
                    url,
                    (object) => {
                        if (options.autoCenter) {
                            const box = new THREE.Box3().setFromObject(object);
                            const center = box.getCenter(new THREE.Vector3());
                            object.position.sub(center);
                        }

                        const result = {
                            scene: object,
                            animations: [],
                            sceneLoaded: true
                        };
                        
                        this._cache.set(url, result);
                        resolve(result);
                    },
                    (xhr) => {
                        if (options.onProgress) {
                            options.onProgress(xhr);
                        }
                    },
                    (error) => {
                        console.error(`Failed to load OBJ: ${url}`, error);
                        reject(error);
                    }
                );
            };

            if (options.mtlUrl) {
                const mtlLoader = this._loaders.get('mtl');
                if (mtlLoader) {
                    mtlLoader.load(
                        options.mtlUrl,
                        (materials) => {
                            materials.preload();
                            loader.setMaterials(materials);
                            loadOBJ();
                        },
                        undefined,
                        (error) => {
                            console.warn(`Failed to load MTL, loading OBJ without materials: ${error}`);
                            loadOBJ();
                        }
                    );
                } else {
                    loadOBJ();
                }
            } else {
                loadOBJ();
            }
        });
    }

    async loadJSON(url, options = {}) {
        const fullURL = this._getFullURL(url);

        Events.broadcast({
            type: EventTypes.RESOURCE_LOAD_START,
            data: { url: fullURL, type: 'json' }
        });

        try {
            const response = await fetch(fullURL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this._cache.set(fullURL, data);
            return data;
        } catch (error) {
            console.error(`Failed to load JSON: ${fullURL}`, error);
            throw error;
        }
    }

    unload(url) {
        const fullURL = this._getFullURL(url);
        this._cache.remove(fullURL);
        
        Events.broadcast({
            type: EventTypes.RESOURCE_UNLOAD,
            data: { url: fullURL }
        });
    }

    unloadAll() {
        this._cache.clear();
    }

    getCached(url) {
        const fullURL = this._getFullURL(url);
        return this._cache.get(fullURL);
    }

    isCached(url) {
        const fullURL = this._getFullURL(url);
        return this._cache.has(fullURL);
    }

    async loadMultiple(resources, options = {}) {
        const promises = resources.map(resource => {
            if (typeof resource === 'string') {
                const extension = this._getExtension(resource);
                if (['gltf', 'glb', 'obj'].includes(extension)) {
                    return this.loadModel(resource, options);
                } else if (['png', 'jpg', 'jpeg', 'webp', 'basis', 'ktx2'].includes(extension)) {
                    return this.loadTexture(resource, options);
                } else if (extension === 'json') {
                    return this.loadJSON(resource, options);
                }
            } else if (resource.type === 'model') {
                return this.loadModel(resource.url, resource.options || options);
            } else if (resource.type === 'texture') {
                return this.loadTexture(resource.url, resource.options || options);
            } else if (resource.type === 'json') {
                return this.loadJSON(resource.url, resource.options || options);
            }
            return null;
        });

        return Promise.all(promises);
    }

    static get default() {
        return ResourceManager.instance;
    }
}

export class ModelLoader {
    static async load(url, options = {}) {
        return ResourceManager.instance.loadModel(url, options);
    }

    static async loadGLTF(url, options = {}) {
        return ResourceManager.instance.loadModel(url, { ...options, format: 'gltf' });
    }

    static async loadOBJ(url, options = {}) {
        return ResourceManager.instance.loadModel(url, { ...options, format: 'obj' });
    }

    static async loadTexture(url, options = {}) {
        return ResourceManager.instance.loadTexture(url, options);
    }

    static extractMeshes(gltf) {
        const meshes = [];
        if (gltf && gltf.scene) {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    meshes.push({
                        mesh: child,
                        name: child.name,
                        geometry: child.geometry,
                        material: child.material,
                        materials: Array.isArray(child.material) ? child.material : [child.material]
                    });
                }
            });
        }
        return meshes;
    }

    static extractAnimations(gltf) {
        return gltf?.animations || [];
    }

    static createPBRMaterial(options = {}) {
        return {
            color: options.color || { r: 1, g: 1, b: 1 },
            roughness: options.roughness !== undefined ? options.roughness : 0.5,
            metalness: options.metalness !== undefined ? options.metalness : 0,
            map: options.map || null,
            normalMap: options.normalMap || null,
            roughnessMap: options.roughnessMap || null,
            metalnessMap: options.metalnessMap || null,
            aoMap: options.aoMap || null,
            emissive: options.emissive || { r: 0, g: 0, b: 0 },
            emissiveIntensity: options.emissiveIntensity || 0,
            transparent: options.transparent || false,
            opacity: options.opacity !== undefined ? options.opacity : 1
        };
    }
}

export default { ResourceManager, ResourceCache, LoadableResource, ModelLoader };
