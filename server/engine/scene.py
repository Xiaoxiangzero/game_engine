"""
Mini Game Engine - Scene Management
"""

import logging
from typing import List, Optional, Dict
from .game_object import GameObject
from .lighting import Light, AmbientLight, DirectionalLight

logger = logging.getLogger(__name__)

class Scene:
    """
    Scene class that contains all game objects and lighting
    """
    
    def __init__(self, name: str = "Default Scene"):
        """
        Initialize a scene
        
        Args:
            name: Scene name
        """
        self._name = name
        self._game_objects: List[GameObject] = []
        self._objects_by_name: Dict[str, GameObject] = {}
        self._objects_by_id: Dict[int, GameObject] = {}
        
        # Lighting
        self._ambient_light: Optional[AmbientLight] = AmbientLight(
            name="Default Ambient",
            color="#ffffff",
            intensity=0.3
        )
        self._directional_lights: List[DirectionalLight] = [
            DirectionalLight(
                name="Main Directional",
                color="#ffffff",
                intensity=1.0,
                position=(5.0, 10.0, 7.0)
            )
        ]
        self._point_lights: List = []
        
        # Scene settings
        self._background_color = "#1a1a2e"
        self._fog = None
        
        logger.info(f"Scene '{name}' created")
    
    @property
    def name(self) -> str:
        """Get scene name"""
        return self._name
    
    @name.setter
    def name(self, value: str):
        """Set scene name"""
        self._name = value
    
    @property
    def game_objects(self) -> List[GameObject]:
        """Get all game objects"""
        return self._game_objects.copy()
    
    @property
    def ambient_light(self) -> Optional[AmbientLight]:
        """Get ambient light"""
        return self._ambient_light
    
    @ambient_light.setter
    def ambient_light(self, value: Optional[AmbientLight]):
        """Set ambient light"""
        self._ambient_light = value
        logger.debug(f"Scene '{self._name}' ambient light updated")
    
    @property
    def directional_lights(self) -> List[DirectionalLight]:
        """Get directional lights"""
        return self._directional_lights.copy()
    
    @property
    def background_color(self) -> str:
        """Get background color"""
        return self._background_color
    
    @background_color.setter
    def background_color(self, value: str):
        """Set background color"""
        self._background_color = value
        logger.debug(f"Scene '{self._name}' background color set to {value}")
    
    def add_object(self, obj: GameObject):
        """
        Add a game object to the scene
        
        Args:
            obj: GameObject to add
        """
        if obj not in self._game_objects:
            self._game_objects.append(obj)
            self._objects_by_name[obj.name] = obj
            self._objects_by_id[obj.id] = obj
            obj.on_start()
            logger.debug(f"GameObject '{obj.name}' added to scene '{self._name}'")
        else:
            logger.warning(f"GameObject '{obj.name}' already in scene")
    
    def remove_object(self, obj: GameObject):
        """
        Remove a game object from the scene
        
        Args:
            obj: GameObject to remove
        """
        if obj in self._game_objects:
            obj.on_destroy()
            self._game_objects.remove(obj)
            
            # Remove from dictionaries
            if self._objects_by_name.get(obj.name) is obj:
                del self._objects_by_name[obj.name]
            if obj.id in self._objects_by_id:
                del self._objects_by_id[obj.id]
            
            logger.debug(f"GameObject '{obj.name}' removed from scene '{self._name}'")
        else:
            logger.warning(f"GameObject '{obj.name}' not in scene")
    
    def get_object_by_name(self, name: str) -> Optional[GameObject]:
        """
        Get an object by name
        
        Args:
            name: Object name to find
            
        Returns:
            GameObject or None if not found
        """
        return self._objects_by_name.get(name)
    
    def get_object_by_id(self, obj_id: int) -> Optional[GameObject]:
        """
        Get an object by ID
        
        Args:
            obj_id: Object ID to find
            
        Returns:
            GameObject or None if not found
        """
        return self._objects_by_id.get(obj_id)
    
    def get_objects_by_tag(self, tag: str) -> List[GameObject]:
        """
        Get all objects with a specific tag
        
        Args:
            tag: Tag to search for
            
        Returns:
            List of GameObjects with the tag
        """
        return [obj for obj in self._game_objects if obj.has_tag(tag)]
    
    def add_directional_light(self, light: DirectionalLight):
        """
        Add a directional light
        
        Args:
            light: DirectionalLight to add
        """
        if light not in self._directional_lights:
            self._directional_lights.append(light)
            logger.debug(f"DirectionalLight '{light.name}' added to scene")
    
    def remove_directional_light(self, light: DirectionalLight):
        """
        Remove a directional light
        
        Args:
            light: DirectionalLight to remove
        """
        if light in self._directional_lights:
            self._directional_lights.remove(light)
            logger.debug(f"DirectionalLight '{light.name}' removed from scene")
    
    def update_all(self, delta_time: float):
        """
        Update all game objects in the scene
        
        Args:
            delta_time: Time since last update in seconds
        """
        for obj in self._game_objects:
            if obj.active:
                obj.update(delta_time)
    
    def clear(self):
        """Clear all objects from the scene"""
        for obj in self._game_objects:
            obj.on_destroy()
        
        self._game_objects.clear()
        self._objects_by_name.clear()
        self._objects_by_id.clear()
        
        # Reset lighting to defaults
        self._ambient_light = AmbientLight(
            name="Default Ambient",
            color="#ffffff",
            intensity=0.3
        )
        self._directional_lights = [
            DirectionalLight(
                name="Main Directional",
                color="#ffffff",
                intensity=1.0,
                position=(5.0, 10.0, 7.0)
            )
        ]
        
        logger.info(f"Scene '{self._name}' cleared")
    
    def to_dict(self) -> dict:
        """Convert scene to dictionary for serialization"""
        return {
            "name": self._name,
            "background_color": self._background_color,
            "objects": [obj.to_dict() for obj in self._game_objects],
            "lighting": {
                "ambient": self._ambient_light.to_dict() if self._ambient_light else None,
                "directional": [light.to_dict() for light in self._directional_lights]
            }
        }
    
    def from_dict(self, data: dict):
        """Load scene from dictionary"""
        if "name" in data:
            self._name = data["name"]
        if "background_color" in data:
            self._background_color = data["background_color"]
        
        # Note: Object loading would need special handling for references
        # This is a simplified version
