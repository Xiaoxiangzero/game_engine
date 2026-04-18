import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { CollisionManager, ColliderType, createBoxCollider, createSphereCollider } from './CollisionManager.js';

export class SceneManager {
  constructor(container, onChangeCallback) {
    this.container = container;
    this.onChange = onChangeCallback || (() => {});
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.transformControls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.objects = [];
    this.selectedObject = null;
    this.objectIdCounter = 1;
    
    this.isDragging = false;
    this.currentTool = 'select';
    this.isTransformMode = false;
    
    this.collisionManager = null;
    this.physicsEnabled = false;
    this.lastTime = performance.now() / 1000;
    
    this.materialPresets = [
      { name: '红色塑料', color: '#ff4444', roughness: 0.4, metalness: 0.1 },
      { name: '蓝色塑料', color: '#4444ff', roughness: 0.4, metalness: 0.1 },
      { name: '绿色塑料', color: '#44ff44', roughness: 0.4, metalness: 0.1 },
      { name: '黄色塑料', color: '#ffff44', roughness: 0.4, metalness: 0.1 },
      { name: '金属', color: '#c0c0c0', roughness: 0.2, metalness: 0.9 },
      { name: '黄金', color: '#ffd700', roughness: 0.3, metalness: 0.8 },
      { name: '铜色', color: '#b87333', roughness: 0.4, metalness: 0.7 },
      { name: '玻璃', color: '#88ccff', roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.3 },
    ];
    
    this.init();
  }

