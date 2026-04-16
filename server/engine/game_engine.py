"""
Mini Game Engine - Main Game Engine Class
"""

import logging
from typing import Dict, Optional
from .scene import Scene
from .game_loop import GameLoop

logger = logging.getLogger(__name__)

class GameEngine:
    """
    The main game engine class that manages all game components
    """
    
    def __init__(self):
        """Initialize the game engine"""
        logger.info("Initializing GameEngine...")
        
        # Engine state
        self._is_running = False
        self._is_paused = False
        
        # Game state
        self._game_state = "editor"  # editor, playing, paused
        
        # Main scene
        self._main_scene = Scene()
        
        # Game loop
        self._game_loop = GameLoop(self)
        
        # Connected clients
        self._clients = set()
        
        # Engine configuration
        self._config = {
            "version": "1.0.0",
            "capabilities": [
                "3d_rendering",
                "materials",
                "lighting",
                "physics",
                "scripting",
                "animation"
            ]
        }
        
        logger.info("GameEngine initialized successfully")
    
    @property
    def is_running(self) -> bool:
        """Check if engine is running"""
        return self._is_running
    
    @property
    def is_paused(self) -> bool:
        """Check if engine is paused"""
        return self._is_paused
    
    @property
    def game_state(self) -> str:
        """Get current game state"""
        return self._game_state
    
    @property
    def main_scene(self) -> Scene:
        """Get the main scene"""
        return self._main_scene
    
    @property
    def game_loop(self) -> GameLoop:
        """Get the game loop"""
        return self._game_loop
    
    @property
    def config(self) -> Dict:
        """Get engine configuration"""
        return self._config.copy()
    
    def start(self):
        """Start the game engine"""
        if self._is_running:
            logger.warning("GameEngine is already running")
            return
        
        logger.info("Starting GameEngine...")
        self._is_running = True
        self._game_state = "playing"
        self._game_loop.start()
        logger.info("GameEngine started")
    
    def stop(self):
        """Stop the game engine"""
        if not self._is_running:
            logger.warning("GameEngine is not running")
            return
        
        logger.info("Stopping GameEngine...")
        self._game_loop.stop()
        self._is_running = False
        self._game_state = "editor"
        logger.info("GameEngine stopped")
    
    def pause(self):
        """Pause the game engine"""
        if not self._is_running:
            logger.warning("Cannot pause: GameEngine is not running")
            return
        
        if self._is_paused:
            logger.warning("GameEngine is already paused")
            return
        
        logger.info("Pausing GameEngine...")
        self._is_paused = True
        self._game_state = "paused"
        self._game_loop.pause()
        logger.info("GameEngine paused")
    
    def resume(self):
        """Resume the game engine from pause"""
        if not self._is_paused:
            logger.warning("GameEngine is not paused")
            return
        
        logger.info("Resuming GameEngine...")
        self._is_paused = False
        self._game_state = "playing"
        self._game_loop.resume()
        logger.info("GameEngine resumed")
    
    def reset(self):
        """Reset the game engine to initial state"""
        logger.info("Resetting GameEngine...")
        
        # Stop if running
        if self._is_running:
            self.stop()
        
        # Reset scene
        self._main_scene = Scene()
        
        # Reset game loop
        self._game_loop = GameLoop(self)
        
        self._game_state = "editor"
        logger.info("GameEngine reset")
    
    def get_scene_info(self) -> Dict:
        """Get information about the current scene"""
        return {
            "objects": [obj.to_dict() for obj in self._main_scene.game_objects],
            "lighting": {
                "ambient": self._main_scene.ambient_light.to_dict() if self._main_scene.ambient_light else None,
                "directional": [light.to_dict() for light in self._main_scene.directional_lights]
            },
            "game_state": self._game_state,
            "is_running": self._is_running,
            "is_paused": self._is_paused
        }
    
    def update_object_position(self, object_name: str, x: float, y: float, z: float):
        """Update an object's position"""
        obj = self._main_scene.get_object_by_name(object_name)
        if obj:
            obj.transform.position = (x, y, z)
            logger.debug(f"Updated position of {object_name} to ({x}, {y}, {z})")
        else:
            logger.warning(f"Object {object_name} not found")
    
    def update_object_rotation(self, object_name: str, x: float, y: float, z: float):
        """Update an object's rotation"""
        obj = self._main_scene.get_object_by_name(object_name)
        if obj:
            obj.transform.rotation = (x, y, z)
            logger.debug(f"Updated rotation of {object_name} to ({x}, {y}, {z})")
        else:
            logger.warning(f"Object {object_name} not found")
    
    def update_object_scale(self, object_name: str, x: float, y: float, z: float):
        """Update an object's scale"""
        obj = self._main_scene.get_object_by_name(object_name)
        if obj:
            obj.transform.scale = (x, y, z)
            logger.debug(f"Updated scale of {object_name} to ({x}, {y}, {z})")
        else:
            logger.warning(f"Object {object_name} not found")
    
    def update_material_color(self, object_name: str, color: str):
        """Update an object's material color"""
        obj = self._main_scene.get_object_by_name(object_name)
        if obj and obj.material:
            obj.material.color = color
            logger.debug(f"Updated material color of {object_name} to {color}")
        else:
            logger.warning(f"Object {object_name} not found or has no material")
    
    def update_light_intensity(self, light_name: str, intensity: float):
        """Update a light's intensity"""
        for light in self._main_scene.directional_lights:
            if light.name == light_name:
                light.intensity = intensity
                logger.debug(f"Updated intensity of {light_name} to {intensity}")
                return
        logger.warning(f"Light {light_name} not found")
