"""
Mini Game Engine - Transform Component
"""

import logging
from typing import Tuple, List

logger = logging.getLogger(__name__)

class Transform:
    """
    Transform class for 3D object positioning, rotation, and scaling
    """
    
    def __init__(self, 
                 position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
                 rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
                 scale: Tuple[float, float, float] = (1.0, 1.0, 1.0)):
        """
        Initialize a Transform component
        
        Args:
            position: (x, y, z) coordinates
            rotation: (x, y, z) rotation in radians
            scale: (x, y, z) scale factors
        """
        self._position = list(position)
        self._rotation = list(rotation)
        self._scale = list(scale)
        
        # Parent transform for hierarchical transforms
        self._parent = None
        self._children: List['Transform'] = []
    
    @property
    def position(self) -> Tuple[float, float, float]:
        """Get local position"""
        return tuple(self._position)
    
    @position.setter
    def position(self, value: Tuple[float, float, float]):
        """Set local position"""
        if len(value) != 3:
            raise ValueError("Position must be a tuple of 3 values (x, y, z)")
        self._position = list(value)
        logger.debug(f"Transform position set to {self._position}")
    
    @property
    def rotation(self) -> Tuple[float, float, float]:
        """Get local rotation in radians"""
        return tuple(self._rotation)
    
    @rotation.setter
    def rotation(self, value: Tuple[float, float, float]):
        """Set local rotation in radians"""
        if len(value) != 3:
            raise ValueError("Rotation must be a tuple of 3 values (x, y, z)")
        self._rotation = list(value)
        logger.debug(f"Transform rotation set to {self._rotation}")
    
    @property
    def scale(self) -> Tuple[float, float, float]:
        """Get local scale"""
        return tuple(self._scale)
    
    @scale.setter
    def scale(self, value: Tuple[float, float, float]):
        """Set local scale"""
        if len(value) != 3:
            raise ValueError("Scale must be a tuple of 3 values (x, y, z)")
        self._scale = list(value)
        logger.debug(f"Transform scale set to {self._scale}")
    
    @property
    def parent(self) -> 'Transform':
        """Get parent transform"""
        return self._parent
    
    @parent.setter
    def parent(self, value: 'Transform'):
        """Set parent transform"""
        # Remove from old parent
        if self._parent is not None:
            self._parent._children.remove(self)
        
        # Add to new parent
        self._parent = value
        if value is not None:
            value._children.append(self)
    
    @property
    def children(self) -> List['Transform']:
        """Get child transforms"""
        return self._children.copy()
    
    @property
    def world_position(self) -> Tuple[float, float, float]:
        """Get world position (including parent transforms)"""
        if self._parent is None:
            return tuple(self._position)
        
        # Calculate world position by combining parent transforms
        parent_world = self._parent.world_position
        return (
            parent_world[0] + self._position[0],
            parent_world[1] + self._position[1],
            parent_world[2] + self._position[2]
        )
    
    @property
    def world_rotation(self) -> Tuple[float, float, float]:
        """Get world rotation (including parent transforms)"""
        if self._parent is None:
            return tuple(self._rotation)
        
        parent_world = self._parent.world_rotation
        return (
            parent_world[0] + self._rotation[0],
            parent_world[1] + self._rotation[1],
            parent_world[2] + self._rotation[2]
        )
    
    @property
    def world_scale(self) -> Tuple[float, float, float]:
        """Get world scale (including parent transforms)"""
        if self._parent is None:
            return tuple(self._scale)
        
        parent_world = self._parent.world_scale
        return (
            parent_world[0] * self._scale[0],
            parent_world[1] * self._scale[1],
            parent_world[2] * self._scale[2]
        )
    
    def translate(self, x: float = 0.0, y: float = 0.0, z: float = 0.0):
        """
        Translate (move) the transform by the given amounts
        
        Args:
            x: Amount to move in X direction
            y: Amount to move in Y direction
            z: Amount to move in Z direction
        """
        self._position[0] += x
        self._position[1] += y
        self._position[2] += z
        logger.debug(f"Transform translated by ({x}, {y}, {z})")
    
    def rotate(self, x: float = 0.0, y: float = 0.0, z: float = 0.0):
        """
        Rotate the transform by the given amounts (in radians)
        
        Args:
            x: Amount to rotate around X axis
            y: Amount to rotate around Y axis
            z: Amount to rotate around Z axis
        """
        self._rotation[0] += x
        self._rotation[1] += y
        self._rotation[2] += z
        logger.debug(f"Transform rotated by ({x}, {y}, {z})")
    
    def scale_by(self, x: float = 1.0, y: float = 1.0, z: float = 1.0):
        """
        Scale the transform by the given factors
        
        Args:
            x: Scale factor for X direction
            y: Scale factor for Y direction
            z: Scale factor for Z direction
        """
        self._scale[0] *= x
        self._scale[1] *= y
        self._scale[2] *= z
        logger.debug(f"Transform scaled by ({x}, {y}, {z})")
    
    def look_at(self, target: Tuple[float, float, float]):
        """
        Make the transform look at a target point
        
        Args:
            target: (x, y, z) coordinates to look at
        """
        # Simple look-at implementation
        # In a real engine, this would be more sophisticated
        dx = target[0] - self._position[0]
        dz = target[2] - self._position[2]
        
        # Y rotation (around Y axis)
        import math
        self._rotation[1] = math.atan2(dx, dz)
        logger.debug(f"Transform looking at {target}")
    
    def reset(self):
        """Reset transform to identity"""
        self._position = [0.0, 0.0, 0.0]
        self._rotation = [0.0, 0.0, 0.0]
        self._scale = [1.0, 1.0, 1.0]
        logger.debug("Transform reset to identity")
    
    def to_dict(self) -> dict:
        """Convert transform to dictionary for serialization"""
        return {
            "position": {
                "x": self._position[0],
                "y": self._position[1],
                "z": self._position[2]
            },
            "rotation": {
                "x": self._rotation[0],
                "y": self._rotation[1],
                "z": self._rotation[2]
            },
            "scale": {
                "x": self._scale[0],
                "y": self._scale[1],
                "z": self._scale[2]
            }
        }
    
    def from_dict(self, data: dict):
        """Load transform from dictionary"""
        if "position" in data:
            pos = data["position"]
            self._position = [pos.get("x", 0.0), pos.get("y", 0.0), pos.get("z", 0.0)]
        
        if "rotation" in data:
            rot = data["rotation"]
            self._rotation = [rot.get("x", 0.0), rot.get("y", 0.0), rot.get("z", 0.0)]
        
        if "scale" in data:
            scl = data["scale"]
            self._scale = [scl.get("x", 1.0), scl.get("y", 1.0), scl.get("z", 1.0)]
