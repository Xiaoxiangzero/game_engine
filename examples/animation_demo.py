#!/usr/bin/env python3
"""
Mini Game Engine - 动画演示脚本
示例：创建一个循环动画效果
"""

import asyncio
import websockets
import json
import math

class AnimationDemo:
    """动画演示"""
    
    def __init__(self):
        self.uri = "ws://localhost:8765"
        self.websocket = None
    
    async def connect(self):
        """连接到引擎"""
        print("连接到游戏引擎...")
        self.websocket = await websockets.connect(self.uri)
        await self.websocket.recv()  # 读取初始化响应
        print("连接成功！")
    
    async def send_command(self, command: str, data: dict):
        """发送命令"""
        message = {"type": command, "data": data}
        await self.websocket.send(json.dumps(message))
        # 不等待响应，直接继续
    
    async def run_circle_animation(self):
        """圆形轨迹动画"""
        print("\n开始圆形轨迹动画...")
        print("按 Ctrl+C 停止")
        
        try:
            angle = 0.0
            radius = 2.0
            
            while True:
                # 计算圆形轨迹位置
                x = radius * math.cos(angle)
                z = radius * math.sin(angle)
                y = 0.5 + 0.5 * math.sin(angle * 2)  # 上下弹跳
                
                # 发送位置更新
                await self.send_command("object_position", {
                    "object_name": "Main Cube",
                    "x": x,
                    "y": y,
                    "z": z
                })
                
                # 计算旋转（面向移动方向）
                await self.send_command("object_rotation", {
                    "object_name": "Main Cube",
                    "x": 0.0,
                    "y": angle,
                    "z": 0.0
                })
                
                # 颜色变化
                hue = (angle % (2 * math.pi)) / (2 * math.pi)
                # 简单的HSL到RGB转换（简化版）
                r = int(255 * (0.5 + 0.5 * math.sin(angle)))
                g = int(255 * (0.5 + 0.5 * math.sin(angle + 2 * math.pi / 3)))
                b = int(255 * (0.5 + 0.5 * math.sin(angle + 4 * math.pi / 3)))
                color = f"#{r:02x}{g:02x}{b:02x}"
                
                await self.send_command("material_color", {
                    "object_name": "Main Cube",
                    "color": color
                })
                
                # 增加角度
                angle += 0.05
                
                # 等待下一帧
                await asyncio.sleep(0.033)  # ~30 FPS
                
        except KeyboardInterrupt:
            print("\n动画已停止")
    
    async def close(self):
        """关闭连接"""
        if self.websocket:
            await self.websocket.close()


async def main():
    """主函数"""
    print("=" * 50)
    print("Mini Game Engine - 动画演示")
    print("=" * 50)
    
    demo = AnimationDemo()
    
    try:
        await demo.connect()
        await demo.run_circle_animation()
    except KeyboardInterrupt:
        print("\n用户中断")
    except Exception as e:
        print(f"错误: {e}")
    finally:
        await demo.close()


if __name__ == "__main__":
    asyncio.run(main())
