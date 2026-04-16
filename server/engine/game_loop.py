"""
Mini Game Engine - Game Loop
"""

import asyncio
import logging
import time
from typing import Optional, Callable

logger = logging.getLogger(__name__)

class GameLoop:
    """
    Game loop manager for the engine
    """
    
    # Target frame rate (60 FPS)
    TARGET_FPS = 60
    TARGET_DELTA_TIME = 1.0 / TARGET_FPS
    
    def __init__(self, engine):
        """
        Initialize the game loop
        
        Args:
            engine: Reference to the main game engine
        """
        self._engine = engine
        self._is_running = False
        self._is_paused = False
        
        # Timing
        self._last_frame_time = 0.0
        self._delta_time = 0.0
        self._elapsed_time = 0.0
        self._frame_count = 0
        
        # Callbacks
        self._update_callbacks: list = []
        self._late_update_callbacks: list = []
        self._fixed_update_callbacks: list = []
        
        # Fixed update timing
        self._fixed_time_step = 0.02  # 50 updates per second
        self._fixed_accumulator = 0.0
        
        # Asyncio task
        self._loop_task: Optional[asyncio.Task] = None
        
        logger.info("GameLoop initialized")
    
    @property
    def is_running(self) -> bool:
        """Check if game loop is running"""
        return self._is_running
    
    @property
    def is_paused(self) -> bool:
        """Check if game loop is paused"""
        return self._is_paused
    
    @property
    def delta_time(self) -> float:
        """Get time since last frame (seconds)"""
        return self._delta_time
    
    @property
    def elapsed_time(self) -> float:
        """Get total elapsed time (seconds)"""
        return self._elapsed_time
    
    @property
    def frame_count(self) -> int:
        """Get total frame count"""
        return self._frame_count
    
    @property
    def fps(self) -> float:
        """Get current FPS"""
        if self._delta_time > 0:
            return 1.0 / self._delta_time
        return 0.0
    
    def add_update_callback(self, callback: Callable[[float], None]):
        """
        Add a callback to be called each frame
        
        Args:
            callback: Function that takes delta_time as argument
        """
        self._update_callbacks.append(callback)
        logger.debug("Update callback added")
    
    def remove_update_callback(self, callback: Callable[[float], None]):
        """
        Remove an update callback
        
        Args:
            callback: Callback to remove
        """
        if callback in self._update_callbacks:
            self._update_callbacks.remove(callback)
            logger.debug("Update callback removed")
    
    def add_late_update_callback(self, callback: Callable[[float], None]):
        """
        Add a callback to be called after update
        
        Args:
            callback: Function that takes delta_time as argument
        """
        self._late_update_callbacks.append(callback)
        logger.debug("Late update callback added")
    
    def add_fixed_update_callback(self, callback: Callable[[float], None]):
        """
        Add a callback for fixed timestep updates
        
        Args:
            callback: Function that takes fixed_delta_time as argument
        """
        self._fixed_update_callbacks.append(callback)
        logger.debug("Fixed update callback added")
    
    def start(self):
        """Start the game loop"""
        if self._is_running:
            logger.warning("GameLoop is already running")
            return
        
        logger.info("Starting GameLoop...")
        self._is_running = True
        self._is_paused = False
        self._last_frame_time = time.time()
        self._frame_count = 0
        self._elapsed_time = 0.0
        
        # Run in asyncio event loop
        self._loop_task = asyncio.create_task(self._run_loop())
        logger.info("GameLoop started")
    
    def stop(self):
        """Stop the game loop"""
        if not self._is_running:
            logger.warning("GameLoop is not running")
            return
        
        logger.info("Stopping GameLoop...")
        self._is_running = False
        
        if self._loop_task:
            self._loop_task.cancel()
            self._loop_task = None
        
        logger.info("GameLoop stopped")
    
    def pause(self):
        """Pause the game loop"""
        if not self._is_running:
            logger.warning("Cannot pause: GameLoop is not running")
            return
        
        if self._is_paused:
            logger.warning("GameLoop is already paused")
            return
        
        logger.info("Pausing GameLoop...")
        self._is_paused = True
        logger.info("GameLoop paused")
    
    def resume(self):
        """Resume the game loop from pause"""
        if not self._is_paused:
            logger.warning("GameLoop is not paused")
            return
        
        logger.info("Resuming GameLoop...")
        self._is_paused = False
        self._last_frame_time = time.time()
        logger.info("GameLoop resumed")
    
    async def _run_loop(self):
        """
        Main game loop (async version)
        """
        while self._is_running:
            try:
                # Calculate delta time
                current_time = time.time()
                self._delta_time = current_time - self._last_frame_time
                self._last_frame_time = current_time
                
                # Limit delta time to prevent spiral of death
                if self._delta_time > 0.25:
                    self._delta_time = 0.25
                
                # Update elapsed time
                self._elapsed_time += self._delta_time
                self._frame_count += 1
                
                # Only run updates if not paused
                if not self._is_paused:
                    # Fixed update (physics, etc.)
                    self._fixed_accumulator += self._delta_time
                    while self._fixed_accumulator >= self._fixed_time_step:
                        self._fixed_update(self._fixed_time_step)
                        self._fixed_accumulator -= self._fixed_time_step
                    
                    # Regular update
                    self._update(self._delta_time)
                    
                    # Late update
                    self._late_update(self._delta_time)
                
                # Wait for next frame (yield to asyncio)
                await asyncio.sleep(self.TARGET_DELTA_TIME)
                
            except asyncio.CancelledError:
                logger.info("GameLoop task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in game loop: {e}", exc_info=True)
                # Continue running despite errors
        
        logger.info("GameLoop _run_loop ended")
    
    def _update(self, delta_time: float):
        """
        Run all update callbacks
        
        Args:
            delta_time: Time since last frame
        """
        # Update scene objects
        if self._engine and self._engine.main_scene:
            self._engine.main_scene.update_all(delta_time)
        
        # Run custom callbacks
        for callback in self._update_callbacks:
            try:
                callback(delta_time)
            except Exception as e:
                logger.error(f"Error in update callback: {e}")
    
    def _late_update(self, delta_time: float):
        """
        Run all late update callbacks
        
        Args:
            delta_time: Time since last frame
        """
        for callback in self._late_update_callbacks:
            try:
                callback(delta_time)
            except Exception as e:
                logger.error(f"Error in late update callback: {e}")
    
    def _fixed_update(self, fixed_delta_time: float):
        """
        Run all fixed update callbacks
        
        Args:
            fixed_delta_time: Fixed time step
        """
        for callback in self._fixed_update_callbacks:
            try:
                callback(fixed_delta_time)
            except Exception as e:
                logger.error(f"Error in fixed update callback: {e}")
    
    def get_stats(self) -> dict:
        """
        Get game loop statistics
        
        Returns:
            Dictionary with stats
        """
        return {
            "is_running": self._is_running,
            "is_paused": self._is_paused,
            "delta_time": self._delta_time,
            "elapsed_time": self._elapsed_time,
            "frame_count": self._frame_count,
            "fps": self.fps,
            "target_fps": self.TARGET_FPS
        }
