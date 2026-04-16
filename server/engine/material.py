"""
Mini Game Engine - Material System
"""

import logging
from typing import Dict, Optional, Any

logger = logging.getLogger(__name__)

class Material:
    """
    Material class for object appearance
    """
    
    def __init__(self, 
                 color: str = "#ff0000",
                 roughness: float = 0.5,
                 metalness: float = 0.3,
                 name: str = "Default Material"):
        """
        Initialize a material
        
        Args:
            color: Hex color string
            roughness: Surface roughness (0-1)
            metalness: Metalness factor (0-1)
            name: Material name
        """
        self._name = name
        self._color = color
        self._roughness = max(0.0, min(1.0, roughness))
        self._metalness = max(0.0, min(1.0, metalness))
        
        # Additional material properties
        self._properties: Dict[str, Any] = {
            "emissive": "#000000",
            "emissiveIntensity": 0.0,
            "transparent": False,
            "opacity": 1.0,
            "wireframe": False,
            "flatShading": False
        }
        
        logger.debug(f"Material '{name}' created with color {color}")
    
    @property
    def name(self) -> str:
        """Get material name"""
        return self._name
    
    @name.setter
    def name(self, value: str):
        """Set material name"""
        self._name = value
    
    @property
    def color(self) -> str:
        """Get material color"""
        return self._color
    
    @color.setter
    def color(self, value: str):
        """Set material color"""
        # Validate hex color
        if value.startswith('#') and len(value) in (4, 7, 9):
            self._color = value
            logger.debug(f"Material '{self._name}' color changed to {value}")
        else:
            logger.warning(f"Invalid color format: {value}")
    
    @property
    def roughness(self) -> float:
        """Get roughness"""
        return self._roughness
    
    @roughness.setter
    def roughness(self, value: float):
        """Set roughness (clamped to 0-1)"""
        self._roughness = max(0.0, min(1.0, value))
        logger.debug(f"Material '{self._name}' roughness set to {self._roughness}")
    
    @property
    def metalness(self) -> float:
        """Get metalness"""
        return self._metalness
    
    @metalness.setter
    def metalness(self, value: float):
        """Set metalness (clamped to 0-1)"""
        self._metalness = max(0.0, min(1.0, value))
        logger.debug(f"Material '{self._name}' metalness set to {self._metalness}")
    
    def get_property(self, key: str) -> Any:
        """Get a custom material property"""
        return self._properties.get(key)
    
    def set_property(self, key: str, value: Any):
        """Set a custom material property"""
        self._properties[key] = value
        logger.debug(f"Material '{self._name}' property '{key}' set to {value}")
    
    def set_emissive(self, color: str, intensity: float = 1.0):
        """
        Set emissive properties
        
        Args:
            color: Emissive color hex
            intensity: Emissive intensity
        """
        self._properties["emissive"] = color
        self._properties["emissiveIntensity"] = max(0.0, intensity)
        logger.debug(f"Material '{self._name}' emissive set to {color} with intensity {intensity}")
    
    def set_transparent(self, transparent: bool, opacity: float = 0.5):
        """
        Set transparency
        
        Args:
            transparent: Whether material is transparent
            opacity: Opacity value (0-1)
        """
        self._properties["transparent"] = transparent
        self._properties["opacity"] = max(0.0, min(1.0, opacity))
        logger.debug(f"Material '{self._name}' transparent={transparent}, opacity={opacity}")
    
    def set_wireframe(self, wireframe: bool):
        """Set wireframe mode"""
        self._properties["wireframe"] = wireframe
        logger.debug(f"Material '{self._name}' wireframe={wireframe}")
    
    def set_flat_shading(self, flat_shading: bool):
        """Set flat shading mode"""
        self._properties["flatShading"] = flat_shading
        logger.debug(f"Material '{self._name}' flatShading={flat_shading}")
    
    def clone(self) -> 'Material':
        """Create a copy of this material"""
        clone = Material(
            color=self._color,
            roughness=self._roughness,
            metalness=self._metalness,
            name=f"{self._name} (Clone)"
        )
        clone._properties = self._properties.copy()
        return clone
    
    def to_dict(self) -> dict:
        """Convert material to dictionary for serialization"""
        return {
            "name": self._name,
            "color": self._color,
            "roughness": self._roughness,
            "metalness": self._metalness,
            **self._properties
        }
    
    def from_dict(self, data: dict):
        """Load material from dictionary"""
        if "name" in data:
            self._name = data["name"]
        if "color" in data:
            self._color = data["color"]
        if "roughness" in data:
            self._roughness = max(0.0, min(1.0, data["roughness"]))
        if "metalness" in data:
            self._metalness = max(0.0, min(1.0, data["metalness"]))
        
        # Load custom properties
        for key, value in data.items():
            if key not in ["name", "color", "roughness", "metalness"]:
                self._properties[key] = value
    
    @staticmethod
    def create_preset(preset_name: str) -> 'Material':
        """
        Create a material from preset
        
        Available presets:
        - metal: Shiny metal material
        - plastic: Smooth plastic material
        - rubber: Matte rubber material
        - glass: Transparent glass material
        - chrome: Mirror-like chrome
        - gold: Gold metal
        """
        presets = {
            "metal": {
                "color": "#c0c0c0",
                "roughness": 0.2,
                "metalness": 0.9,
                "name": "Metal"
            },
            "plastic": {
                "color": "#ff4444",
                "roughness": 0.4,
                "metalness": 0.1,
                "name": "Plastic"
            },
            "rubber": {
                "color": "#222222",
                "roughness": 0.9,
                "metalness": 0.0,
                "name": "Rubber"
            },
            "glass": {
                "color": "#88ccff",
                "roughness": 0.1,
                "metalness": 0.0,
                "name": "Glass",
                "transparent": True,
                "opacity": 0.3
            },
            "chrome": {
                "color": "#ffffff",
                "roughness": 0.05,
                "metalness": 1.0,
                "name": "Chrome"
            },
            "gold": {
                "color": "#ffd700",
                "roughness": 0.3,
                "metalness": 0.8,
                "name": "Gold"
            }
        }
        
        preset = presets.get(preset_name.lower())
        if preset:
            material = Material(
                color=preset["color"],
                roughness=preset["roughness"],
                metalness=preset["metalness"],
                name=preset["name"]
            )
            # Set additional properties
            if "transparent" in preset:
                material.set_transparent(preset["transparent"], preset.get("opacity", 0.5))
            return material
        
        logger.warning(f"Unknown material preset: {preset_name}")
        return Material()
