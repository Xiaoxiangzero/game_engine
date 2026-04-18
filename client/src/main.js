import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager.js';
import { EngineAPI } from './engine/EngineAPI.js';
import { AudioManager } from './engine/AudioManager.js';

class MiniGameEngine {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.sceneManager = null;
    this.engineAPI = null;
    this.audioManager = null;
    this.isPlaying = false;
    this.currentTool = 'select';
    this.currentView = 'perspective';
    this.selectedPresetIndex = -1;
    
    this.debugColliders = false;
    
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
    this.audioManager = new AudioManager();
    
    this.sceneManager.createDefaultObjects();
    
    this.initMaterialPresets();
    this.setupCollisionListeners();
    this.updateSceneTree();
    this.updateStatusBar();
    
    this.logToConsole('游戏引擎初始化完成', 'info');
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
    
    if (libraryContainer) createPresetElements(libraryContainer, true);
    if (objContainer) createPresetElements(objContainer, false);
  }

  setupEventListeners() {
    const menuItems = ['file', 'edit', 'view', 'game', 'component', 'tools', 'window', 'help'];
    menuItems.forEach(menu => {
      const menuItem = document.getElementById(`menu-${menu}`);
      if (menuItem) {
        menuItem.addEventListener('click', () => {
          this.audioManager.playClick();
          this.onMenuClick(menu);
        });
      }
    });

    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        this.togglePlay();
      });
    }
    
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        this.togglePlay();
      });
    }
    
    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        this.stopPlay();
      });
    }

    const tools = ['select', 'move', 'rotate', 'scale'];
    tools.forEach(tool => {
      const btn = document.getElementById(`tool-${tool}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.audioManager.playClick();
          this.setTool(tool);
        });
      }
    });

    const viewBtns = ['perspective', 'ortho', 'top', 'front', 'right', 'reset'];
    viewBtns.forEach(view => {
      const btn = document.getElementById(`view-${view}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.audioManager.playClick();
          if (view === 'reset') {
            this.sceneManager.resetView();
          } else {
            this.setView(view);
          }
        });
      }
    });

    const addButtons = ['cube', 'sphere', 'cylinder', 'plane', 'light', 'camera'];
    addButtons.forEach(type => {
      const btn = document.getElementById(`btn-add-${type}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.audioManager.playPickup();
          this.addObject(type);
        });
      }
    });

    const deleteBtn = document.getElementById('btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.audioManager.playBounce();
        this.deleteSelected();
      });
    }
    
    const duplicateBtn = document.getElementById('btn-duplicate');
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', () => {
        this.audioManager.playSuccess();
        this.duplicateSelected();
      });
    }

    const parentBtn = document.getElementById('btn-parent');
    if (parentBtn) {
      parentBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        console.log('Parent functionality not implemented yet');
      });
    }
    
    const unparentBtn = document.getElementById('btn-unparent');
    if (unparentBtn) {
      unparentBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        console.log('Unparent functionality not implemented yet');
      });
    }

    const physicsBtn = document.getElementById('btn-physics');
    if (physicsBtn) {
      physicsBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        this.togglePhysics();
      });
    }
    
    const debugColliderBtn = document.getElementById('btn-debug-collider');
    if (debugColliderBtn) {
      debugColliderBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        this.toggleDebugColliders();
      });
    }

    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        console.log('Save functionality not implemented yet');
      });
    }
    
    const loadBtn = document.getElementById('btn-load');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this.audioManager.playClick();
        console.log('Load functionality not implemented yet');
      });
    }

    this.setupPropertyListeners();
    this.setupColliderPropertyListeners();
    this.setupKeyboardListeners();
    this.setupPanelListeners();
  }

  setupPropertyListeners() {
    ['pos-x', 'pos-y', 'pos-z'].forEach((id, index) => {
      const input = document.getElementById(id);
      if (input) {
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
      }
    });

    ['rot-x', 'rot-y', 'rot-z'].forEach((id, index) => {
      const input = document.getElementById(id);
      if (input) {
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
      }
    });

    ['scale-x', 'scale-y', 'scale-z'].forEach((id, index) => {
      const input = document.getElementById(id);
      if (input) {
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
      }
    });

    const materialColor = document.getElementById('material-color');
    if (materialColor) {
      materialColor.addEventListener('input', (e) => {
        if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.material) {
          this.sceneManager.updateMaterialColor(
            this.sceneManager.selectedObject,
            e.target.value
          );
          const colorPreview = document.getElementById('color-preview');
          if (colorPreview) {
            colorPreview.style.backgroundColor = e.target.value;
          }
        }
      });
    }

    ['material-roughness', 'material-metalness', 'material-opacity'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
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
      }
    });

    const objName = document.getElementById('obj-name');
    if (objName) {
      objName.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          this.sceneManager.selectedObject.name = e.target.value;
          this.updateSceneTree();
        }
      });
    }

    const lightIntensity = document.getElementById('light-intensity');
    if (lightIntensity) {
      lightIntensity.addEventListener('input', (e) => {
        if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.isLight) {
          this.sceneManager.selectedObject.intensity = parseFloat(e.target.value);
          const valueEl = document.getElementById('light-intensity-value');
          if (valueEl) {
            valueEl.textContent = parseFloat(e.target.value).toFixed(1);
          }
        }
      });
    }

    const lightColor = document.getElementById('light-color');
    if (lightColor) {
      lightColor.addEventListener('input', (e) => {
        if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.isLight) {
          this.sceneManager.selectedObject.color.set(e.target.value);
          const preview = document.getElementById('light-color-preview');
          if (preview) {
            preview.style.backgroundColor = e.target.value;
          }
        }
      });
    }

    const lightRange = document.getElementById('light-range');
    if (lightRange) {
      lightRange.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.isLight) {
          this.sceneManager.updateLightProperties(
            this.sceneManager.selectedObject,
            { distance: parseFloat(e.target.value) || 20 }
          );
          this.logToConsole(`灯光范围已设置为: ${e.target.value}`, 'info');
        }
      });
    }

    const lightShadow = document.getElementById('light-shadow');
    if (lightShadow) {
      lightShadow.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject && this.sceneManager.selectedObject.isLight) {
          const castShadow = e.target.value === 'true';
          this.sceneManager.updateLightProperties(
            this.sceneManager.selectedObject,
            { castShadow: castShadow }
          );
          this.logToConsole(`灯光阴影已${castShadow ? '启用' : '禁用'}`, 'info');
        }
      });
    }
  }

  setupColliderPropertyListeners() {
    const colliderType = document.getElementById('collider-type');
    if (colliderType) {
      colliderType.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
          if (collider) {
            const newType = e.target.value;
            const sizeRow = document.getElementById('collider-size-row');
            const radiusRow = document.getElementById('collider-radius-row');
            
            if (newType === 'sphere') {
              if (sizeRow) sizeRow.style.display = 'none';
              if (radiusRow) radiusRow.style.display = 'flex';
            } else {
              if (sizeRow) sizeRow.style.display = 'flex';
              if (radiusRow) radiusRow.style.display = 'none';
            }
            
            this.sceneManager.setObjectColliderType(
              this.sceneManager.selectedObject,
              newType,
              {
                center: collider.center.clone(),
                size: collider.size.clone(),
                radius: collider.radius,
                height: collider.height,
                isStatic: collider.isStatic,
                isTrigger: collider.isTrigger,
                useGravity: collider.useGravity,
                mass: collider.mass,
                bounciness: collider.bounciness,
                friction: collider.friction
              }
            );
            
            this.updatePropertyPanel();
            this.logToConsole(`碰撞体类型已更改为: ${newType}`, 'info');
          }
        }
      });
    }

    const colliderStatic = document.getElementById('collider-static');
    if (colliderStatic) {
      colliderStatic.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          this.sceneManager.setColliderStatic(this.sceneManager.selectedObject, e.target.checked);
          this.logToConsole(`碰撞体静态属性: ${e.target.checked ? '开启' : '关闭'}`, 'info');
        }
      });
    }

    const colliderTrigger = document.getElementById('collider-trigger');
    if (colliderTrigger) {
      colliderTrigger.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          this.sceneManager.setColliderTrigger(this.sceneManager.selectedObject, e.target.checked);
          this.logToConsole(`碰撞体触发器属性: ${e.target.checked ? '开启' : '关闭'}`, 'info');
        }
      });
    }

    const colliderGravity = document.getElementById('collider-gravity');
    if (colliderGravity) {
      colliderGravity.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
          if (collider) {
            collider.useGravity = e.target.checked;
            this.logToConsole(`碰撞体重力: ${e.target.checked ? '开启' : '关闭'}`, 'info');
          }
        }
      });
    }

    const colliderMass = document.getElementById('collider-mass');
    if (colliderMass) {
      colliderMass.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
          if (collider) {
            collider.mass = Math.max(0.01, parseFloat(e.target.value) || 1);
            this.logToConsole(`碰撞体质量: ${collider.mass}`, 'info');
          }
        }
      });
    }

    const colliderBounciness = document.getElementById('collider-bounciness');
    if (colliderBounciness) {
      colliderBounciness.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
          if (collider) {
            collider.bounciness = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.2));
            this.logToConsole(`碰撞体弹性: ${collider.bounciness}`, 'info');
          }
        }
      });
    }

    const colliderFriction = document.getElementById('collider-friction');
    if (colliderFriction) {
      colliderFriction.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
          if (collider) {
            collider.friction = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5));
            this.logToConsole(`碰撞体摩擦: ${collider.friction}`, 'info');
          }
        }
      });
    }

    ['collider-center-x', 'collider-center-y', 'collider-center-z'].forEach((id, index) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', (e) => {
          if (this.sceneManager.selectedObject) {
            const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
            if (collider) {
              const axes = ['x', 'y', 'z'];
              collider.center[axes[index]] = parseFloat(e.target.value) || 0;
              collider.updateBounds();
              this.logToConsole(`碰撞体中心 ${axes[index].toUpperCase()}: ${collider.center[axes[index]]}`, 'info');
            }
          }
        });
      }
    });

    ['collider-size-x', 'collider-size-y', 'collider-size-z'].forEach((id, index) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', (e) => {
          if (this.sceneManager.selectedObject) {
            const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
            if (collider) {
              const axes = ['x', 'y', 'z'];
              collider.size[axes[index]] = Math.max(0.01, parseFloat(e.target.value) || 1);
              collider.updateBounds();
              this.logToConsole(`碰撞体大小 ${axes[index].toUpperCase()}: ${collider.size[axes[index]]}`, 'info');
            }
          }
        });
      }
    });

    const colliderRadius = document.getElementById('collider-radius');
    if (colliderRadius) {
      colliderRadius.addEventListener('change', (e) => {
        if (this.sceneManager.selectedObject) {
          const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
          if (collider) {
            collider.radius = Math.max(0.01, parseFloat(e.target.value) || 0.5);
            collider.updateBounds();
            this.logToConsole(`碰撞体半径: ${collider.radius}`, 'info');
          }
        }
      });
    }

    const addComponentBtn = document.getElementById('btn-add-component');
    if (addComponentBtn) {
      addComponentBtn.addEventListener('click', () => {
        if (this.sceneManager.selectedObject) {
          this.addColliderToSelectedObject();
        }
      });
    }

    const removeColliderBtn = document.getElementById('btn-remove-collider');
    if (removeColliderBtn) {
      removeColliderBtn.addEventListener('click', () => {
        if (this.sceneManager.selectedObject) {
          this.removeColliderFromSelectedObject();
        }
      });
    }
  }

  addColliderToSelectedObject() {
    if (!this.sceneManager.selectedObject) return;

    const obj = this.sceneManager.selectedObject;
    const existingCollider = this.sceneManager.getCollider(obj);
    
    if (existingCollider) {
      this.logToConsole('该物体已经有碰撞体', 'warning');
      return;
    }

    let colliderType = 'box';
    let options = {};

    const objectType = obj.userData.objectType;
    switch (objectType) {
      case 'sphere':
        colliderType = 'sphere';
        options = { radius: 0.5 };
        break;
      case 'cylinder':
        colliderType = 'capsule';
        options = { radius: 0.5, height: 1 };
        break;
      case 'plane':
        colliderType = 'box';
        options = { size: new THREE.Vector3(2, 0.01, 2) };
        break;
      default:
        options = { size: new THREE.Vector3(1, 1, 1) };
    }

    this.sceneManager.setObjectColliderType(obj, colliderType, options);
    this.updatePropertyPanel();
    this.logToConsole(`已为物体添加 ${colliderType} 碰撞体`, 'info');
  }

  removeColliderFromSelectedObject() {
    if (!this.sceneManager.selectedObject) return;

    const obj = this.sceneManager.selectedObject;
    const collider = this.sceneManager.getCollider(obj);
    
    if (!collider) {
      this.logToConsole('该物体没有碰撞体', 'warning');
      return;
    }

    this.sceneManager.removeCollider(obj);
    this.updatePropertyPanel();
    this.logToConsole('已移除物体的碰撞体', 'info');
  }

  setupKeyboardListeners() {
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
        case 'f5':
          e.preventDefault();
          this.togglePlay();
          break;
      }
    });
  }

  setupPanelListeners() {
    const panelTabs = document.querySelectorAll('.panel-tab[data-panel]');
    panelTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const panelId = tab.dataset.panel;
        
        document.querySelectorAll('.panel-tab[data-panel]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const hierarchyPanel = document.getElementById('hierarchy-panel');
        const projectPanel = document.getElementById('project-panel');
        
        if (panelId === 'hierarchy') {
          if (hierarchyPanel) hierarchyPanel.style.display = 'block';
          if (projectPanel) projectPanel.style.display = 'none';
        } else if (panelId === 'project') {
          if (hierarchyPanel) hierarchyPanel.style.display = 'none';
          if (projectPanel) projectPanel.style.display = 'block';
        }
      });
    });
  }

  onMenuClick(menu) {
    const menuNames = {
      'file': '文件',
      'edit': '编辑',
      'view': '视图',
      'game': '游戏',
      'component': '组件',
      'tools': '工具',
      'window': '窗口',
      'help': '帮助'
    };
    
    this.logToConsole(`菜单 ${menuNames[menu] || menu} 被点击`, 'info');
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
    if (!treeEl) return;
    
    const objects = this.sceneManager.objects;
    
    treeEl.innerHTML = '';
    
    if (objects.length === 0) {
      treeEl.innerHTML = '<li class="tree-item" style="opacity: 0.5; cursor: default;">场景为空</li>';
      return;
    }
    
    objects.forEach((obj) => {
      const li = document.createElement('li');
      li.className = 'tree-item';
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
      
      const icon = typeIcons[obj.userData.objectType] || '▢';
      
      li.innerHTML = `
        <span class="tree-icon">${icon}</span>
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
    
    const allSections = [
      'section-name', 'section-transform', 'section-mesh', 
      'section-material', 'section-collider', 'section-light',
      'section-add-component'
    ];
    
    if (!info) {
      if (noSelection) noSelection.style.display = 'block';
      allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      return;
    }
    
    if (noSelection) noSelection.style.display = 'none';
    
    const sectionName = document.getElementById('section-name');
    if (sectionName) {
      sectionName.style.display = 'block';
      const objName = document.getElementById('obj-name');
      const objNameDisplay = document.getElementById('obj-name-display');
      if (objName) objName.value = info.name;
      if (objNameDisplay) objNameDisplay.textContent = info.name;
    }
    
    const sectionTransform = document.getElementById('section-transform');
    if (sectionTransform) {
      sectionTransform.style.display = 'block';
      const posX = document.getElementById('pos-x');
      const posY = document.getElementById('pos-y');
      const posZ = document.getElementById('pos-z');
      if (posX) posX.value = info.position.x;
      if (posY) posY.value = info.position.y;
      if (posZ) posZ.value = info.position.z;
      
      const rotX = document.getElementById('rot-x');
      const rotY = document.getElementById('rot-y');
      const rotZ = document.getElementById('rot-z');
      if (rotX) rotX.value = info.rotation.x;
      if (rotY) rotY.value = info.rotation.y;
      if (rotZ) rotZ.value = info.rotation.z;
      
      const scaleX = document.getElementById('scale-x');
      const scaleY = document.getElementById('scale-y');
      const scaleZ = document.getElementById('scale-z');
      if (scaleX) scaleX.value = info.scale.x;
      if (scaleY) scaleY.value = info.scale.y;
      if (scaleZ) scaleZ.value = info.scale.z;
    }
    
    const sectionMesh = document.getElementById('section-mesh');
    if (sectionMesh) {
      if (info.material && !info.isLight) {
        sectionMesh.style.display = 'block';
      } else {
        sectionMesh.style.display = 'none';
      }
    }
    
    const sectionMaterial = document.getElementById('section-material');
    if (sectionMaterial) {
      if (info.material && !info.isLight) {
        sectionMaterial.style.display = 'block';
        
        const materialColor = document.getElementById('material-color');
        const colorPreview = document.getElementById('color-preview');
        if (materialColor) materialColor.value = info.material.color;
        if (colorPreview) colorPreview.style.backgroundColor = info.material.color;
        
        const materialRoughness = document.getElementById('material-roughness');
        const roughnessValue = document.getElementById('roughness-value');
        if (materialRoughness) materialRoughness.value = info.material.roughness;
        if (roughnessValue) roughnessValue.textContent = info.material.roughness.toFixed(2);
        
        const materialMetalness = document.getElementById('material-metalness');
        const metalnessValue = document.getElementById('metalness-value');
        if (materialMetalness) materialMetalness.value = info.material.metalness;
        if (metalnessValue) metalnessValue.textContent = info.material.metalness.toFixed(2);
        
        const materialOpacity = document.getElementById('material-opacity');
        const opacityValue = document.getElementById('opacity-value');
        if (materialOpacity) materialOpacity.value = info.material.opacity;
        if (opacityValue) opacityValue.textContent = info.material.opacity.toFixed(2);
      } else {
        sectionMaterial.style.display = 'none';
      }
    }
    
    this.updateColliderPropertyPanel();
    
    const sectionLight = document.getElementById('section-light');
    if (sectionLight) {
      if (info.isLight && info.light) {
        sectionLight.style.display = 'block';
        
        const lightIntensity = document.getElementById('light-intensity');
        const lightIntensityValue = document.getElementById('light-intensity-value');
        if (lightIntensity) lightIntensity.value = info.light.intensity;
        if (lightIntensityValue) lightIntensityValue.textContent = info.light.intensity.toFixed(1);
        
        const lightColor = document.getElementById('light-color');
        const lightColorPreview = document.getElementById('light-color-preview');
        if (lightColor) lightColor.value = info.light.color;
        if (lightColorPreview) lightColorPreview.style.backgroundColor = info.light.color;
        
        const lightRange = document.getElementById('light-range');
        if (lightRange && info.light.distance !== undefined) {
          lightRange.value = info.light.distance;
        }
        
        const lightShadow = document.getElementById('light-shadow');
        if (lightShadow && info.light.castShadow !== undefined) {
          lightShadow.value = info.light.castShadow ? 'true' : 'false';
        }
      } else {
        sectionLight.style.display = 'none';
      }
    }
    
    const sectionAddComponent = document.getElementById('section-add-component');
    if (sectionAddComponent) {
      sectionAddComponent.style.display = 'block';
    }
    
    this.updateSelectionInfo(info);
  }

  updateColliderPropertyPanel() {
    const sectionCollider = document.getElementById('section-collider');
    if (!sectionCollider) return;
    
    if (!this.sceneManager.selectedObject) {
      sectionCollider.style.display = 'none';
      return;
    }
    
    const collider = this.sceneManager.getCollider(this.sceneManager.selectedObject);
    if (!collider) {
      sectionCollider.style.display = 'none';
      return;
    }
    
    sectionCollider.style.display = 'block';
    
    const colliderType = document.getElementById('collider-type');
    const colliderStatic = document.getElementById('collider-static');
    const colliderTrigger = document.getElementById('collider-trigger');
    const colliderGravity = document.getElementById('collider-gravity');
    const colliderMass = document.getElementById('collider-mass');
    const colliderBounciness = document.getElementById('collider-bounciness');
    const colliderFriction = document.getElementById('collider-friction');
    
    const colliderCenterX = document.getElementById('collider-center-x');
    const colliderCenterY = document.getElementById('collider-center-y');
    const colliderCenterZ = document.getElementById('collider-center-z');
    const colliderSizeX = document.getElementById('collider-size-x');
    const colliderSizeY = document.getElementById('collider-size-y');
    const colliderSizeZ = document.getElementById('collider-size-z');
    const colliderRadius = document.getElementById('collider-radius');
    
    if (colliderType) colliderType.value = collider.type;
    if (colliderStatic) colliderStatic.checked = collider.isStatic;
    if (colliderTrigger) colliderTrigger.checked = collider.isTrigger;
    if (colliderGravity) colliderGravity.checked = collider.useGravity;
    if (colliderMass) colliderMass.value = collider.mass;
    if (colliderBounciness) colliderBounciness.value = collider.bounciness;
    if (colliderFriction) colliderFriction.value = collider.friction;
    
    if (colliderCenterX) colliderCenterX.value = collider.center.x.toFixed(2);
    if (colliderCenterY) colliderCenterY.value = collider.center.y.toFixed(2);
    if (colliderCenterZ) colliderCenterZ.value = collider.center.z.toFixed(2);
    
    if (collider.type === 'box' && collider.size) {
      if (colliderSizeX) colliderSizeX.value = collider.size.x.toFixed(2);
      if (colliderSizeY) colliderSizeY.value = collider.size.y.toFixed(2);
      if (colliderSizeZ) colliderSizeZ.value = collider.size.z.toFixed(2);
    }
    
    if ((collider.type === 'sphere' || collider.type === 'capsule') && collider.radius !== undefined) {
      if (colliderRadius) colliderRadius.value = collider.radius.toFixed(2);
    }
    
    const sizeRow = document.getElementById('collider-size-row');
    const radiusRow = document.getElementById('collider-radius-row');
    
    if (collider.type === 'sphere') {
      if (sizeRow) sizeRow.style.display = 'none';
      if (radiusRow) radiusRow.style.display = 'flex';
    } else {
      if (sizeRow) sizeRow.style.display = 'flex';
      if (radiusRow) radiusRow.style.display = 'none';
    }
  }

  updateSelectionInfo(info) {
    const el = document.getElementById('selection-info');
    if (!el) return;
    
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
    
    const objectCount = document.getElementById('object-count');
    const selectedCount = document.getElementById('selected-count');
    
    if (objectCount) objectCount.textContent = `物体: ${objects.length}`;
    if (selectedCount) selectedCount.textContent = `选中: ${selected ? 1 : 0}`;
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
    
    const toolDisplay = document.getElementById('tool-display');
    const currentMode = document.getElementById('current-mode');
    
    const modeNames = {
      select: '选择模式',
      move: '移动模式',
      rotate: '旋转模式',
      scale: '缩放模式'
    };
    
    const toolNames = {
      select: '选择',
      move: '移动',
      rotate: '旋转',
      scale: '缩放'
    };
    
    if (toolDisplay) toolDisplay.textContent = toolNames[tool] || tool;
    if (currentMode) currentMode.textContent = modeNames[tool] || tool;
  }

  setView(view) {
    this.currentView = view;
    this.sceneManager.setView(view);
    
    ['perspective', 'ortho', 'top', 'front', 'right'].forEach(v => {
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
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    if (this.isPlaying) {
      if (playBtn) {
        playBtn.style.display = 'none';
      }
      if (pauseBtn) {
        pauseBtn.style.display = 'block';
      }
      if (stopBtn) {
        stopBtn.style.display = 'block';
      }
      this.startExecution();
    } else {
      if (playBtn) {
        playBtn.style.display = 'block';
      }
      if (pauseBtn) {
        pauseBtn.style.display = 'none';
      }
      if (stopBtn) {
        stopBtn.style.display = 'none';
      }
      this.stopExecution();
    }
  }

  stopPlay() {
    this.isPlaying = false;
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    if (playBtn) playBtn.style.display = 'block';
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    
    this.stopExecution();
  }

  startExecution() {
    console.log('Starting execution...');
    if (this.sceneManager) {
      this.sceneManager.enablePhysics();
    }
    const currentMode = document.getElementById('current-mode');
    if (currentMode) currentMode.textContent = '游戏模式';
  }

  stopExecution() {
    console.log('Stopping execution...');
    if (this.sceneManager) {
      this.sceneManager.disablePhysics();
    }
    const currentMode = document.getElementById('current-mode');
    if (currentMode) currentMode.textContent = '编辑模式';
  }

  reset() {
    console.log('Resetting scene...');
    this.sceneManager.reset();
  }

  togglePhysics() {
    if (this.sceneManager) {
      const enabled = this.sceneManager.togglePhysics();
      const physicsBtn = document.getElementById('btn-physics');
      const physicsStatus = document.getElementById('physics-status');
      
      if (physicsBtn) {
        if (enabled) {
          physicsBtn.classList.add('active');
        } else {
          physicsBtn.classList.remove('active');
        }
      }
      
      if (physicsStatus) {
        physicsStatus.innerHTML = `<span>物理: ${enabled ? '开启' : '关闭'}</span>`;
      }
      
      console.log(`Physics ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  toggleDebugColliders() {
    this.debugColliders = !this.debugColliders;
    if (this.sceneManager) {
      this.sceneManager.setDebugColliders(this.debugColliders);
    }
    
    const debugBtn = document.getElementById('btn-debug-collider');
    if (debugBtn) {
      if (this.debugColliders) {
        debugBtn.classList.add('active');
      } else {
        debugBtn.classList.remove('active');
      }
    }
    
    console.log(`Debug colliders ${this.debugColliders ? 'enabled' : 'disabled'}`);
  }

  updateStatus(connected) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (connected) {
      if (statusDot) statusDot.classList.remove('disconnected');
      if (statusText) statusText.textContent = '已连接到Python服务器';
    } else {
      if (statusDot) statusDot.classList.add('disconnected');
      if (statusText) statusText.textContent = '独立模式 (未连接)';
    }
  }

  logToConsole(message, type = 'info') {
    const consoleContent = document.getElementById('console-content');
    if (!consoleContent) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }
    
    const now = new Date();
    const timeStr = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
    
    const item = document.createElement('div');
    item.className = `console-item ${type}`;
    item.innerHTML = `
      <span class="console-time">${timeStr}</span>
      <span>${message}</span>
    `;
    
    consoleContent.appendChild(item);
    consoleContent.scrollTop = consoleContent.scrollHeight;
    
    const badgeMap = {
      'info': 'console-info-count',
      'warning': 'console-warning-count',
      'error': 'console-error-count'
    };
    const badgeId = badgeMap[type];
    if (badgeId) {
      const badge = document.getElementById(badgeId);
      if (badge) {
        const currentCount = parseInt(badge.textContent) || 0;
        badge.textContent = currentCount + 1;
      }
    }
  }

  setupCollisionListeners() {
    if (this.sceneManager && this.sceneManager.collisionManager) {
      this.sceneManager.collisionManager.onCollision = (eventType, colliderA, colliderB) => {
        const nameA = colliderA.object ? colliderA.object.name : 'Unknown';
        const nameB = colliderB.object ? colliderB.object.name : 'Unknown';
        
        const eventNames = {
          'enter': '碰撞开始',
          'stay': '碰撞持续',
          'exit': '碰撞结束'
        };
        
        if (eventType === 'enter') {
          this.logToConsole(`${eventNames[eventType]}: ${nameA} <-> ${nameB}`, 'info');
        }
      };
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MiniGameEngine();
});
