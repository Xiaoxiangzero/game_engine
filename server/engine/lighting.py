"""
Mini Game Engine - Lighting System
"""

import logging
from typing import Tuple

logger = logging.getLogger(__name__)

class Light:
    """
    Base class for all lights
    """
    
    def __init__(self, 
                 name: str = "Light",
                 color: str = "#ffffff",
                 intensity: float = 1.0):
        """
        Initialize a light
        
        Args:
            name: Light name
            color: Light color hex
            intensity: Light intensity
        """
        self._name = name
        self._color = color
        self._intensity = max(0.0, intensity)
        self._active = True
        
        logger.debug(f"Light '{name}' created with color {color}, intensity {intensity}")
    
    @property
    def name(self) -> str:
        """Get light name"""
        return self._name
    
    @name.setter
    def name(self, value: str):
        """Set light name"""
        self._name = value
    
    @property
    def color(self) -> str:
        """Get light color"""
        return self._color
    
    @color.setter
    def color(self, value: str):
        """Set light color"""
        if value.startswith('#') and len(value) in (4, 7, 9):
            self._color = value
            logger.debug(f"Light '{self._name}' color changed to {value}")
        else:
            logger.warning(f"Invalid color format: {value}")
    
    @property
    def intensity(self) -> float:
        """Get light intensity"""
        return self._intensity
    
    @intensity.setter
    def intensity(self, value: float):
        """Set light intensity"""
        self._intensity = max(0.0, value)
        logger.debug(f"Light '{self._name}' intensity set to {self._intensity}")
    
    @property
    def active(self) -> bool:
        """Check if light is active"""
        return self._active
    
    @active.setter
    def active(self, value: bool):
        """Set light active state"""
        self._active = value
        logger.debug(f"Light '{self._name}' active={value}")
    
    def toggle(self):
        """Toggle light on/off"""
        self._active = not self._active
        logger.debug(f"Light '{self._name}' toggled to {'on' if self._active else 'off'}")
    
    def to_dict(self) -> dict:
        """Convert light to dictionary for serialization"""
        return {
            "name": self._name,
            "type": self.__class__.__name__,
            "color": self._color,
            "intensity": self._intensity,
            "active": self._active
        }
    
    def from_dict(self, data: dict):
        """Load light from dictionary"""
        if "name" in data:
            self._name = data["name"]
        if "color" in data:
            self._color = data["color"]
        if "intensity" in data:
            self._intensity = max(0.0, data["intensity"])
        if "active" in data:
            self._active = data["active"]


class AmbientLight(Light):
    """
    Ambient light - illuminates all objects equally
    """
    
    def __init__(self, 
                 name: str = "Ambient Light",
                 color: str = "#ffffff",
                 intensity: float = 0.3):
        """
        Initialize ambient light
        
        Args:
            name: Light name
            color: Light color
            intensity: Light intensity (typically 0.1-0.5)
        """
        super().__init__(name, color, intensity)
        logger.debug(f"AmbientLight '{name}' created")
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return super().to_dict()


