import * as THREE from 'three';

export const TextureType = {
  ALBEDO: 'albedo',
  NORMAL: 'normal',
  METALNESS: 'metalness',
  ROUGHNESS: 'roughness',
  AO: 'ao',
  DISPLACEMENT: 'displacement',
  EMISSIVE: 'emissive',
  METAL_ROUGHNESS: 'metalRoughness',
  ENVIRONMENT: 'environment',
  SKYBOX: 'skybox'
};

export class TextureManager {
  constructor() {
    this.textures = new Map();
    this.textureData = new Map();
    this.loader = new THREE.TextureLoader();
    this.nextId = 1;
  }

  loadTextureFromFile(file, type = TextureType.ALBEDO) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        
        this.loader.load(
          imageUrl,
          (texture) => {
            const id = 'tex_' + this.nextId++;
            const data = {
              id: id,
              name: file.name,
              type: type,
              url: imageUrl,
              width: texture.image.width,
              height: texture.image.height
            };
            
            texture.userData.textureId = id;
            this.textures.set(id, texture);
            this.textureData.set(id, data);
            
            resolve({ texture, data });
          },
          undefined,
          (error) => {
            reject(error);
          }
        );
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  loadTextureFromUrl(url, name, type = TextureType.ALBEDO) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          const id = 'tex_' + this.nextId++;
          const data = {
            id: id,
            name: name,
            type: type,
            url: url,
            width: texture.image ? texture.image.width : 0,
            height: texture.image ? texture.image.height : 0
          };
          
          texture.userData.textureId = id;
          this.textures.set(id, texture);
          this.textureData.set(id, data);
          
          resolve({ texture, data });
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  getTexture(id) {
    return this.textures.get(id) || null;
  }

  getTextureData(id) {
    return this.textureData.get(id) || null;
  }

  removeTexture(id) {
    const texture = this.textures.get(id);
    if (texture) {
      texture.dispose();
      this.textures.delete(id);
      this.textureData.delete(id);
    }
  }

  clear() {
    this.textures.forEach((texture) => {
      texture.dispose();
    });
    this.textures.clear();
    this.textureData.clear();
  }

  analyzeLighting(texture) {
    if (!texture || !texture.image) {
      return {
        averageBrightness: 0.5,
        dominantDirection: { x: 0, y: 1, z: 0 },
        colorTemperature: 5500
      };
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;
    
    ctx.drawImage(texture.image, 0, 0, 64, 64);
    
    const imageData = ctx.getImageData(0, 0, 64, 64);
    const data = imageData.data;
    
    let totalBrightness = 0;
    let totalR = 0, totalG = 0, totalB = 0;
    let maxBrightness = 0;
    let maxBrightnessPos = { x: 32, y: 32 };
    
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const idx = (y * 64 + x) * 4;
        const r = data[idx] / 255;
        const g = data[idx + 1] / 255;
        const b = data[idx + 2] / 255;
        
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
        totalR += r;
        totalG += g;
        totalB += b;
        
        if (brightness > maxBrightness) {
          maxBrightness = brightness;
          maxBrightnessPos = { x, y };
        }
      }
    }
    
    const pixelCount = 64 * 64;
    const avgBrightness = totalBrightness / pixelCount;
    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    
    const lightDir = this._calculateLightDirection(maxBrightnessPos);
    const colorTemp = this._estimateColorTemperature(avgR, avgG, avgB);
    
    return {
      averageBrightness: avgBrightness,
      maxBrightness: maxBrightness,
      dominantDirection: lightDir,
      colorTemperature: colorTemp,
      averageColor: { r: avgR, g: avgG, b: avgB }
    };
  }

  _calculateLightDirection(pixelPos) {
    const u = (pixelPos.x - 32) / 32;
    const v = (32 - pixelPos.y) / 32;
    
    const longitude = u * Math.PI;
    const latitude = v * Math.PI / 2;
    
    const x = Math.cos(latitude) * Math.sin(longitude);
    const y = Math.sin(latitude);
    const z = -Math.cos(latitude) * Math.cos(longitude);
    
    const length = Math.sqrt(x * x + y * y + z * z);
    return {
      x: x / length,
      y: y / length,
      z: z / length
    };
  }

  _estimateColorTemperature(r, g, b) {
    const sum = r + g + b;
    if (sum === 0) return 5500;
    
    const normR = r / sum;
    const normG = g / sum;
    const normB = b / sum;
    
    const tempFactor = (normR - normB);
    
    if (tempFactor > 0.1) {
      return 2500 + tempFactor * 5000;
    } else if (tempFactor < -0.1) {
      return 8000 + tempFactor * 10000;
    }
    return 5500;
  }

  serialize() {
    const data = [];
    this.textureData.forEach((texData) => {
      data.push({
        id: texData.id,
        name: texData.name,
        type: texData.type,
        url: texData.url,
        width: texData.width,
        height: texData.height
      });
    });
    return data;
  }

  deserialize(dataArray) {
    const promises = [];
    for (const data of dataArray) {
      const promise = this.loadTextureFromUrl(data.url, data.name, data.type);
      promises.push(promise);
    }
    return Promise.all(promises);
  }
}

export function createTextureManager() {
  return new TextureManager();
}
