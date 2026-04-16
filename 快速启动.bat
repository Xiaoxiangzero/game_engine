@echo off
chcp 65001 >nul

REM ========================================
REM Mini Game Engine - 快速启动脚本
REM 直接启动，跳过已安装的依赖检查
REM ========================================

title Mini Game Engine

echo.
echo ========================================
echo   Mini Game Engine - 快速启动
echo ========================================
echo.

set PROJECT_ROOT=%~dp0
set VENV_PYTHON=%PROJECT_ROOT%server\venv\Scripts\python.exe

REM ========================================
REM 检查是否已安装
REM ========================================
echo [检查环境]
echo.

set READY=1

if not exist "%VENV_PYTHON%" (
    echo [错误] Python虚拟环境不存在
    echo        请先运行 install_only.bat 安装依赖
    set READY=0
)

if not exist "%PROJECT_ROOT%client\node_modules\three" (
    echo [错误] 前端依赖不存在
    echo        请先运行 install_only.bat 安装依赖
    set READY=0
)

if "%READY%"=="0" (
    echo.
    pause
    exit /b 1
)

echo [OK] 所有依赖已就绪
echo.

REM ========================================
REM 启动模式选择
REM ========================================
echo 选择启动模式:
echo.
echo   1. 完整模式（推荐）
echo      Python后端 + 前端界面
echo.
echo   2. 仅前端模式
echo      独立3D界面
echo.
echo   3. 仅后端模式
echo      Python API服务
echo.

set CHOICE=1
set /p CHOICE="请选择 [1/2/3，默认1]: "

echo.

if "%CHOICE%"=="2" (
    REM 仅前端
    echo [启动] 仅前端模式
    echo        访问: http://localhost:3000
    echo.
    cd "%PROJECT_ROOT%client"
    npm run dev
    
) else if "%CHOICE%"=="3" (
    REM 仅后端
    echo [启动] 仅后端模式
    echo        WebSocket: ws://localhost:8765
    echo.
    cd "%PROJECT_ROOT%server"
    "%VENV_PYTHON%" main.py
    
) else (
    REM 完整模式
    echo [启动] 完整模式
    echo.
    echo        Python后端: ws://localhost:8765
    echo        前端界面: http://localhost:3000
    echo.
    
    REM 启动后端
    start "Python Server" cmd /k ^"cd /d "%PROJECT_ROOT%server" ^&^& "%VENV_PYTHON%" main.py^"
    
    echo [等待] 后端启动中...
    timeout /t 2 /nobreak >nul
    
    echo.
    echo [启动] 前端开发服务器
    echo        按 Ctrl+C 停止
    echo.
    
    cd "%PROJECT_ROOT%client"
    npm run dev
)
