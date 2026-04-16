"""
Mini Game Engine - WebSocket Handler
"""

import logging
import json
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class WebSocketHandler:
    """
    Handler for WebSocket communication between frontend and Python backend
    """
    
    def __init__(self, websocket, engine):
        """
        Initialize the WebSocket handler
        
        Args:
            websocket: WebSocket connection
            engine: Reference to the game engine
        """
        self._websocket = websocket
        self._engine = engine
    
    async def handle_message(self, message: Dict[str, Any]):
        """
        Handle an incoming message
        
        Args:
            message: Parsed JSON message
        """
        message_type = message.get("type")
        data = message.get("data", {})
        
        logger.debug(f"Received message type: {message_type}")
        
        handlers = {
            "init": self._handle_init,
            "start_game_loop": self._handle_start_game_loop,
            "stop_game_loop": self._handle_stop_game_loop,
            "get_scene_info": self._handle_get_scene_info,
            "object_position": self._handle_object_position,
            "object_rotation": self._handle_object_rotation,
            "object_scale": self._handle_object_scale,
            "material_color": self._handle_material_color,
            "light_intensity": self._handle_light_intensity,
            "reset": self._handle_reset,
            "execute_script": self._handle_execute_script,
            "ping": self._handle_ping
        }
        
        handler = handlers.get(message_type)
        if handler:
            await handler(data)
        else:
            logger.warning(f"Unknown message type: {message_type}")
            await self.send_error(f"Unknown message type: {message_type}")
    
    async def _handle_init(self, data: Dict):
        """Handle initialization message"""
        logger.info("Client initialized connection")
        
        # Send engine info
        await self.send({
            "type": "init_response",
            "data": {
                "engine_version": self._engine.config["version"],
                "capabilities": self._engine.config["capabilities"],
                "status": "ready"
            }
        })
        
        # Send initial scene info
        await self._send_scene_info()
    
    async def _handle_start_game_loop(self, data: Dict):
        """Handle start game loop request"""
        logger.info("Starting game loop (client request)")
        
        if not self._engine.is_running:
            self._engine.start()
            await self.send({
                "type": "game_loop_started",
                "data": {
                    "message": "Game loop started successfully"
                }
            })
        else:
            await self.send({
                "type": "game_loop_already_running",
                "data": {
                    "message": "Game loop is already running"
                }
            })
    
    async def _handle_stop_game_loop(self, data: Dict):
        """Handle stop game loop request"""
        logger.info("Stopping game loop (client request)")
        
        if self._engine.is_running:
            self._engine.stop()
            await self.send({
                "type": "game_loop_stopped",
                "data": {
                    "message": "Game loop stopped successfully"
                }
            })
        else:
            await self.send({
                "type": "game_loop_not_running",
                "data": {
                    "message": "Game loop is not running"
                }
            })
    
    async def _handle_get_scene_info(self, data: Dict):
        """Handle get scene info request"""
        await self._send_scene_info()
    
    async def _send_scene_info(self):
        """Send current scene info to client"""
        scene_info = self._engine.get_scene_info()
        await self.send({
            "type": "scene_info",
            "data": scene_info
        })
    
    async def _handle_object_position(self, data: Dict):
        """Handle object position update"""
        object_name = data.get("object_name", "Main Cube")
        x = data.get("x", 0.0)
        y = data.get("y", 0.0)
        z = data.get("z", 0.0)
        
        logger.debug(f"Updating position of {object_name} to ({x}, {y}, {z})")
        self._engine.update_object_position(object_name, x, y, z)
        
        await self.send({
            "type": "object_position_updated",
            "data": {
                "object_name": object_name,
                "position": {"x": x, "y": y, "z": z}
            }
        })
    
    async def _handle_object_rotation(self, data: Dict):
        """Handle object rotation update"""
        object_name = data.get("object_name", "Main Cube")
        x = data.get("x", 0.0)
        y = data.get("y", 0.0)
        z = data.get("z", 0.0)
        
        logger.debug(f"Updating rotation of {object_name} to ({x}, {y}, {z})")
        self._engine.update_object_rotation(object_name, x, y, z)
        
        await self.send({
            "type": "object_rotation_updated",
            "data": {
                "object_name": object_name,
                "rotation": {"x": x, "y": y, "z": z}
            }
        })
    
    async def _handle_object_scale(self, data: Dict):
        """Handle object scale update"""
        object_name = data.get("object_name", "Main Cube")
        x = data.get("x", 1.0)
        y = data.get("y", 1.0)
        z = data.get("z", 1.0)
        
        logger.debug(f"Updating scale of {object_name} to ({x}, {y}, {z})")
        self._engine.update_object_scale(object_name, x, y, z)
        
        await self.send({
            "type": "object_scale_updated",
            "data": {
                "object_name": object_name,
                "scale": {"x": x, "y": y, "z": z}
            }
        })
    
    async def _handle_material_color(self, data: Dict):
        """Handle material color update"""
        object_name = data.get("object_name", "Main Cube")
        color = data.get("color", "#ff0000")
        
        logger.debug(f"Updating material color of {object_name} to {color}")
        self._engine.update_material_color(object_name, color)
        
        await self.send({
            "type": "material_color_updated",
            "data": {
                "object_name": object_name,
                "color": color
            }
        })
    
    async def _handle_light_intensity(self, data: Dict):
        """Handle light intensity update"""
        light_name = data.get("light_name", "Main Directional")
        intensity = data.get("intensity", 1.0)
        
        logger.debug(f"Updating light intensity of {light_name} to {intensity}")
        self._engine.update_light_intensity(light_name, intensity)
        
        await self.send({
            "type": "light_intensity_updated",
            "data": {
                "light_name": light_name,
                "intensity": intensity
            }
        })
    
    async def _handle_reset(self, data: Dict):
        """Handle reset request"""
        logger.info("Resetting engine (client request)")
        self._engine.reset()
        
        await self.send({
            "type": "reset_complete",
            "data": {
                "message": "Engine reset successfully"
            }
        })
        
        # Send updated scene info
        await self._send_scene_info()
    
    async def _handle_execute_script(self, data: Dict):
        """Handle script execution request"""
        script_code = data.get("code", "")
        script_name = data.get("name", "unnamed_script")
        
        logger.info(f"Executing script: {script_name}")
        
        try:
            # Create a safe execution environment
            exec_globals = {
                "engine": self._engine,
                "scene": self._engine.main_scene,
                "print": logger.info
            }
            
            # Execute the script
            exec(script_code, exec_globals)
            
            await self.send({
                "type": "script_executed",
                "data": {
                    "script_name": script_name,
                    "success": True,
                    "message": "Script executed successfully"
                }
            })
            
        except Exception as e:
            logger.error(f"Script execution error: {e}")
            await self.send({
                "type": "script_error",
                "data": {
                    "script_name": script_name,
                    "success": False,
                    "error": str(e)
                }
            })
    
    async def _handle_ping(self, data: Dict):
        """Handle ping request"""
        await self.send({
            "type": "pong",
            "data": {
                "timestamp": data.get("timestamp", 0),
                "server_time": __import__("time").time()
            }
        })
    
    async def send(self, message: Dict[str, Any]):
        """
        Send a message to the client
        
        Args:
            message: Message to send
        """
        try:
            await self._websocket.send(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def send_error(self, error_message: str):
        """
        Send an error message to the client
        
        Args:
            error_message: Error message to send
        """
        await self.send({
            "type": "error",
            "data": {
                "message": error_message
            }
        })
