/**
 * Mini Game Engine - Main Module Index
 * 引擎主模块索引文件
 */

export * from './core/index.js';
export * from './physics/index.js';
export * from './rendering/index.js';
export * from './events/index.js';
export * from './resources/index.js';
export * from './audio/index.js';
export * from './network/index.js';

export { SceneManager } from './SceneManager.js';
export { InputHandler } from './InputHandler.js';
export { EngineAPI } from './EngineAPI.js';

import * as Core from './core/index.js';
import * as Physics from './physics/index.js';
import * as Rendering from './rendering/index.js';
import * as Events from './events/index.js';
import * as Resources from './resources/index.js';
import * as Audio from './audio/index.js';
import * as Network from './network/index.js';
import { SceneManager } from './SceneManager.js';
import { InputHandler } from './InputHandler.js';
import { EngineAPI } from './EngineAPI.js';

export default {
    Core,
    Physics,
    Rendering,
    Events,
    Resources,
    Audio,
    Network,
    SceneManager,
    InputHandler,
    EngineAPI
};
