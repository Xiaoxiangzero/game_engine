import * as THREE from 'three';
import { TextureType } from './TextureManager.js';

export const MaterialType = {
  STANDARD: 'standard',
  PHYSICAL: 'physical',
  LAMBERT: 'lambert',
  PHONG: 'phong',
  BASIC: 'basic'
};

export class MaterialManager {
  constructor(textureManager) {
    this.textureManager = textureManager;
    this.materials = new Map();
    this.materialData = new Map();
    this.nextId = 1;
  }

  createMaterial(type = MaterialType.STANDARD, options = {}) {
    let material;
    
    switch (type) {
      case MaterialType.PHYSICAL:
        material = new THREE.MeshPhysicalMaterial({
          color: options.color || 0xffffff,
          metalness: options.metalness || 0,
          roughness: options.roughness || 0.5,
          clearcoat: options.clearcoat || 0,
          clearcoatRoughness: options.clearcoatRoughness || 0.1,
          emissive: options.emissive || 0x000000,
          emissiveIntensity: options.emissiveIntensity || 1,
          transparent: options.transparent || false,
          opacity: options.opacity !== undefined ? options.opacity : 1,
          side: options.side || THREE.FrontSide
        });
        break;
        
      case MaterialType.LAMBERT:
        material = new THREE.MeshLambertMaterial({
          color: options.color || 0xffffff,
          emissive: options.emissive || 0x000000,
          transparent: options.transparent || false,
          opacity: options.opacity !== undefined ? options.opacity : 1,
          side: options.side || THREE.FrontSide
        });
        break;
        
      case MaterialType.PHONG:
        material = new THREE.MeshPhongMaterial({
          color: options.color || 0xffffff,
          shininess: options.shininess || 30,
          specular: options.specular || 0x111111,
          emissive: options.emissive || 0x000000,
          transparent: options.transparent || false,
          opacity: options.opacity !== undefined ? options.opacity : 1,
          side: options.side || THREE.FrontSide
        });
        break;
        
      case MaterialType.BASIC:
        material = new THREE.MeshBasicMaterial({
          color: options.color || 0xffffff,
          transparent: options.transparent || false,
          opacity: options.opacity !== undefined ? options.opacity : 1,
          side: options.side || THREE.FrontSide
        });
        break;
        
      case MaterialType.STANDARD:
      default:
        material = new THREE.MeshStandardMaterial({
          color: options.color || 0xffffff,
          metalness: options.metalness || 0,
          roughness: options.roughness || 0.5,
          emissive: options.emissive || 0x000000,
          emissiveIntensity: options.emissiveIntensity || 1,
          transparent: options.transparent || false,
          opacity: options.opacity !== undefined ? options.opacity : 1,
          side: options.side || THREE.FrontSide
        });
        break;
    }
    
    const id = 'mat_' + this.nextId++;
    const data = {
      id: id,
      name: options.name || 'Material_' + id,
      type: type,
      textures: {}
    };
    
    material.userData.materialId = id;
    this.materials.set(id, material);
    this.materialData.set(id, data);
    
    return { material, data };
  }

  setAlbedoTexture(materialId, textureId) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    const texture = this.textureManager.getTexture(textureId);
    
    if (!material || !data || !texture) return false;
    
    if (material.map) {
      material.map.dispose();
    }
    
    material.map = texture;
    material.needsUpdate = true;
    data.textures.albedo = textureId;
    
