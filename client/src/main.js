import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { EngineAPI } from './engine/EngineAPI.js';

class MiniGameEngine {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.sceneManager = null;
    this.engineAPI = null;
    this.isPlaying = false;
    this.currentTool = 'select';
    this.currentView = 'perspective';
    this.selectedPresetIndex = -1;
    
    this.init();
    this.setupEventListeners();
    this.connectToServer();
  }

  init() {
    this.sceneManager = new SceneManager(
      this.container,
      () => this.onSceneChange()
    );
    this.engineAPI = new EngineAPI(this.sceneManager);
    
    this.initMaterialPresets();
    this.updateSceneTree();
    this.updateStatusBar();
  }

  initMaterialPresets() {
    const presets = this.sceneManager.materialPresets;
    
    const libraryContainer = document.getElementById('material-presets');
    const objContainer = document.getElementById('obj-material-presets');
    
    const createPresetElements = (container, isLibrary = false) => {
      container.innerHTML = '';
      
      presets.forEach((preset, index) => {
        const presetEl = document.createElement('div');
        presetEl.className = 'material-preset';
        presetEl.style.background = preset.color;
        presetEl.title = preset.name;
        presetEl.dataset.index = index;
        
        if (preset.transparent) {
          presetEl.style.opacity = preset.opacity || 0.5;
        }
        
        presetEl.addEventListener('click', () => {
          if (isLibrary) {
            if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.material) {
              this.sceneManager.applyMaterialPreset(
                this.sceneManager.selectedObject,
                index
              );
              this.updatePropertyPanel();
            }
          } else {
            if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.material) {
              this.sceneManager.applyMaterialPreset(
                this.sceneManager.selectedObject,
                index
              );
              this.updatePropertyPanel();
              
              document.querySelectorAll('#obj-material-presets .material-preset').forEach(el => {
                el.classList.remove('selected');
              });
              presetEl.classList.add('selected');
            }
          }
        });
        
        container.appendChild(presetEl);
      });
    };
    
    createPresetElements(libraryContainer, true);
    createPresetElements(objContainer, false);
  }

  setupEventListeners() {
    document.getElementById('play-btn').addEventListener('click', () => this.togglePlay());
    document.getElementById('reset-btn').addEventListener('click', () => this.reset());

    const tools = ['select', 'move', 'rotate', 'scale'];
    tools.forEach(tool => {
      const btn = document.getElementById(`tool-${tool}`);
      if (btn) {
        btn.addEventListener('click', () => this.setTool(tool));
      }
    });

    const viewBtns = ['perspective', 'top', 'front', 'right', 'reset'];
    viewBtns.forEach(view => {
      const btn = document.getElementById(`view-${view}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (view === 'reset') {
            this.sceneManager.resetView();
          } else {
            this.setView(view);
          }
        });
      }
    });

    document.getElementById('btn-add-cube').addEventListener('click', () => this.addObject('cube'));
    document.getElementById('btn-add-sphere').addEventListener('click', () => this.addObject('sphere'));
    document.getElementById('btn-add-cylinder').addEventListener('click', () => this.addObject('cylinder'));
    document.getElementById('btn-add-plane').addEventListener('click', () => this.addObject('plane'));
    document.getElementById('btn-add-light').addEventListener('click', () => this.addObject('light'));

    document.getElementById('btn-delete').addEventListener('click', () => this.deleteSelected());
    document.getElementById('btn-duplicate').addEventListener('click', () => this.duplicateSelected());

    ['pos-x', 'pos-y', 'pos-z'].forEach((id, index) => {
      const input = document.getElementById(id);
      input.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const pos = this.sceneManager.getObjectPosition(this.sceneManager.selectedObject);
          const axes = ['x', 'y', 'z'];
          pos[axes[index]] = parseFloat(e.target.value);
          this.sceneManager.updateObjectPosition(
            this.sceneManager.selectedObject,
            pos.x, pos.y, pos.z
          );
        }
      });
    });

    ['rot-x', 'rot-y', 'rot-z'].forEach((id, index) => {
      const input = document.getElementById(id);
      input.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const rot = this.sceneManager.getObjectRotation(this.sceneManager.selectedObject);
          const axes = ['x', 'y', 'z'];
          rot[axes[index]] = parseFloat(e.target.value);
          this.sceneManager.updateObjectRotation(
            this.sceneManager.selectedObject,
            rot.x, rot.y, rot.z
          );
        }
      });
    });

    ['scale-x', 'scale-y', 'scale-z'].forEach((id, index) => {
      const input = document.getElementById(id);
      input.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const scale = this.sceneManager.getObjectScale(this.sceneManager.selectedObject);
          const axes = ['x', 'y', 'z'];
          scale[axes[index]] = parseFloat(e.target.value);
          this.sceneManager.updateObjectScale(
            this.sceneManager.selectedObject,
            scale.x, scale.y, scale.z
          );
        }
      });
    });

    document.getElementById('material-color').addEventListener('input', (e) => {
      if (this.sceneManager.selectedObject) {
        this.sceneManager.updateMaterialColor(
          this.sceneManager.selectedObject,
          e.target.value
        );
        document.getElementById('color-preview').style.backgroundColor = e.target.value;
      }
    });

    ['material-roughness', 'material-metalness', 'material-opacity'].forEach(id => {
      const input = document.getElementById(id);
      const valueId = id.replace('material-', '') + '-value';
      const valueEl = document.getElementById(valueId);
      
      input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (valueEl) valueEl.textContent = value.toFixed(2);
        
        if (this.sceneManager.selectedObject) {
          const props = {};
          if (id === 'material-roughness') props.roughness = value;
          if (id === 'material-metalness') props.metalness = value;
          if (id === 'material-opacity') props.opacity = value;
          
          this.sceneManager.updateMaterialProperties(
            this.sceneManager.selectedObject,
            props
          );
        }
      });
    });

    document.getElementById('obj-name').addEventListener('change', (e) => {
      if (this.sceneManager.selectedObject) {
        this.sceneManager.selectedObject.name = e.target.value;
        this.updateSceneTree();
      }
    });

    document.getElementById('light-intensity').addEventListener('input', (e) => {
      if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.isLight) {
        this.sceneManager.selectedObject.intensity = parseFloat(e.target.value);
        document.getElementById('light-intensity-value').textContent = parseFloat(e.target.value).toFixed(1);
      }
    });

    document.getElementById('light-color').addEventListener('input', (e) => {
      if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.isLight) {
        this.sceneManager.selectedObject.color.set(e.target.value);
        document.getElementById('light-color-preview').style.backgroundColor = e.target.value;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.key.toLowerCase()) {
        case 'q':
          this.setTool('select');
          break;
        case 'w':
          this.setTool('move');
          break;
        case 'e':
          this.setTool('rotate');
          break;
        case 'r':
          this.setTool('scale');
          break;
        case 'delete':
        case 'backspace':
          this.deleteSelected();
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.duplicateSelected();
          }
          break;
        case 'escape':
          this.sceneManager.deselectObject();
          break;
      }
    });
  }

  connectToServer() {
    this.engineAPI.connect('ws://localhost:8765')
      .then(() => {
        console.log('Connected to Python server');
        this.updateStatus(true);
      })
      .catch((error) => {
        console.warn('Could not connect to Python server:', error);
        this.updateStatus(false);
      });
  }

  onSceneChange() {
    this.updateSceneTree();
    this.updatePropertyPanel();
    this.updateStatusBar();
  }

  updateSceneTree() {
    const treeEl = document.getElementById('scene-tree');
    const objects = this.sceneManager.objects;
    
    treeEl.innerHTML = '';
    
    if (objects.length === 0) {
      treeEl.innerHTML = '<li class="scene-tree-item" style="opacity: 0.5; cursor: default;">场景为空</li>';
      return;
    }
    
    objects.forEach((obj, index) => {
      const li = document.createElement('li');
      li.className = 'scene-tree-item';
      if (obj === this.sceneManager.selectedObject) {
        li.classList.add('selected');
      }
      
      const typeIcons = {
        cube: '▢',
        sphere: '●',
        cylinder: '◎',
        plane: '▬',
        pointlight: '☀'
      };
      
      const typeNames = {
        cube: '立方体',
        sphere: '球体',
        cylinder: '圆柱体',
        plane: '平面',
        pointlight: '点光源'
      };
      
      const icon = typeIcons[obj.userData.objectType] || '▢';
      
      li.innerHTML = `
        <span class="icon">${icon}</span>
        <span>${obj.name}</span>
      `;
      
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sceneManager.selectObject(obj);
      });
      
      treeEl.appendChild(li);
    });
  }

  updatePropertyPanel() {
    const info = this.sceneManager.getSelectedObjectInfo();
    const noSelection = document.getElementById('no-selection');
    const sections = ['section-name', 'section-transform', 'section-material', 'section-light'];
    
    if (!info) {
      noSelection.style.display = 'block';
      sections.forEach(id => {
        document.getElementById(id).style.display = 'none';
      });
      return;
    }
    
    noSelection.style.display = 'none';
    
    document.getElementById('section-name').style.display = 'block';
    document.getElementById('obj-name').value = info.name;
    document.getElementById('obj-type').textContent = this.getObjectTypeName(info.type);
    
    document.getElementById('section-transform').style.display = 'block';
    document.getElementById('pos-x').value = info.position.x;
    document.getElementById('pos-y').value = info.position.y;
    document.getElementById('pos-z').value = info.position.z;
    document.getElementById('rot-x').value = info.rotation.x;
    document.getElementById('rot-y').value = info.rotation.y;
    document.getElementById('rot-z').value = info.rotation.z;
    document.getElementById('scale-x').value = info.scale.x;
    document.getElementById('scale-y').value = info.scale.y;
    document.getElementById('scale-z').value = info.scale.z;
    
    if (info.material && !info.isLight) {
      document.getElementById('section-material').style.display = 'block';
      document.getElementById('material-color').value = info.material.color;
      document.getElementById('color-preview').style.backgroundColor = info.material.color;
      document.getElementById('material-roughness').value = info.material.roughness;
      document.getElementById('roughness-value').textContent = info.material.roughness.toFixed(2);
      document.getElementById('material-metalness').value = info.material.metalness;
      document.getElementById('metalness-value').textContent = info.material.metalness.toFixed(2);
      document.getElementById('material-opacity').value = info.material.opacity;
      document.getElementById('opacity-value').textContent = info.material.opacity.toFixed(2);
    } else {
      document.getElementById('section-material').style.display = 'none';
    }
    
    if (info.isLight && info.light) {
      document.getElementById('section-light').style.display = 'block';
      document.getElementById('light-intensity').value = info.light.intensity;
      document.getElementById('light-intensity-value').textContent = info.light.intensity.toFixed(1);
      document.getElementById('light-color').value = info.light.color;
      document.getElementById('light-color-preview').style.backgroundColor = info.light.color;
    } else {
      document.getElementById('section-light').style.display = 'none';
    }
    
    this.updateSelectionInfo(info);
  }

  updateSelectionInfo(info) {
    const el = document.getElementById('selection-info');
    if (!info) {
      el.textContent = '';
      return;
    }
    
    const pos = info.position;
    el.textContent = `选中: ${info.name} | 位置: (${pos.x}, ${pos.y}, ${pos.z})`;
  }

  getObjectTypeName(type) {
    const names = {
      cube: '立方体',
      sphere: '球体',
      cylinder: '圆柱体',
      plane: '平面',
      pointlight: '点光源',
      mesh: '网格'
    };
    return names[type] || type;
  }

  updateStatusBar() {
    const objects = this.sceneManager.objects;
    const selected = this.sceneManager.selectedObject;
    
    document.getElementById('object-count').textContent = `物体: ${objects.length}`;
    document.getElementById('selected-count').textContent = `选中: ${selected ? 1 : 0}`;
  }

  setTool(tool) {
    this.currentTool = tool;
    this.sceneManager.setTool(tool);
    
    ['select', 'move', 'rotate', 'scale'].forEach(t => {
      const btn = document.getElementById(`tool-${t}`);
      if (btn) {
        if (t === tool) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
    
    const modeNames = {
      select: '选择模式',
      move: '移动模式',
      rotate: '旋转模式',
      scale: '缩放模式'
    };
    document.getElementById('current-mode').textContent = modeNames[tool] || tool;
  }

  setView(view) {
    this.currentView = view;
    this.sceneManager.setView(view);
    
    ['perspective', 'top', 'front', 'right'].forEach(v => {
      const btn = document.getElementById(`view-${v}`);
      if (btn) {
        if (v === view) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

  addObject(type) {
    this.sceneManager.addObject(type);
  }

  deleteSelected() {
    if (this.sceneManager.selectedObject) {
      this.sceneManager.removeObject(this.sceneManager.selectedObject);
    }
  }

  duplicateSelected() {
    if (this.sceneManager.selectedObject) {
      const newObj = this.sceneManager.duplicateObject(this.sceneManager.selectedObject);
      if (newObj) {
        this.sceneManager.selectObject(newObj);
      }
    }
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const playBtn = document.getElementById('play-btn');
    
    if (this.isPlaying) {
      playBtn.innerHTML = '<span>⏸</span><span>暂停执行</span>';
      playBtn.classList.remove('play');
      playBtn.classList.add('pause');
      this.startExecution();
    } else {
      playBtn.innerHTML = '<span>▶</span><span>开始执行</span>';
      playBtn.classList.remove('pause');
      playBtn.classList.add('play');
      this.stopExecution();
    }
  }

  startExecution() {
    console.log('Starting execution...');
    if (this.engineAPI.isConnected()) {
      this.engineAPI.startGameLoop();
    }
  }

  stopExecution() {
    console.log('Stopping execution...');
    if (this.engineAPI.isConnected()) {
      this.engineAPI.stopGameLoop();
    }
  }

  reset() {
    console.log('Resetting scene...');
    this.sceneManager.reset();
  }

  updateStatus(connected) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (connected) {
      statusDot.classList.remove('disconnected');
      statusText.textContent = '已连接到Python服务器';
    } else {
      statusDot.classList.add('disconnected');
      statusText.textContent = '独立模式 (未连接)';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MiniGameEngine();
});
