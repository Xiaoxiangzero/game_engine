/**
 * Mini Game Engine - Core Module Index
 * 核心模块索引文件
 */

export { Object } from './Object.js';
export { Component, MonoBehaviour } from './Component.js';
export { GameObject } from './GameObject.js';
export { Time } from './Time.js';

// Default export
import { Object } from './Object.js';
import { Component, MonoBehaviour } from './Component.js';
import { GameObject } from './GameObject.js';
import { Time } from './Time.js';

export default {
    Object,
    Component,
    MonoBehaviour,
    GameObject,
    Time
};
