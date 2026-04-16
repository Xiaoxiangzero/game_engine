@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ========================================
REM Mini Game Engine - 仅安装依赖脚本
REM ========================================

title Mini Game Engine - 安装依赖

echo.
echo ========================================
echo   Mini Game Engine
echo   依赖安装程序
echo ========================================
echo.

REM ========================================
REM 检查环境
REM ========================================
echo [检查环境]
echo.

where py >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python
    echo 请安装Python 3.8+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('py --version 2^>^&1') do echo [OK] Python: %%i

where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Node.js
    echo 请安装Node.js 18+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js: %%i
for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm: %%i

echo.

REM ========================================
REM 选择镜像源
REM ========================================
echo [镜像源选择]
echo.
echo   1. 国内镜像源（阿里云 - 推荐）
echo   2. 官方源
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
    echo [信息] 使用国内镜像源
)

echo.

REM ========================================
REM 安装Python依赖
REM ========================================
echo ========================================
echo   安装Python依赖
echo ========================================
echo.

set PROJECT_ROOT=%~dp0
set VENV_DIR=%PROJECT_ROOT%server\venv
set VENV_PYTHON=%VENV_DIR%\Scripts\python.exe

if not exist "!VENV_PYTHON!" (
    echo [信息] 创建虚拟环境...
    py -m venv "!VENV_DIR!"
    if errorlevel 1 (
        echo [错误] 虚拟环境创建失败
        pause
        exit /b 1
    )
    echo [OK] 虚拟环境创建成功
    echo.
) else (
    echo [OK] 虚拟环境已存在
    echo.
)

echo [信息] 升级pip...
"!VENV_PYTHON!" -m pip install --upgrade pip !PIP_MIRROR! -q

echo.
echo [信息] 安装依赖包: websockets, numpy, json5
echo       这可能需要几分钟...
echo.

"!VENV_PYTHON!" -m pip install websockets numpy json5 !PIP_MIRROR!

if errorlevel 1 (
    echo.
    echo [错误] Python依赖安装失败
    echo.
    echo 可能的解决方案:
    echo   1. 检查网络连接
    echo   2. 尝试使用VPN
    echo   3. 手动运行: pip install websockets numpy json5
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Python依赖安装完成
echo.

REM ========================================
REM 验证Python依赖
REM ========================================
echo [验证Python依赖]
"!VENV_PYTHON!" -c "import websockets; print('  - websockets OK')" 2>nul
if errorlevel 1 (
    echo   - websockets [失败]
    set HAS_ERROR=1
)

"!VENV_PYTHON!" -c "import numpy; print('  - numpy OK')" 2>nul
if errorlevel 1 (
    echo   - numpy [失败]
    set HAS_ERROR=1
)

"!VENV_PYTHON!" -c "import json5; print('  - json5 OK')" 2>nul
if errorlevel 1 (
    echo   - json5 [失败]
    set HAS_ERROR=1
)

if "!HAS_ERROR!"=="1" (
    echo.
    echo [错误] 部分依赖验证失败
    pause
    exit /b 1
)

echo.
echo [OK] Python依赖验证通过
echo.

REM ========================================
REM 安装前端依赖
REM ========================================
echo ========================================
echo   安装前端依赖
echo ========================================
echo.

set CLIENT_DIR=%PROJECT_ROOT%client

cd "!CLIENT_DIR!"

echo [信息] 安装npm依赖
echo       这可能需要几分钟...
echo.

npm install !NPM_MIRROR!

if errorlevel 1 (
    echo.
    echo [错误] 前端依赖安装失败
    echo.
    echo 可能的解决方案:
    echo   1. 检查网络连接
    echo   2. 清理缓存: npm cache clean --force
    echo   3. 使用淘宝镜像: npm config set registry https://registry.npmmirror.com
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] 前端依赖安装完成
echo.

REM ========================================
REM 验证前端依赖
REM ========================================
echo [验证前端依赖]

if exist "!CLIENT_DIR!\node_modules\three" (
    echo   - three [OK]
) else (
    echo   - three [失败]
    set HAS_ERROR=1
)

if exist "!CLIENT_DIR!\node_modules\vite" (
    echo   - vite [OK]
) else (
    echo   - vite [失败]
    set HAS_ERROR=1
)

if exist "!CLIENT_DIR!\node_modules\ws" (
    echo   - ws [OK]
) else (
    echo   - ws [失败]
    set HAS_ERROR=1
)

echo.

if "!HAS_ERROR!"=="1" (
    echo [错误] 部分前端依赖验证失败
    pause
    exit /b 1
)

echo ========================================
echo   所有依赖安装成功！
echo ========================================
echo.
echo 安装位置:
echo   Python虚拟环境: !VENV_DIR!
echo   前端依赖: !CLIENT_DIR!\node_modules
echo.
echo 下一步操作:
echo   运行 start.bat 启动游戏引擎
echo.
pause

endlocal