class DirectionalLight(Light):
    """
    Directional light - simulates sunlight with parallel rays
    """
    
    def __init__(self, 
                 name: str = "Directional Light",
                 color: str = "#ffffff",
                 intensity: float = 1.0,
                 position: Tuple[float, float, float] = (5.0, 10.0, 7.0),
                 target: Tuple[float, float, float] = (0.0, 0.0, 0.0)):
        """
        Initialize directional light
        
        Args:
            name: Light name
            color: Light color
            intensity: Light intensity
            position: Light position (x, y, z)
            target: Target position that light points to (x, y, z)
        """
        super().__init__(name, color, intensity)
        self._position = list(position)
        self._target = list(target)
        self._cast_shadow = True
        
        logger.debug(f"DirectionalLight '{name}' created at position {position}")
    
    @property
    def position(self) -> Tuple[float, float, float]:
        """Get light position"""
        return tuple(self._position)
    
    @position.setter
    def position(self, value: Tuple[float, float, float]):
        """Set light position"""
        if len(value) != 3:
            raise ValueError("Position must be a tuple of 3 values (x, y, z)")
        self._position = list(value)
        logger.debug(f"DirectionalLight '{self._name}' position set to {self._position}")
    
    @property
    def target(self) -> Tuple[float, float, float]:
        """Get light target"""
        return tuple(self._target)
    
    @target.setter
    def target(self, value: Tuple[float, float, float]):
        """Set light target"""
        if len(value) != 3:
            raise ValueError("Target must be a tuple of 3 values (x, y, z)")
        self._target = list(value)
        logger.debug(f"DirectionalLight '{self._name}' target set to {self._target}")
    
    @property
    def cast_shadow(self) -> bool:
        """Check if light casts shadows"""
        return self._cast_shadow
    
    @cast_shadow.setter
    def cast_shadow(self, value: bool):
        """Set shadow casting"""
        self._cast_shadow = value
        logger.debug(f"DirectionalLight '{self._name}' cast_shadow={value}")
    
    def look_at(self, target: Tuple[float, float, float]):
        """Make light point to target"""
        self._target = list(target)
        logger.debug(f"DirectionalLight '{self._name}' looking at {target}")
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        base = super().to_dict()
        base.update({
            "position": {
                "x": self._position[0],
                "y": self._position[1],
                "z": self._position[2]
            },
            "target": {
                "x": self._target[0],
                "y": self._target[1],
                "z": self._target[2]
            },
            "cast_shadow": self._cast_shadow
        })
        return base
    
    def from_dict(self, data: dict):
        """Load from dictionary"""
        super().from_dict(data)
        
        if "position" in data:
            pos = data["position"]
            self._position = [pos.get("x", 0.0), pos.get("y", 0.0), pos.get("z", 0.0)]
        
        if "target" in data:
            tgt = data["target"]
            self._target = [tgt.get("x", 0.0), tgt.get("y", 0.0), tgt.get("z", 0.0)]
        
        if "cast_shadow" in data:
            self._cast_shadow = data["cast_shadow"]


class PointLight(Light):
    """
    Point light - emits light in all directions from a point
    """
    
    def __init__(self, 
                 name: str = "Point Light",
                 color: str = "#ffffff",
                 intensity: float = 1.0,
                 position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
                 distance: float = 50.0,
                 decay: float = 2.0):
        """
        Initialize point light
        
        Args:
            name: Light name
            color: Light color
            intensity: Light intensity
            position: Light position
            distance: Maximum distance of light
            decay: Light decay rate
        """
        super().__init__(name, color, intensity)
        self._position = list(position)
        self._distance = max(0.0, distance)
        self._decay = max(0.0, decay)
        self._cast_shadow = False
        
        logger.debug(f"PointLight '{name}' created at position {position}")
    
    @property
    def position(self) -> Tuple[float, float, float]:
        """Get light position"""
        return tuple(self._position)
    
    @position.setter
    def position(self, value: Tuple[float, float, float]):
        """Set light position"""
        if len(value) != 3:
            raise ValueError("Position must be a tuple of 3 values (x, y, z)")
        self._position = list(value)
    
    @property
    def distance(self) -> float:
        """Get light distance"""
        return self._distance
    
    @distance.setter
    def distance(self, value: float):
        """Set light distance"""
        self._distance = max(0.0, value)
    
    @property
    def decay(self) -> float:
        """Get light decay"""
        return self._decay
    
    @decay.setter
    def decay(self, value: float):
        """Set light decay"""
        self._decay = max(0.0, value)
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        base = super().to_dict()
        base.update({
            "position": {
                "x": self._position[0],
                "y": self._position[1],
                "z": self._position[2]
            },
            "distance": self._distance,
            "decay": self._decay
        })
        return base
