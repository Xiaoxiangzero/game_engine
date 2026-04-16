@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ========================================
REM Mini Game Engine - 启动脚本
REM 更健壮的版本
REM ========================================

title Mini Game Engine

echo.
echo ========================================
echo   Mini Game Engine
echo   Unity风格轻量化游戏引擎
echo ========================================
echo.

REM ========================================
REM 检查环境
REM ========================================
echo [检查环境]
echo.

REM 检查Python
where py >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python
    echo.
    echo 请安装Python 3.8+ 并添加到PATH
    echo 下载地址: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('py --version 2^>^&1') do set PYTHON_VER=%%i
echo [OK] Python: !PYTHON_VER!

REM 检查Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Node.js
    echo.
    echo 请安装Node.js 18+ 并添加到PATH
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js: !NODE_VER!

for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo [OK] npm: !NPM_VER!

echo.

REM ========================================
REM 检查依赖是否已安装
REM ========================================
echo [检查依赖]
echo.

set PROJECT_ROOT=%~dp0
set VENV_PYTHON=%PROJECT_ROOT%server\venv\Scripts\python.exe
set VENV_PIP=%PROJECT_ROOT%server\venv\Scripts\pip.exe
set CLIENT_NODE_MODULES=%PROJECT_ROOT%client\node_modules

set NEED_INSTALL=0

REM 检查Python虚拟环境
if exist "!VENV_PYTHON!" (
    echo [OK] Python虚拟环境已存在
    
    REM 检查关键包
    "!VENV_PYTHON!" -c "import websockets, numpy, json5" >nul 2>&1
    if errorlevel 1 (
        echo [警告] Python依赖不完整
        set NEED_INSTALL=1
    ) else (
        echo [OK] Python依赖已安装
    )
) else (
    echo [需要] Python虚拟环境不存在
    set NEED_INSTALL=1
)

REM 检查前端依赖
if exist "!CLIENT_NODE_MODULES!\three" (
    echo [OK] 前端依赖已安装
) else (
    echo [需要] 前端依赖未安装
    set NEED_INSTALL=1
)

echo.

REM ========================================
REM 如果需要安装，先安装依赖
REM ========================================
if "!NEED_INSTALL!"=="1" (
    echo ========================================
    echo   安装依赖
    echo ========================================
    echo.
    
    REM 选择镜像源
    echo 请选择镜像源（输入数字后回车）:
    echo   1. 国内镜像源（阿里云 - 推荐，下载快）
    echo   2. 官方源（pypi.org / npmjs.org）
    echo.
    
    set MIRROR_CHOICE=1
    set /p MIRROR_CHOICE="请选择 [1/2，默认1]: "
    
    if "!MIRROR_CHOICE!"=="2" (
        set PIP_MIRROR=
        set NPM_MIRROR=
        echo.
        echo [信息] 使用官方源
    ) else (
        set PIP_MIRROR=-i https://mirrors.aliyun.com/pypi/simple/
        set NPM_MIRROR=--registry https://registry.npmmirror.com
        echo.
        echo [信息] 使用国内镜像源（阿里云）
    )
    
    echo.
    
    REM 安装Python依赖
    if not exist "!VENV_PYTHON!" (
        echo [1/2] 创建Python虚拟环境...
        py -m venv "%PROJECT_ROOT%server\venv"
        if errorlevel 1 (
            echo [错误] 虚拟环境创建失败
            pause
            exit /b 1
        )
        echo [OK] 虚拟环境创建成功
    )
    
    echo.
    echo [1/2] 安装Python依赖...
    echo       这可能需要几分钟...
    echo.
    
    "!VENV_PYTHON!" -m pip install --upgrade pip !PIP_MIRROR! -q
    "!VENV_PYTHON!" -m pip install websockets numpy json5 !PIP_MIRROR!
    
    if errorlevel 1 (
        echo.
        echo [警告] Python依赖安装可能有问题
        echo        请检查网络连接
        echo.
        pause
    ) else (
        echo.
        echo [OK] Python依赖安装完成
    )
    
    echo.
    
    REM 安装前端依赖
    echo [2/2] 安装前端依赖...
    echo       这可能需要几分钟...
    echo.
    
    cd "%PROJECT_ROOT%client"
    npm install !NPM_MIRROR!
    
    if errorlevel 1 (
        echo.
        echo [警告] 前端依赖安装可能有问题
        echo        请检查网络连接或尝试: npm cache clean --force
        echo.
        pause
    ) else (
        echo.
        echo [OK] 前端依赖安装完成
    )
    
    echo.
    echo ========================================
    echo   依赖安装完成！
    echo ========================================
    echo.
)

REM ========================================
REM 启动模式选择
REM ========================================
echo ========================================
echo   选择启动模式
echo ========================================
echo.
echo   1. 完整模式（推荐）
echo      - Python后端 + 前端
echo      - 支持Python API控制
echo.
echo   2. 仅前端模式
echo      - 独立运行3D界面
echo      - 不依赖Python
echo.
echo   3. 仅后端模式
echo      - 启动Python API服务器
echo      - 可用于脚本测试
echo.

set START_CHOICE=1
set /p START_CHOICE="请选择 [1/2/3，默认1]: "

echo.

if "!START_CHOICE!"=="2" (
    REM 仅前端模式
    echo ========================================
    echo   启动仅前端模式
    echo ========================================
    echo.
    echo 访问地址: http://localhost:3000
    echo 按 Ctrl+C 停止
    echo.
    
    cd "%PROJECT_ROOT%client"
    npm run dev
    
) else if "!START_CHOICE!"=="3" (
    REM 仅后端模式
    echo ========================================
    echo   启动仅后端模式
    echo ========================================
    echo.
    echo WebSocket地址: ws://localhost:8765
    echo 按 Ctrl+C 停止
    echo.
    
    cd "%PROJECT_ROOT%server"
    "!VENV_PYTHON!" main.py
    
) else (
    REM 完整模式
    echo ========================================
    echo   启动完整模式
    echo ========================================
    echo.
    
    REM 启动Python后端（新窗口）
    echo [信息] 启动Python后端服务器...
    echo        WebSocket: ws://localhost:8765
    echo.
    
    start "Mini Game Engine - Python Server" cmd /k ^"cd /d "%PROJECT_ROOT%server" ^&^& "%VENV_PYTHON%" main.py^"
    
    REM 等待后端启动
    echo [信息] 等待后端启动...
    timeout /t 2 /nobreak >nul
    
    echo.
    echo [信息] 启动前端开发服务器...
    echo        访问地址: http://localhost:3000
    echo        按 Ctrl+C 停止
    echo.
    
    cd "%PROJECT_ROOT%client"
    npm run dev
)

endlocal
