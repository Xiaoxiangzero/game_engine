import * as THREE from 'three';
import { TextureManager, TextureType } from './TextureManager.js';
import { MaterialManager, MaterialType } from './MaterialManager.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export const ResourceType = {
  TEXTURE: 'texture',
  MATERIAL: 'material',
  MODEL: 'model',
  SKYBOX: 'skybox',
  AUDIO: 'audio',
  SCENE: 'scene'
};

export class ResourceManager {
  constructor() {
    this.textureManager = new TextureManager();
    this.materialManager = new MaterialManager(this.textureManager);
    
    this.models = new Map();
    this.skyboxes = new Map();
    this.nextModelId = 1;
    this.nextSkyboxId = 1;
    
    this.gltfLoader = new GLTFLoader();
    this.objLoader = new OBJLoader();
  }

  async loadTextureFromFile(file, type = TextureType.ALBEDO) {
    return await this.textureManager.loadTextureFromFile(file, type);
  }

  loadTextureFromUrl(url, name, type = TextureType.ALBEDO) {
    return this.textureManager.loadTextureFromUrl(url, name, type);
  }

  async importTexturesFromFiles(files) {
    const results = [];
    
    for (const file of files) {
      let type = TextureType.ALBEDO;
      const name = file.name.toLowerCase();
      
      if (name.includes('normal') || name.includes('_n_') || name.includes('_n.')) {
        type = TextureType.NORMAL;
      } else if (name.includes('metal') || name.includes('_m_') || name.includes('_m.')) {
        type = TextureType.METALNESS;
      } else if (name.includes('roughness') || name.includes('_r_') || name.includes('_r.')) {
        type = TextureType.ROUGHNESS;
      } else if (name.includes('ao') || name.includes('ambient') || name.includes('_ao_') || name.includes('_ao.')) {
        type = TextureType.AO;
      } else if (name.includes('emissive') || name.includes('_e_') || name.includes('_e.')) {
        type = TextureType.EMISSIVE;
      } else if (name.includes('metalroughness') || name.includes('_mr_')) {
        type = TextureType.METAL_ROUGHNESS;
      }
      
      try {
        const result = await this.loadTextureFromFile(file, type);
        results.push(result);
      } catch (error) {
        console.error(`Failed to load texture ${file.name}:`, error);
      }
    }
    
    return results;
  }

  createMaterial(type = MaterialType.STANDARD, options = {}) {
    return this.materialManager.createMaterial(type, options);
  }

  getMaterial(id) {
    return this.materialManager.getMaterial(id);
  }

  getTexture(id) {
    return this.textureManager.getTexture(id);
  }

  async loadModelFromFiles(files) {
    const modelFiles = [];
    const textureFiles = [];
    
    for (const file of files) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (['glb', 'gltf', 'obj', 'fbx', 'mtl'].includes(ext)) {
        modelFiles.push(file);
      } else if (['png', 'jpg', 'jpeg', 'bmp', 'webp', 'tga', 'hdr', 'exr'].includes(ext)) {
        textureFiles.push(file);
      }
    }
    
    if (textureFiles.length > 0) {
      await this.importTexturesFromFiles(textureFiles);
    }
    
    const results = [];
    
    for (const file of modelFiles) {
      const ext = file.name.toLowerCase().split('.').pop();
      
      try {
        let model = null;
        
        if (ext === 'glb' || ext === 'gltf') {
          model = await this._loadGLTF(file);
        } else if (ext === 'obj') {
          model = await this._loadOBJ(file);
        } else if (ext === 'fbx') {
          model = await this._loadFBX(file);
        }
        
        if (model) {
          const id = 'model_' + this.nextModelId++;
          model.name = file.name;
          model.userData.modelId = id;
          
          this.models.set(id, model);
          results.push({
            id: id,
            name: file.name,
            model: model
          });
        }
      } catch (error) {
        console.error(`Failed to load model ${file.name}:`, error);
      }
    }
    
    return results;
  }

  async _loadGLTF(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        
        this.gltfLoader.parse(
          arrayBuffer,
          '',
          (gltf) => {
            const scene = gltf.scene || gltf.scenes[0];
            if (scene) {
              scene.traverse((child) => {
                if (child.isMesh && child.material) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              resolve(scene);
            } else {
              reject(new Error('No scene in GLTF'));
            }
          },
          (error) => {
            reject(error);
          }
        );
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  async _loadOBJ(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target.result;
        try {
          const object = this.objLoader.parse(text);
          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          resolve(object);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async _loadFBX(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        try {
          const object = this.fbxLoader.parse(arrayBuffer);
          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          resolve(object);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  async importSkyboxFromFile(file, type = 'equirectangular') {
    const textureResult = await this.textureManager.loadTextureFromFile(file, TextureType.SKYBOX);
    
    const lightingInfo = this.textureManager.analyzeLighting(textureResult.texture);
    
    const id = 'skybox_' + this.nextSkyboxId++;
    const skyboxData = {
      id: id,
      name: file.name,
      type: type,
      textureId: textureResult.data.id,
      lightingInfo: lightingInfo
    };
    
    this.skyboxes.set(id, skyboxData);
    
    return {
      id: id,
      name: file.name,
      texture: textureResult.texture,
      textureData: textureResult.data,
      lightingInfo: lightingInfo
    };
  }

  applySkyboxToScene(skyboxId, sceneManager) {
    const skyboxData = this.skyboxes.get(skyboxId);
    if (!skyboxData) return false;
    
    const texture = this.textureManager.getTexture(skyboxData.textureId);
    if (!texture) return false;
    
    if (skyboxData.type === 'equirectangular') {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      sceneManager.skyboxEquirectangularTexture = texture;
      sceneManager.setSkyboxType('equirectangular');
    } else {
      sceneManager.skyboxTexture = texture;
      sceneManager.setSkyboxType('cube');
    }
    
    if (skyboxData.lightingInfo) {
      const info = skyboxData.lightingInfo;
      const intensity = Math.max(0.3, Math.min(2.0, info.averageBrightness * 1.5));
      
      sceneManager.scene.traverse((obj) => {
        if (obj.isAmbientLight) {
          obj.intensity = intensity;
        }
        if (obj.isDirectionalLight) {
          obj.position.set(
            info.dominantDirection.x * 10,
            Math.max(3, Math.abs(info.dominantDirection.y * 10)),
            info.dominantDirection.z * 10
          );
        }
      });
    }
    
    return true;
  }

  getSkyboxLightingInfo(skyboxId) {
    const skyboxData = this.skyboxes.get(skyboxId);
    return skyboxData ? skyboxData.lightingInfo : null;
  }

  serialize() {
    return {
      textures: this.textureManager.serialize(),
      materials: this.materialManager.serialize(),
      skyboxes: Array.from(this.skyboxes.values())
    };
  }

  async deserialize(data) {
    if (data.textures) {
      await this.textureManager.deserialize(data.textures);
    }
    
    if (data.materials) {
      this.materialManager.deserialize(data.materials);
    }
    
    if (data.skyboxes) {
      for (const skybox of data.skyboxes) {
        this.skyboxes.set(skybox.id, skybox);
      }
    }
  }

  clear() {
    this.textureManager.clear();
    this.materialManager.clear();
    this.models.clear();
    this.skyboxes.clear();
  }
}

export function createResourceManager() {
  return new ResourceManager();
}