  init() {
    try {
      console.log('初始化 SceneManager...');
      
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1a1a2e);

      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      this.camera.position.set(0, 5, 8);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = true;
      this.controls.minDistance = 1;
      this.controls.maxDistance = 50;
      
      this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
      this.transformControls.setMode('translate');
      
      this.transformControls.addEventListener('dragging-changed', (event) => {
        this.controls.enabled = !event.value;
        this.isDragging = event.value;
      });
      
      this.transformControls.addEventListener('objectChange', () => {
        this.onObjectChange();
      });
      
      this.scene.add(this.transformControls);
      console.log('TransformControls 初始化成功');

      this.collisionManager = new CollisionManager();
      console.log('CollisionManager 初始化成功');

      this.setupLighting();
      this.setupGround();
      this.setupEventListeners();
      this.animate();
      
      console.log('SceneManager 初始化完成');
    } catch (error) {
      console.error('SceneManager 初始化失败:', error);
      throw error;
    }
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    ambientLight.name = '环境光';
    ambientLight.isLight = true;
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.name = '方向光';
    directionalLight.isLight = true;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    this.scene.add(hemisphereLight);
  }

  setupGround() {
    const groundGeometry = new THREE.BoxGeometry(30, 1, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    ground.name = '地面';
    ground.isGround = true;
    ground.userData.objectType = 'plane';
    this.scene.add(ground);
    this.objects.push(ground);

    this.addColliderToObject(ground, {
      type: ColliderType.BOX,
      size: new THREE.Vector3(30, 1, 30),
      center: new THREE.Vector3(0, 0, 0),
      isStatic: true,
      isTrigger: false,
      useGravity: false
    });

    const gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
    gridHelper.name = '网格';
    this.scene.add(gridHelper);
  }

  createDefaultObjects() {
    this.createCube({ 
      position: new THREE.Vector3(0, 3, 0),
      name: '立方体',
      color: 0xff4444
    });
  }

  createCube(options = {}) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: options.color || 0xffffff,
      roughness: 0.5,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(options.position || new THREE.Vector3());
    mesh.rotation.copy(options.rotation || new THREE.Euler());
    mesh.scale.copy(options.scale || new THREE.Vector3(1, 1, 1));
    mesh.name = options.name || '立方体_' + this.objectIdCounter++;
    mesh.userData.objectType = 'cube';
    mesh.userData.originalMaterial = material.clone();
    
    this.scene.add(mesh);
    this.objects.push(mesh);
    
    this.addColliderToObject(mesh, {
      type: ColliderType.BOX,
      size: new THREE.Vector3(1, 1, 1),
      isStatic: options.isStatic || false,
      isTrigger: options.isTrigger || false
    });
    
    this.onChange();
    
    return mesh;
  }

  createSphere(options = {}) {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: options.color || 0x44ff44,
      roughness: 0.5,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(options.position || new THREE.Vector3());
    mesh.name = options.name || '球体_' + this.objectIdCounter++;
    mesh.userData.objectType = 'sphere';
    mesh.userData.originalMaterial = material.clone();
    
    this.scene.add(mesh);
    this.objects.push(mesh);
    
    this.addColliderToObject(mesh, {
      type: ColliderType.SPHERE,
      radius: 0.5,
      isStatic: options.isStatic || false,
      isTrigger: options.isTrigger || false
    });
    
    this.onChange();
    
    return mesh;
  }

  createCylinder(options = {}) {
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    const material = new THREE.MeshStandardMaterial({
      color: options.color || 0x4444ff,
      roughness: 0.5,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(options.position || new THREE.Vector3());
    mesh.name = options.name || '圆柱体_' + this.objectIdCounter++;
    mesh.userData.objectType = 'cylinder';
    mesh.userData.originalMaterial = material.clone();
    
    this.scene.add(mesh);
    this.objects.push(mesh);
    
    this.addColliderToObject(mesh, {
      type: ColliderType.CAPSULE,
      radius: 0.5,
      height: 1,
      isStatic: options.isStatic || false,
      isTrigger: options.isTrigger || false
    });
    
    this.onChange();
    
    return mesh;
  }

  createPlane(options = {}) {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: options.color || 0xffff44,
      roughness: 0.5,
      metalness: 0.3,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(options.position || new THREE.Vector3());
    mesh.rotation.x = -Math.PI / 2;
    mesh.name = options.name || '平面_' + this.objectIdCounter++;
    mesh.userData.objectType = 'plane';
    mesh.userData.originalMaterial = material.clone();
    
    this.scene.add(mesh);
    this.objects.push(mesh);
    this.onChange();
    
    return mesh;
  }

  createPointLight(options = {}) {
    const light = new THREE.PointLight(
      options.color || 0xffffff,
      options.intensity || 1.0,
      options.distance || 20
    );
    light.position.copy(options.position || new THREE.Vector3(0, 2, 0));
    light.name = options.name || '点光源_' + this.objectIdCounter++;
    light.userData.objectType = 'pointlight';
    light.isLight = true;
    
    const lightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: options.color || 0xffffff
    });
    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
    light.add(lightMesh);
    
    this.scene.add(light);
    this.objects.push(light);
    this.onChange();
    
    return light;
  }

  addObject(type, options = {}) {
    let position = options.position;
    if (!position) {
      const offset = (this.objects.length - 1) * 1.5;
      position = new THREE.Vector3(offset % 5 - 2, 0.5, Math.floor(offset / 5) * 1.5);
    }
    
    switch (type.toLowerCase()) {
      case 'cube':
      case '立方体':
        return this.createCube({ ...options, position });
      case 'sphere':
      case '球体':
        return this.createSphere({ ...options, position });
      case 'cylinder':
      case '圆柱体':
        return this.createCylinder({ ...options, position });
      case 'plane':
      case '平面':
        return this.createPlane({ ...options, position });
      case 'light':
      case 'pointlight':
      case '灯光':
        return this.createPointLight({ ...options, position });
      default:
        return this.createCube({ ...options, position });
    }
  }

  removeObject(obj) {
    const index = this.objects.indexOf(obj);
    if (index > -1) {
      this.objects.splice(index, 1);
      
      if (this.selectedObject === obj) {
        this.deselectObject();
      }
      
      this.scene.remove(obj);
      this.onChange();
    }
  }

  duplicateObject(obj) {
    if (!obj) return null;
    
    let newObj;
    const type = obj.userData.objectType;
    const position = obj.position.clone().add(new THREE.Vector3(1.5, 0, 0));
    
    switch (type) {
      case 'cube':
        newObj = this.createCube({ position });
        break;
      case 'sphere':
        newObj = this.createSphere({ position });
        break;
      case 'cylinder':
        newObj = this.createCylinder({ position });
        break;
      case 'plane':
        newObj = this.createPlane({ position });
        break;
      case 'pointlight':
        newObj = this.createPointLight({ position });
        break;
      default:
        return null;
    }
    
    if (newObj && obj.material) {
      newObj.material.copy(obj.material);
    }
    
    return newObj;
  }

  selectObject(obj) {
    if (this.selectedObject) {
      if (this.selectedObject.material) {
        this.selectedObject.material.emissive = new THREE.Color(0x000000);
      }
      if (this.transformControls) {
        this.transformControls.detach();
      }
    }
    
    this.selectedObject = obj;
    
    if (obj && obj.material && !obj.isLight) {
      obj.material.emissive = new THREE.Color(0x222222);
      if (this.transformControls) {
        this.transformControls.attach(obj);
      }
    }
    
    this.onObjectChange();
    this.onChange();
  }

  deselectObject() {
    if (this.selectedObject && this.selectedObject.material) {
      this.selectedObject.material.emissive = new THREE.Color(0x000000);
    }
    this.selectedObject = null;
    if (this.transformControls) {
      this.transformControls.detach();
    }
    this.onChange();
  }

  getObjectById(id) {
    return this.objects.find(obj => obj.id === id);
  }

  getObjectByName(name) {
    return this.objects.find(obj => obj.name === name);
  }

  getObjectPosition(obj) {
    if (!obj) return { x: 0, y: 0, z: 0 };
    return {
      x: parseFloat(obj.position.x.toFixed(2)),
      y: parseFloat(obj.position.y.toFixed(2)),
      z: parseFloat(obj.position.z.toFixed(2))
    };
  }

  getObjectRotation(obj) {
    if (!obj) return { x: 0, y: 0, z: 0 };
    const toDeg = (rad) => (rad * 180 / Math.PI).toFixed(1);
    return {
      x: parseFloat(toDeg(obj.rotation.x)),
      y: parseFloat(toDeg(obj.rotation.y)),
      z: parseFloat(toDeg(obj.rotation.z))
    };
  }

  getObjectScale(obj) {
    if (!obj) return { x: 1, y: 1, z: 1 };
    return {
      x: parseFloat(obj.scale.x.toFixed(2)),
      y: parseFloat(obj.scale.y.toFixed(2)),
      z: parseFloat(obj.scale.z.toFixed(2))
    };
  }

  updateObjectPosition(obj, x, y, z) {
    if (!obj) return;
    obj.position.set(x, y, z);
    this.onObjectChange();
  }

  updateObjectRotation(obj, x, y, z) {
    if (!obj) return;
    const toRad = (deg) => deg * Math.PI / 180;
    obj.rotation.set(toRad(x), toRad(y), toRad(z));
    this.onObjectChange();
  }

  updateObjectScale(obj, x, y, z) {
    if (!obj) return;
    obj.scale.set(x, y, z);
    const collider = this.getCollider(obj);
    if (collider) {
      collider.updateBounds();
    }
    this.onObjectChange();
  }

  updateMaterialColor(obj, color) {
    if (!obj || !obj.material) return;
    obj.material.color.set(color);
  }

  updateMaterialProperties(obj, properties) {
    if (!obj || !obj.material) return;
    
    if (properties.roughness !== undefined) {
      obj.material.roughness = properties.roughness;
    }
    if (properties.metalness !== undefined) {
      obj.material.metalness = properties.metalness;
    }
    if (properties.opacity !== undefined) {
      obj.material.opacity = properties.opacity;
      obj.material.transparent = properties.opacity < 1;
    }
  }

  applyMaterialPreset(obj, presetIndex) {
    if (!obj || !obj.material) return;
    
    const preset = this.materialPresets[presetIndex];
    if (!preset) return;
    
    obj.material.color.set(preset.color);
    obj.material.roughness = preset.roughness;
    obj.material.metalness = preset.metalness;
    
    if (preset.transparent) {
      obj.material.transparent = true;
      obj.material.opacity = preset.opacity || 1;
    }
  }

  setTool(tool) {
    this.currentTool = tool;
    
    if (this.transformControls && this.selectedObject) {
      switch (tool) {
        case 'move':
          this.transformControls.setMode('translate');
          this.isTransformMode = true;
          break;
        case 'rotate':
          this.transformControls.setMode('rotate');
          this.isTransformMode = true;
          break;
        case 'scale':
          this.transformControls.setMode('scale');
          this.isTransformMode = true;
          break;
        default:
          this.transformControls.setMode('translate');
          this.isTransformMode = false;
      }
    }
  }

  setView(view) {
    const distance = 10;
    
    switch (view.toLowerCase()) {
      case 'top':
        this.camera.position.set(0, distance, 0.01);
        this.controls.target.set(0, 0, 0);
        break;
      case 'front':
        this.camera.position.set(0, 0, distance);
        this.controls.target.set(0, 0, 0);
        break;
      case 'right':
        this.camera.position.set(distance, 0, 0);
        this.controls.target.set(0, 0, 0);
        break;
      case 'perspective':
      default:
        this.camera.position.set(0, 5, 8);
        this.controls.target.set(0, 0, 0);
        break;
    }
    
    this.controls.update();
  }

  resetView() {
    this.camera.position.set(0, 5, 8);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  reset() {
    const objectsToRemove = [...this.objects];
    objectsToRemove.forEach(obj => this.removeObject(obj));
    
    this.createDefaultObjects();
    this.deselectObject();
  }

  setupEventListeners() {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onPointerDown(e) {
    if (this.transformControls && this.transformControls.dragging) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.objects, true);
    
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      
      while (obj.parent && !this.objects.includes(obj)) {
        obj = obj.parent;
      }
      
      if (this.objects.includes(obj)) {
        this.selectObject(obj);
      }
    } else {
      this.deselectObject();
    }
  }

  onPointerMove(e) {
  }

  onPointerUp(e) {
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  onObjectChange() {
    if (this.onChange) {
      this.onChange();
    }
  }

  getSceneInfo() {
    return {
      objects: this.objects.map(obj => ({
        id: obj.id,
        name: obj.name,
        type: obj.userData.objectType || 'mesh',
        position: this.getObjectPosition(obj),
        rotation: this.getObjectRotation(obj),
        scale: this.getObjectScale(obj),
        isLight: obj.isLight || false,
        isSelected: obj === this.selectedObject
      })),
      selectedObject: this.selectedObject ? {
        id: this.selectedObject.id,
        name: this.selectedObject.name,
        type: this.selectedObject.userData.objectType || 'mesh'
      } : null
    };
  }

  getSelectedObjectInfo() {
    if (!this.selectedObject) return null;
    
    const obj = this.selectedObject;
    const info = {
      id: obj.id,
      name: obj.name,
      type: obj.userData.objectType || 'mesh',
      position: this.getObjectPosition(obj),
      rotation: this.getObjectRotation(obj),
      scale: this.getObjectScale(obj),
      isLight: obj.isLight || false
    };
    
    if (obj.material) {
      info.material = {
        color: '#' + obj.material.color.getHexString(),
        roughness: obj.material.roughness,
        metalness: obj.material.metalness,
        opacity: obj.material.opacity || 1,
        transparent: obj.material.transparent || false
      };
    }
    
    if (obj.isLight) {
      info.light = {
        intensity: obj.intensity || 1,
        color: '#' + (obj.color ? obj.color.getHexString() : 'ffffff')
      };
    }
    
    return info;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(currentTime - this.lastTime, 0.1);
    this.lastTime = currentTime;
    
    if (this.physicsEnabled && this.collisionManager) {
      this.collisionManager.update(deltaTime);
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  addColliderToObject(object, options = {}) {
    if (!this.collisionManager) return null;
    
    const collider = this.collisionManager.addCollider(object, options);
    return collider;
  }

  getCollider(object) {
    if (!this.collisionManager) return null;
    return this.collisionManager.getCollider(object);
  }

  removeCollider(object) {
    if (!this.collisionManager) return;
    this.collisionManager.removeCollider(object);
  }

  enablePhysics() {
    this.physicsEnabled = true;
    console.log('Physics enabled');
  }

  disablePhysics() {
    this.physicsEnabled = false;
    console.log('Physics disabled');
  }

  togglePhysics() {
    this.physicsEnabled = !this.physicsEnabled;
    return this.physicsEnabled;
  }

  setDebugColliders(enabled) {
    if (!this.collisionManager) return;
    this.collisionManager.setDebugMode(enabled, this.scene);
  }

  setColliderStatic(object, isStatic) {
    const collider = this.getCollider(object);
    if (collider) {
      collider.isStatic = isStatic;
    }
  }

  setColliderTrigger(object, isTrigger) {
    const collider = this.getCollider(object);
    if (collider) {
      collider.isTrigger = isTrigger;
    }
  }

  setColliderVelocity(object, velocity) {
    const collider = this.getCollider(object);
    if (collider) {
      collider.velocity.copy(velocity);
    }
  }

  getColliderVelocity(object) {
    const collider = this.getCollider(object);
    if (collider) {
      return collider.velocity.clone();
    }
    return new THREE.Vector3(0, 0, 0);
  }

  setObjectColliderType(object, type, options = {}) {
    this.removeCollider(object);
    const newOptions = {
      ...options,
      type: type
    };
    return this.addColliderToObject(object, newOptions);
  }

  clearAllColliders() {
    if (this.collisionManager) {
      this.collisionManager.clear();
    }
  }
}
