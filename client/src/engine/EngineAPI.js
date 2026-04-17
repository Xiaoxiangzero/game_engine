export class EngineAPI {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.ws = null;
    this.isConnected_ = false;
    this.gameLoopRunning = false;
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnected_ = true;
          this.sendInitMessage();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          this.isConnected_ = false;
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  sendInitMessage() {
    const message = {
      type: 'init',
      data: {
        engine_version: '1.0.0',
        capabilities: ['3d_rendering', 'materials', 'lighting', 'physics', 'scripting']
      }
    };
    this.send(message);
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('Received message from Python:', message);
      
      switch (message.type) {
        case 'object_position':
          this.handleObjectPosition(message.data);
          break;
        case 'object_rotation':
          this.handleObjectRotation(message.data);
          break;
        case 'object_scale':
          this.handleObjectScale(message.data);
          break;
        case 'material_color':
          this.handleMaterialColor(message.data);
          break;
        case 'light_intensity':
          this.handleLightIntensity(message.data);
          break;
        case 'execute_code':
          this.handleExecuteCode(message.data);
          break;
        case 'get_scene_info':
          this.handleGetSceneInfo(message.data);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  handleObjectPosition(data) {
    const { x, y, z } = data;
    if (this.sceneManager.selectedObject) {
      this.sceneManager.updateObjectPosition(
        this.sceneManager.selectedObject,
        x, y, z
      );
    }
  }

  handleObjectRotation(data) {
    const { x, y, z } = data;
    if (this.sceneManager.selectedObject) {
      this.sceneManager.updateObjectRotation(
        this.sceneManager.selectedObject,
        x, y, z
      );
    }
  }

  handleObjectScale(data) {
    const { x, y, z } = data;
    if (this.sceneManager.selectedObject) {
      this.sceneManager.updateObjectScale(
        this.sceneManager.selectedObject,
        x, y, z
      );
    }
  }

  handleMaterialColor(data) {
    const { color } = data;
    if (this.sceneManager.selectedObject) {
      this.sceneManager.updateMaterialColor(
        this.sceneManager.selectedObject,
        color
      );
    }
  }

  handleLightIntensity(data) {
    const { intensity } = data;
    if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.isLight) {
      this.sceneManager.selectedObject.intensity = intensity;
    }
  }

  handleExecuteCode(data) {
    console.log('Execute code request:', data);
    // 这里可以执行JavaScript代码
    try {
      // 安全考虑，不直接执行任意代码
      // 可以实现一个安全的脚本系统
      console.log('Code execution not implemented in secure mode');
    } catch (error) {
      console.error('Code execution error:', error);
    }
  }

  handleGetSceneInfo(data) {
    const sceneInfo = this.getSceneInfo();
    this.send({
      type: 'scene_info',
      data: sceneInfo
    });
  }

  getSceneInfo() {
    const objects = this.sceneManager.objects.map(obj => {
      const info = {
        id: obj.id,
        name: obj.name,
        type: obj.userData.objectType || 'mesh',
        position: {
          x: obj.position.x,
          y: obj.position.y,
          z: obj.position.z
        },
        rotation: {
          x: obj.rotation.x,
          y: obj.rotation.y,
          z: obj.rotation.z
        },
        scale: {
          x: obj.scale.x,
          y: obj.scale.y,
          z: obj.scale.z
        }
      };
      
      if (obj.material) {
        info.material = {
          color: '#' + obj.material.color.getHexString(),
          roughness: obj.material.roughness,
          metalness: obj.material.metalness
        };
      }
      
      if (obj.isLight) {
        info.light = {
          intensity: obj.intensity || 1.0,
          color: obj.color ? '#' + obj.color.getHexString() : '#ffffff'
        };
      }
      
      return info;
    });
    
    return {
      objects: objects,
      selectedObject: this.sceneManager.selectedObject ? {
        id: this.sceneManager.selectedObject.id,
        name: this.sceneManager.selectedObject.name
      } : null
    };
  }

  send(message) {
    if (this.isConnected_ && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  startGameLoop() {
    this.gameLoopRunning = true;
    this.send({
      type: 'start_game_loop',
      data: {}
    });
  }

  stopGameLoop() {
    this.gameLoopRunning = false;
    this.send({
      type: 'stop_game_loop',
      data: {}
    });
  }

  isConnected() {
    return this.isConnected_ && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected_ = false;
    }
  }
}