#!/usr/bin/env python3
"""
Mini Game Engine - Python Server
Main entry point for the Python backend
"""

import asyncio
import websockets
import json
import logging
from engine import GameEngine
from api.websocket_handler import WebSocketHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global engine instance
engine = None
ws_handler = None

async def handle_connection(websocket):
    """
    Handle a single WebSocket connection
    """
    global engine, ws_handler
    
    logger.info(f"New connection from {websocket.remote_address}")
    
    try:
        # Create engine if not exists
        if engine is None:
            engine = GameEngine()
            logger.info("GameEngine initialized")
        
        # Create WebSocket handler for this connection
        ws_handler = WebSocketHandler(websocket, engine)
        
        # Handle messages
        async for message in websocket:
            try:
                data = json.loads(message)
                await ws_handler.handle_message(data)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON: {e}")
                await ws_handler.send_error("Invalid JSON format")
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                await ws_handler.send_error(str(e))
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Connection closed from {websocket.remote_address}")
    except Exception as e:
        logger.error(f"Connection error: {e}")
    finally:
        logger.info("Connection handler cleanup")

async def start_server():
    """
    Start the WebSocket server
    """
    logger.info("Starting Mini Game Engine Python Server...")
    logger.info("Python backend is ready to accept connections")
    
    # Start WebSocket server on port 8765
    async with websockets.serve(handle_connection, "localhost", 8765):
        logger.info("WebSocket server running on ws://localhost:8765")
        await asyncio.Future()  # Run forever

def main():
    """
    Main entry point
    """
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise

if __name__ == "__main__":
    main()
