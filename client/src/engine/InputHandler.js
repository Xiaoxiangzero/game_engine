import * as THREE from 'three';

export class InputHandler {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;
    
    // 鼠标状态
    this.mouse = {
      x: 0,
      y: 0,
      isLeftDown: false,
      isRightDown: false,
      isMiddleDown: false
    };
    
    // 射线投射器
    this.raycaster = new THREE.Raycaster();
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    const canvas = this.renderer.domElement;
    
    // 鼠标移动
    canvas.addEventListener('mousemove', (e) => {
      this.onMouseMove(e);
    });
    
    // 鼠标按下
    canvas.addEventListener('mousedown', (e) => {
      this.onMouseDown(e);
    });
    
    // 鼠标释放
    canvas.addEventListener('mouseup', (e) => {
      this.onMouseUp(e);
    });
    
    // 鼠标离开
    canvas.addEventListener('mouseleave', (e) => {
      this.onMouseLeave(e);
    });
    
    // 右键菜单阻止
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
      this.onKeyDown(e);
    });
    
    document.addEventListener('keyup', (e) => {
      this.onKeyUp(e);
    });
  }

  onMouseMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    // 计算标准化设备坐标
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    // 处理拖拽逻辑
    this.handleMouseDrag(e);
  }

  onMouseDown(e) {
    switch (e.button) {
      case 0: // 左键
        this.mouse.isLeftDown = true;
        this.handleLeftClick(e);
        break;
      case 1: // 中键
        this.mouse.isMiddleDown = true;
        break;
      case 2: // 右键
        this.mouse.isRightDown = true;
        break;
    }
  }

  onMouseUp(e) {
    switch (e.button) {
      case 0:
        this.mouse.isLeftDown = false;
        break;
      case 1:
        this.mouse.isMiddleDown = false;
        break;
      case 2:
        this.mouse.isRightDown = false;
        break;
    }
  }

  onMouseLeave(e) {
    this.mouse.isLeftDown = false;
    this.mouse.isRightDown = false;
    this.mouse.isMiddleDown = false;
  }

  handleLeftClick(e) {
    // 这里可以添加物体选择逻辑
    console.log('Left click at:', this.mouse.x, this.mouse.y);
    
    // 示例：可以用射线检测点击的物体
    // this.raycaster.setFromCamera(this.mouse, this.camera);
    // const intersects = this.raycaster.intersectObjects(this.scene.children);
    // if (intersects.length > 0) {
    //   console.log('Clicked object:', intersects[0].object);
    // }
  }

  handleMouseDrag(e) {
    // 处理拖拽逻辑
    if (this.mouse.isLeftDown) {
      // 左键拖拽 - 可以用于移动物体等
      this.handleLeftDrag(e);
    }
    
    if (this.mouse.isRightDown) {
      // 右键拖拽 - 已经由OrbitControls处理旋转
      this.handleRightDrag(e);
    }
  }

  handleLeftDrag(e) {
    // 左键拖拽逻辑
    // 可以用于：移动物体、框选等
    console.log('Left drag:', e.movementX, e.movementY);
  }

  handleRightDrag(e) {
    // 右键拖拽逻辑
    // 注意：OrbitControls已经处理了旋转，这里可以添加额外的逻辑
    console.log('Right drag:', e.movementX, e.movementY);
  }

  onKeyDown(e) {
    // 键盘按下事件
    console.log('Key down:', e.key);
    
    // 可以添加快捷键支持
    switch (e.key.toLowerCase()) {
      case 'w':
        // 向前移动
        break;
      case 's':
        // 向后移动
        break;
      case 'a':
        // 向左移动
        break;
      case 'd':
        // 向右移动
        break;
      case 'r':
        // 重置
        break;
      case ' ':
        // 空格 - 播放/暂停
        break;
    }
  }

  onKeyUp(e) {
    // 键盘释放事件
    console.log('Key up:', e.key);
  }

  getMousePosition() {
    return { x: this.mouse.x, y: this.mouse.y };
  }

  isMouseButtonDown(button) {
    // button: 0=left, 1=middle, 2=right
    switch (button) {
      case 0:
        return this.mouse.isLeftDown;
      case 1:
        return this.mouse.isMiddleDown;
      case 2:
        return this.mouse.isRightDown;
      default:
        return false;
    }
  }
}