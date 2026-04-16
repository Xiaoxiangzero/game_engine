#!/usr/bin/env python3
"""
Mini Game Engine - 自动安装脚本
自动安装依赖并监控下载过程
"""

import subprocess
import sys
import os
import time
import re
from pathlib import Path

class AutoInstaller:
    """自动安装器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.server_dir = self.project_root / "server"
        self.client_dir = self.project_root / "client"
        self.venv_dir = self.server_dir / "venv"
        self.errors = []
        self.warnings = []
        
        # 国内镜像源
        self.pypi_mirrors = [
            "https://mirrors.aliyun.com/pypi/simple/",
            "https://pypi.tuna.tsinghua.edu.cn/simple/",
            "https://pypi.doubanio.com/simple/",
            "https://pypi.mirrors.ustc.edu.cn/simple/",
            "https://pypi.org/simple/"
        ]
        
        self.npm_mirrors = [
            "https://registry.npmmirror.com",
            "https://registry.npm.taobao.org",
            "https://registry.npmjs.org"
        ]
    
    def log(self, message, level="INFO"):
        """日志输出"""
        timestamp = time.strftime("%H:%M:%S")
        prefix = {
            "INFO": "[INFO]",
            "SUCCESS": "[✓]",
            "WARNING": "[⚠]",
            "ERROR": "[✗]",
            "STEP": "\n[步骤]"
        }.get(level, "[INFO]")
        
        print(f"{timestamp} {prefix} {message}")
        sys.stdout.flush()
    
    def run_command(self, cmd, cwd=None, timeout=300):
        """运行命令并监控输出"""
        self.log(f"执行命令: {' '.join(cmd) if isinstance(cmd, list) else cmd}", "INFO")
        
        try:
            process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                shell=os.name == 'nt'
            )
            
            output_lines = []
            error_keywords = [
                "error", "Error", "ERROR",
                "fail", "Fail", "FAIL",
                "timeout", "Timeout",
                "connection", "Connection",
                "network", "Network",
                "拒绝", "失败", "无法连接",
                "OSError", "Exception", "Traceback"
            ]
            
            warning_keywords = [
                "warning", "Warning", "WARNING",
                "deprecated", "Deprecated"
            ]
            
            start_time = time.time()
            
            while True:
                line = process.stdout.readline()
                if not line and process.poll() is not None:
                    break
                
                if line:
                    line = line.strip()
                    if line:
                        output_lines.append(line)
                        print(f"  {line}")
                        sys.stdout.flush()
                        
                        # 检查错误关键字
                        for kw in error_keywords:
                            if kw in line:
                                self.errors.append(line)
                                self.log(f"检测到错误: {line}", "ERROR")
                        
                        # 检查警告关键字
                        for kw in warning_keywords:
                            if kw in line and "error" not in line.lower():
                                self.warnings.append(line)
            
            # 检查超时
            elapsed = time.time() - start_time
            if elapsed > timeout:
                process.kill()
                self.log(f"命令执行超时 ({timeout}秒)", "ERROR")
                return False, output_lines
            
            return_code = process.wait()
            return return_code == 0, output_lines
            
        except subprocess.TimeoutExpired:
            self.log("命令执行超时", "ERROR")
            return False, []
        except Exception as e:
            self.log(f"执行命令时发生异常: {e}", "ERROR")
            return False, []
    
    def check_venv_exists(self):
        """检查虚拟环境是否存在"""
        python_exe = self.venv_dir / "Scripts" / "python.exe"
        return python_exe.exists()
    
    def create_venv(self):
        """创建虚拟环境"""
        self.log("检查Python虚拟环境...", "STEP")
        
        if self.check_venv_exists():
            self.log("虚拟环境已存在", "SUCCESS")
            return True
        
        self.log("正在创建虚拟环境...", "INFO")
        
        cmd = [sys.executable, "-m", "venv", str(self.venv_dir)]
        success, output = self.run_command(cmd)
        
        if success and self.check_venv_exists():
            self.log("虚拟环境创建成功", "SUCCESS")
            return True
        else:
            self.log("虚拟环境创建失败", "ERROR")
            return False
    
    def get_venv_python(self):
        """获取虚拟环境中的Python可执行文件"""
        return str(self.venv_dir / "Scripts" / "python.exe")
    
    def get_venv_pip(self):
        """获取虚拟环境中的pip可执行文件"""
        return str(self.venv_dir / "Scripts" / "pip.exe")
    
    def test_pypi_mirror(self, mirror_url):
        """测试PyPI镜像源是否可用"""
        self.log(f"测试镜像源: {mirror_url}", "INFO")
        
        python_exe = self.get_venv_python()
        cmd = [python_exe, "-m", "pip", "install", "--dry-run", "pip", "-i", mirror_url]
        
        try:
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            # 检查输出是否有连接错误
            if "error" not in process.stderr.lower() and "connection" not in process.stderr.lower():
                return True
        except:
            pass
        
        return False
    
    def install_python_deps(self):
        """安装Python依赖"""
        self.log("安装Python依赖...", "STEP")
        
        if not self.check_venv_exists():
            self.log("虚拟环境不存在，先创建...", "WARNING")
            if not self.create_venv():
                return False
        
        python_exe = self.get_venv_python()
        
        # 先升级pip
        self.log("升级pip...", "INFO")
        for mirror in self.pypi_mirrors:
            cmd = [python_exe, "-m", "pip", "install", "--upgrade", "pip", "-i", mirror]
            success, output = self.run_command(cmd)
            if success:
                self.log(f"pip升级成功 (使用镜像: {mirror})", "SUCCESS")
                break
            else:
                self.log(f"镜像 {mirror} 失败，尝试下一个...", "WARNING")
        
        # 安装项目依赖
        requirements = ["websockets", "json5", "numpy"]
        
        for mirror in self.pypi_mirrors:
            self.log(f"尝试使用镜像源: {mirror}", "INFO")
            
            all_success = True
            for pkg in requirements:
                self.log(f"安装 {pkg}...", "INFO")
                cmd = [python_exe, "-m", "pip", "install", pkg, "-i", mirror]
                success, output = self.run_command(cmd)
                if not success:
                    all_success = False
                    break
            
            if all_success:
                self.log(f"所有Python依赖安装成功 (使用镜像: {mirror})", "SUCCESS")
                return True
            else:
                self.log(f"镜像 {mirror} 安装失败，尝试下一个...", "WARNING")
        
        self.log("所有镜像源都尝试过，安装失败", "ERROR")
        return False
    
    def test_npm_mirror(self, mirror_url):
        """测试npm镜像源"""
        try:
            cmd = ["npm", "ping", "--registry", mirror_url]
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            return process.returncode == 0
        except:
            return False
    
    def install_npm_deps(self):
        """安装前端npm依赖"""
        self.log("安装前端npm依赖...", "STEP")
        
        # 检查node_modules是否已存在
        node_modules = self.client_dir / "node_modules"
        if node_modules.exists():
            self.log("node_modules已存在，检查依赖是否完整...", "INFO")
            
            # 检查主要依赖
            check_cmd = ["npm", "list", "three", "--depth=0"]
            success, output = self.run_command(check_cmd, cwd=str(self.client_dir))
            if success and "missing" not in str(output).lower():
                self.log("npm依赖已安装", "SUCCESS")
                return True
        
        # 尝试不同的镜像源
        for mirror in self.npm_mirrors:
            self.log(f"尝试使用npm镜像: {mirror}", "INFO")
            
            # 设置镜像并安装
            cmd = ["npm", "install", "--registry", mirror]
            success, output = self.run_command(cmd, cwd=str(self.client_dir), timeout=600)
            
            if success:
                self.log(f"npm依赖安装成功 (使用镜像: {mirror})", "SUCCESS")
                return True
            else:
                self.log(f"镜像 {mirror} 安装失败，尝试下一个...", "WARNING")
        
        self.log("npm依赖安装失败", "ERROR")
        return False
    
    def verify_installation(self):
        """验证安装结果"""
        self.log("验证安装结果...", "STEP")
        
        all_ok = True
        
        # 验证Python虚拟环境
        self.log("检查Python虚拟环境...", "INFO")
        python_exe = self.get_venv_python()
        if os.path.exists(python_exe):
            self.log("✓ Python虚拟环境存在", "SUCCESS")
            
            # 检查已安装的包
            cmd = [python_exe, "-m", "pip", "list"]
            success, output = self.run_command(cmd)
            
            required_pkgs = ["websockets", "numpy", "json5"]
            for pkg in required_pkgs:
                found = any(pkg.lower() in line.lower() for line in output)
                if found:
                    self.log(f"  ✓ {pkg} 已安装", "SUCCESS")
                else:
                    self.log(f"  ✗ {pkg} 未安装", "ERROR")
                    all_ok = False
        else:
            self.log("✗ Python虚拟环境不存在", "ERROR")
            all_ok = False
        
        # 验证npm依赖
        self.log("检查npm依赖...", "INFO")
        node_modules = self.client_dir / "node_modules"
        if node_modules.exists():
            self.log("✓ node_modules存在", "SUCCESS")
            
            # 检查主要包
            required_npm = ["three", "vite", "ws"]
            for pkg in required_npm:
                pkg_path = node_modules / pkg
                if pkg_path.exists():
                    self.log(f"  ✓ {pkg} 已安装", "SUCCESS")
                else:
                    self.log(f"  ✗ {pkg} 未安装", "ERROR")
                    all_ok = False
        else:
            self.log("✗ node_modules不存在", "ERROR")
            all_ok = False
        
        return all_ok
    
    def run(self):
        """运行完整安装流程"""
        print("=" * 60)
        print("  Mini Game Engine - 自动安装脚本")
        print("=" * 60)
        print(f"\n项目目录: {self.project_root}")
        print(f"开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # 步骤1: 创建虚拟环境
        if not self.create_venv():
            self.log("虚拟环境创建失败，无法继续", "ERROR")
            return False
        
        # 步骤2: 安装Python依赖
        if not self.install_python_deps():
            self.log("Python依赖安装失败", "WARNING")
        
        # 步骤3: 安装npm依赖
        if not self.install_npm_deps():
            self.log("npm依赖安装失败", "WARNING")
        
        # 步骤4: 验证安装
        success = self.verify_installation()
        
        # 总结
        print("\n" + "=" * 60)
        print("  安装总结")
        print("=" * 60)
        
        if success:
            print("\n✓ 所有依赖安装成功！")
            print("\n下一步操作:")
            print("  1. 双击 start.bat 启动引擎")
            print("  2. 或手动运行:")
            print("     - Python后端: server/venv/Scripts/python.exe server/main.py")
            print("     - 前端: cd client && npm run dev")
        else:
            print("\n✗ 部分依赖安装失败")
            print("\n请检查:")
            print("  1. 网络连接")
            print("  2. 防火墙设置")
            print("  3. 尝试使用VPN或代理")
            
            if self.errors:
                print("\n错误信息:")
                for err in self.errors[:5]:
                    print(f"  - {err}")
        
        print(f"\n结束时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        return success


if __name__ == "__main__":
    installer = AutoInstaller()
    success = installer.run()
    sys.exit(0 if success else 1)