    return true;
  }

  setNormalTexture(materialId, textureId, normalScale = 1.0) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    const texture = this.textureManager.getTexture(textureId);
    
    if (!material || !data || !texture) return false;
    
    if (material.normalMap) {
      material.normalMap.dispose();
    }
    
    material.normalMap = texture;
    material.normalScale = new THREE.Vector2(normalScale, normalScale);
    material.needsUpdate = true;
    data.textures.normal = textureId;
    data.normalScale = normalScale;
    
    return true;
  }

  setMetalnessTexture(materialId, textureId) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    const texture = this.textureManager.getTexture(textureId);
    
    if (!material || !data || !texture) return false;
    
    if (material.metalnessMap) {
      material.metalnessMap.dispose();
    }
    
    material.metalnessMap = texture;
    material.needsUpdate = true;
    data.textures.metalness = textureId;
    
    return true;
  }

  setRoughnessTexture(materialId, textureId) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    const texture = this.textureManager.getTexture(textureId);
    
    if (!material || !data || !texture) return false;
    
    if (material.roughnessMap) {
      material.roughnessMap.dispose();
    }
    
    material.roughnessMap = texture;
    material.needsUpdate = true;
    data.textures.roughness = textureId;
    
    return true;
  }

  setMetalRoughnessTexture(materialId, textureId) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    const texture = this.textureManager.getTexture(textureId);
    
    if (!material || !data || !texture) return false;
    
    if (material.metalnessMap) {
      material.metalnessMap.dispose();
    }
    if (material.roughnessMap) {
      material.roughnessMap.dispose();
    }
    
    material.metalnessMap = texture;
    material.roughnessMap = texture;
    material.needsUpdate = true;
    data.textures.metalRoughness = textureId;
    
    return true;
  }

  setAOTexture(materialId, textureId, aoIntensity = 1.0) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    const texture = this.textureManager.getTexture(textureId);
    
    if (!material || !data || !texture) return false;
    
    if (material.aoMap) {
      material.aoMap.dispose();
    }
    
    material.aoMap = texture;
    material.aoMapIntensity = aoIntensity;
    material.needsUpdate = true;
    data.textures.ao = textureId;
    data.aoMapIntensity = aoIntensity;
    
    return true;
  }

  setEmissiveTexture(materialId, textureId, emissiveIntensity = 1.0) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    const texture = this.textureManager.getTexture(textureId);
    
    if (!material || !data || !texture) return false;
    
    if (material.emissiveMap) {
      material.emissiveMap.dispose();
    }
    
    material.emissiveMap = texture;
    material.emissiveIntensity = emissiveIntensity;
    material.needsUpdate = true;
    data.textures.emissive = textureId;
    data.emissiveIntensity = emissiveIntensity;
    
    return true;
  }

  setDisplacementTexture(materialId, textureId, scale = 1.0, bias = 0.0) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    const texture = this.textureManager.getTexture(textureId);
    
    if (!material || !data || !texture) return false;
    
    if (material.displacementMap) {
      material.displacementMap.dispose();
    }
    
    material.displacementMap = texture;
    material.displacementScale = scale;
    material.displacementBias = bias;
    material.needsUpdate = true;
    data.textures.displacement = textureId;
    data.displacementScale = scale;
    data.displacementBias = bias;
    
    return true;
  }

  setMaterialProperty(materialId, property, value) {
    const material = this.materials.get(materialId);
    const data = this.materialData.get(materialId);
    
    if (!material || !data) return false;
    
    material[property] = value;
    material.needsUpdate = true;
    
    if (!data.properties) data.properties = {};
    data.properties[property] = value;
    
    return true;
  }

  getMaterial(id) {
    return this.materials.get(id) || null;
  }

  getMaterialData(id) {
    return this.materialData.get(id) || null;
  }

  removeMaterial(id) {
    const material = this.materials.get(id);
    if (material) {
      material.dispose();
      this.materials.delete(id);
      this.materialData.delete(id);
    }
  }

  clear() {
    this.materials.forEach((material) => {
      material.dispose();
    });
    this.materials.clear();
    this.materialData.clear();
  }

  serialize() {
    const materialsData = [];
    this.materialData.forEach((data) => {
      const material = this.materials.get(data.id);
      if (!material) return;
      
      const matData = {
        id: data.id,
        name: data.name,
        type: data.type,
        textures: { ...data.textures }
      };
      
      if (material.color) {
        matData.color = '#' + material.color.getHexString();
      }
      if (material.metalness !== undefined) {
        matData.metalness = material.metalness;
      }
      if (material.roughness !== undefined) {
        matData.roughness = material.roughness;
      }
      if (material.emissive) {
        matData.emissive = '#' + material.emissive.getHexString();
      }
      if (material.emissiveIntensity !== undefined) {
        matData.emissiveIntensity = material.emissiveIntensity;
      }
      if (material.opacity !== undefined) {
        matData.opacity = material.opacity;
      }
      if (material.transparent !== undefined) {
        matData.transparent = material.transparent;
      }
      
      if (data.normalScale) {
        matData.normalScale = data.normalScale;
      }
      if (data.aoMapIntensity) {
        matData.aoMapIntensity = data.aoMapIntensity;
      }
      if (data.displacementScale !== undefined) {
        matData.displacementScale = data.displacementScale;
        matData.displacementBias = data.displacementBias;
      }
      
      materialsData.push(matData);
    });
    
    return materialsData;
  }

  deserialize(dataArray) {
    const results = [];
    
    for (const data of dataArray) {
      const options = {
        name: data.name,
        color: data.color ? parseInt(data.color.replace('#', ''), 16) : 0xffffff,
        metalness: data.metalness !== undefined ? data.metalness : 0,
        roughness: data.roughness !== undefined ? data.roughness : 0.5,
        emissive: data.emissive ? parseInt(data.emissive.replace('#', ''), 16) : 0x000000,
        emissiveIntensity: data.emissiveIntensity || 1,
        opacity: data.opacity !== undefined ? data.opacity : 1,
        transparent: data.transparent || false
      };
      
      const result = this.createMaterial(data.type, options);
      
      if (data.textures) {
        if (data.textures.albedo) {
          this.setAlbedoTexture(result.data.id, data.textures.albedo);
        }
        if (data.textures.normal) {
          this.setNormalTexture(result.data.id, data.textures.normal, data.normalScale || 1.0);
        }
        if (data.textures.metalness) {
          this.setMetalnessTexture(result.data.id, data.textures.metalness);
        }
        if (data.textures.roughness) {
          this.setRoughnessTexture(result.data.id, data.textures.roughness);
        }
        if (data.textures.metalRoughness) {
          this.setMetalRoughnessTexture(result.data.id, data.textures.metalRoughness);
        }
        if (data.textures.ao) {
          this.setAOTexture(result.data.id, data.textures.ao, data.aoMapIntensity || 1.0);
        }
        if (data.textures.emissive) {
          this.setEmissiveTexture(result.data.id, data.textures.emissive, data.emissiveIntensity || 1.0);
        }
        if (data.textures.displacement) {
          this.setDisplacementTexture(
            result.data.id, 
            data.textures.displacement, 
            data.displacementScale || 1.0, 
            data.displacementBias || 0.0
          );
        }
      }
      
      results.push(result);
    }
    
    return results;
  }
}

export function createMaterialManager(textureManager) {
  return new MaterialManager(textureManager);
}
