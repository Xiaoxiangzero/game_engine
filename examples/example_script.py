#!/usr/bin/env python3
"""
Mini Game Engine - Example Script
示例：如何使用Python API控制游戏引擎

这个示例展示了如何通过WebSocket连接到游戏引擎，
并执行各种操作。
"""

import asyncio
import websockets
import json
import time

class EngineAPIClient:
    """游戏引擎API客户端"""
    
    def __init__(self, uri: str = "ws://localhost:8765"):
        self.uri = uri
        self.websocket = None
    
    async def connect(self):
        """连接到引擎"""
        print(f"连接到引擎: {self.uri}")
        self.websocket = await websockets.connect(self.uri)
        print("连接成功！")
    
    async def send(self, message_type: str, data: dict = None):
        """发送消息"""
        if self.websocket is None:
            raise RuntimeError("未连接到引擎")
        
        message = {
            "type": message_type,
            "data": data or {}
        }
        await self.websocket.send(json.dumps(message))
        print(f"发送: {message_type}")
    
    async def receive(self):
        """接收消息"""
        if self.websocket is None:
            raise RuntimeError("未连接到引擎")
        
        response = await self.websocket.recv()
        return json.loads(response)
    
    async def close(self):
        """关闭连接"""
        if self.websocket:
            await self.websocket.close()
            print("连接已关闭")


async def main():
    """主函数"""
    print("=" * 50)
    print("Mini Game Engine - Python API 示例")
    print("=" * 50)
    print()
    
    # 创建客户端
    client = EngineAPIClient()
    
    try:
        # 连接到引擎
        await client.connect()
        
        # 等待初始化响应
        response = await client.receive()
        print(f"收到: {response.get('type')}")
        
        # 示例1: 获取场景信息
        print("\n" + "-" * 50)
        print("示例1: 获取场景信息")
        print("-" * 50)
        await client.send("get_scene_info")
        response = await client.receive()
        print(f"场景信息: {json.dumps(response, indent=2, ensure_ascii=False)}")
        
        # 示例2: 移动对象
        print("\n" + "-" * 50)
        print("示例2: 移动对象")
        print("-" * 50)
        await client.send("object_position", {
            "object_name": "Main Cube",
            "x": 2.0,
            "y": 1.0,
            "z": 0.0
        })
        response = await client.receive()
        print(f"响应: {response}")
        
        # 等待一下让效果可见
        await asyncio.sleep(1)
        
        # 示例3: 改变材质颜色
        print("\n" + "-" * 50)
        print("示例3: 改变材质颜色为蓝色")
        print("-" * 50)
        await client.send("material_color", {
            "object_name": "Main Cube",
            "color": "#0000ff"
        })
        response = await client.receive()
        print(f"响应: {response}")
        
        await asyncio.sleep(1)
        
        # 示例4: 开始游戏循环
        print("\n" + "-" * 50)
        print("示例4: 开始游戏循环")
        print("-" * 50)
        await client.send("start_game_loop")
        response = await client.receive()
        print(f"响应: {response}")
        
        # 运行3秒
        print("游戏循环运行中...")
        await asyncio.sleep(3)
        
        # 示例5: 停止游戏循环
        print("\n" + "-" * 50)
        print("示例5: 停止游戏循环")
        print("-" * 50)
        await client.send("stop_game_loop")
        response = await client.receive()
        print(f"响应: {response}")
        
        # 示例6: 重置引擎
        print("\n" + "-" * 50)
        print("示例6: 重置引擎")
        print("-" * 50)
        await client.send("reset")
        response = await client.receive()
        print(f"响应: {response}")
        
        print("\n" + "=" * 50)
        print("示例执行完成！")
        print("=" * 50)
        
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
