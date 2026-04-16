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
    this.sceneManager.updateSelectedObjectPosition([x, y, z]);
  }

  handleObjectRotation(data) {
    const { x, y, z } = data;
    const mainObject = this.sceneManager.getMainObject();
    if (mainObject) {
      mainObject.rotation.set(x, y, z);
    }
  }

  handleObjectScale(data) {
    const { x, y, z } = data;
    const mainObject = this.sceneManager.getMainObject();
    if (mainObject) {
      mainObject.scale.set(x, y, z);
    }
  }

  handleMaterialColor(data) {
    const { color } = data;
    this.sceneManager.updateMaterialColor(color);
  }

  handleLightIntensity(data) {
    const { intensity } = data;
    this.sceneManager.updateLightIntensity(intensity);
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
    const mainObject = this.sceneManager.getMainObject();
    const light = this.sceneManager.getLight();
    
    return {
      objects: mainObject ? [{
        name: 'Main Cube',
        position: {
          x: mainObject.position.x,
          y: mainObject.position.y,
          z: mainObject.position.z
        },
        rotation: {
          x: mainObject.rotation.x,
          y: mainObject.rotation.y,
          z: mainObject.rotation.z
        },
        scale: {
          x: mainObject.scale.x,
          y: mainObject.scale.y,
          z: mainObject.scale.z
        },
        material: {
          color: mainObject.material.color.getHexString()
        }
      }] : [],
      lighting: {
        intensity: light ? light.intensity : 1.0,
        position: light ? {
          x: light.position.x,
          y: light.position.y,
          z: light.position.z
        } : {}
      }
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