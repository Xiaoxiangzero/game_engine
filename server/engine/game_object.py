"""
Mini Game Engine - Game Object
"""

import logging
from typing import Optional, Dict, Any, List
from .transform import Transform
from .material import Material

logger = logging.getLogger(__name__)

class GameObject:
    """
    Base class for all game objects in the scene
    """
    
    _id_counter = 0
    
    def __init__(self, 
                 name: str = "GameObject",
                 position: tuple = (0.0, 0.0, 0.0),
                 rotation: tuple = (0.0, 0.0, 0.0),
                 scale: tuple = (1.0, 1.0, 1.0)):
        """
        Initialize a Game Object
        
        Args:
            name: Object name
            position: Initial position (x, y, z)
            rotation: Initial rotation (x, y, z) in radians
            scale: Initial scale (x, y, z)
        """
        # Unique ID
        GameObject._id_counter += 1
        self._id = GameObject._id_counter
        
        self._name = name
        self._transform = Transform(position, rotation, scale)
        self._material = Material()
        
        # Object properties
        self._active = True
        self._visible = True
        self._tags: List[str] = []
        self._layers: List[str] = []
        
        # Components
        self._components: Dict[str, Any] = {}
        
        # Parent/children hierarchy
        self._parent: Optional['GameObject'] = None
        self._children: List['GameObject'] = []
        
        # Custom properties
        self._user_data: Dict[str, Any] = {}
        
        logger.debug(f"GameObject '{name}' (ID: {self._id}) created")
    
    @property
    def id(self) -> int:
        """Get unique object ID"""
        return self._id
    
    @property
    def name(self) -> str:
        """Get object name"""
        return self._name
    
    @name.setter
    def name(self, value: str):
        """Set object name"""
        self._name = value
        logger.debug(f"GameObject renamed to '{value}'")
    
    @property
    def transform(self) -> Transform:
        """Get transform component"""
        return self._transform
    
    @property
    def material(self) -> Material:
        """Get material"""
        return self._material
    
    @material.setter
    def material(self, value: Material):
        """Set material"""
        self._material = value
        logger.debug(f"GameObject '{self._name}' material updated")
    
    @property
    def active(self) -> bool:
        """Check if object is active"""
        return self._active
    
    @active.setter
    def active(self, value: bool):
        """Set object active state"""
        self._active = value
        logger.debug(f"GameObject '{self._name}' active={value}")
    
    @property
    def visible(self) -> bool:
        """Check if object is visible"""
        return self._visible
    
    @visible.setter
    def visible(self, value: bool):
        """Set object visibility"""
        self._visible = value
        logger.debug(f"GameObject '{self._name}' visible={value}")
    
    @property
    def tags(self) -> List[str]:
        """Get object tags"""
        return self._tags.copy()
    
    def add_tag(self, tag: str):
        """Add a tag to the object"""
        if tag not in self._tags:
            self._tags.append(tag)
            logger.debug(f"GameObject '{self._name}' added tag: {tag}")
    
    def remove_tag(self, tag: str):
        """Remove a tag from the object"""
        if tag in self._tags:
            self._tags.remove(tag)
            logger.debug(f"GameObject '{self._name}' removed tag: {tag}")
    
    def has_tag(self, tag: str) -> bool:
        """Check if object has a specific tag"""
        return tag in self._tags
    
    @property
    def layers(self) -> List[str]:
        """Get object layers"""
        return self._layers.copy()
    
    def add_layer(self, layer: str):
        """Add a layer to the object"""
        if layer not in self._layers:
            self._layers.append(layer)
            logger.debug(f"GameObject '{self._name}' added to layer: {layer}")
    
    def remove_layer(self, layer: str):
        """Remove a layer from the object"""
        if layer in self._layers:
            self._layers.remove(layer)
            logger.debug(f"GameObject '{self._name}' removed from layer: {layer}")
    
    @property
    def parent(self) -> Optional['GameObject']:
        """Get parent object"""
        return self._parent
    
    @parent.setter
    def parent(self, value: Optional['GameObject']):
        """Set parent object"""
        # Remove from old parent
        if self._parent is not None:
            self._parent._children.remove(self)
        
        # Add to new parent
        self._parent = value
        if value is not None:
            value._children.append(self)
        
        # Update transform parent
        self._transform.parent = value._transform if value else None
        
        logger.debug(f"GameObject '{self._name}' parent set to {value.name if value else 'None'}")
    
    @property
    def children(self) -> List['GameObject']:
        """Get child objects"""
        return self._children.copy()
    
    def add_child(self, child: 'GameObject'):
        """Add a child object"""
        child.parent = self
    
    def remove_child(self, child: 'GameObject'):
        """Remove a child object"""
        if child in self._children:
            child.parent = None
    
    def get_component(self, component_name: str) -> Any:
        """Get a component by name"""
        return self._components.get(component_name)
    
    def add_component(self, component_name: str, component: Any):
        """Add a component"""
        self._components[component_name] = component
        logger.debug(f"GameObject '{self._name}' added component: {component_name}")
    
    def remove_component(self, component_name: str):
        """Remove a component"""
        if component_name in self._components:
            del self._components[component_name]
            logger.debug(f"GameObject '{self._name}' removed component: {component_name}")
    
    def get_user_data(self, key: str) -> Any:
        """Get custom user data"""
        return self._user_data.get(key)
    
    def set_user_data(self, key: str, value: Any):
        """Set custom user data"""
        self._user_data[key] = value
    
    def update(self, delta_time: float):
        """
        Update the object (called every frame)
        
        Args:
            delta_time: Time since last update in seconds
        """
        # This is a base method to be overridden by subclasses
        pass
    
    def on_start(self):
        """Called when object is added to scene"""
        logger.debug(f"GameObject '{self._name}' started")
    
    def on_destroy(self):
        """Called when object is removed from scene"""
        logger.debug(f"GameObject '{self._name}' destroyed")
    
    def destroy(self):
        """Mark object for destruction"""
        self._active = False
        # In a real engine, this would schedule the object for removal
    
    def to_dict(self) -> dict:
        """Convert object to dictionary for serialization"""
        return {
            "id": self._id,
            "name": self._name,
            "transform": self._transform.to_dict(),
            "material": self._material.to_dict(),
            "active": self._active,
            "visible": self._visible,
            "tags": self._tags,
            "layers": self._layers,
            "parent_id": self._parent.id if self._parent else None,
            "children_ids": [child.id for child in self._children],
            "user_data": self._user_data
        }
    
    def from_dict(self, data: dict):
        """Load object from dictionary"""
        if "name" in data:
            self._name = data["name"]
        if "transform" in data:
            self._transform.from_dict(data["transform"])
        if "material" in data:
            self._material.from_dict(data["material"])
        if "active" in data:
            self._active = data["active"]
        if "visible" in data:
            self._visible = data["visible"]
        if "tags" in data:
            self._tags = data["tags"]
        if "layers" in data:
            self._layers = data["layers"]
        if "user_data" in data:
            self._user_data = data["user_data"]
