@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Git Upload

cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git 未安装或不在 PATH 中。
    pause
    exit /b 1
)

for /f "delims=" %%i in ('git rev-parse --is-inside-work-tree 2^>nul') do set IN_REPO=%%i
if /i not "!IN_REPO!"=="true" (
    echo [ERROR] 当前目录不是 Git 仓库。
    pause
    exit /b 1
)

for /f "delims=" %%i in ('git config user.name 2^>nul') do set GIT_NAME=%%i
if not defined GIT_NAME (
    echo 请输入 Git user.name:
    set /p GIT_NAME=
    if not defined GIT_NAME (
        echo [ERROR] user.name 不能为空。
        pause
        exit /b 1
    )
    git config user.name "!GIT_NAME!"
)

for /f "delims=" %%i in ('git config user.email 2^>nul') do set GIT_EMAIL=%%i
if not defined GIT_EMAIL (
    echo 请输入 Git user.email:
    set /p GIT_EMAIL=
    if not defined GIT_EMAIL (
        echo [ERROR] user.email 不能为空。
        pause
        exit /b 1
    )
    git config user.email "!GIT_EMAIL!"
)

for /f "delims=" %%i in ('git config --get remote.origin.url 2^>nul') do set ORIGIN_URL=%%i
if not defined ORIGIN_URL (
    echo 请输入远程仓库地址 origin:
    echo 例如:
    echo   https://github.com/your-name/your-repo.git
    echo   git@github.com:your-name/your-repo.git
    set /p ORIGIN_URL=
    if not defined ORIGIN_URL (
        echo [ERROR] origin 不能为空。
        pause
        exit /b 1
    )
    git remote add origin "!ORIGIN_URL!"
)

for /f "delims=" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
if not defined CURRENT_BRANCH (
    set CURRENT_BRANCH=main
    git branch -M !CURRENT_BRANCH!
)

echo.
echo [INFO] 当前身份:
echo   user.name  = !GIT_NAME!
echo   user.email = !GIT_EMAIL!
echo   origin     = !ORIGIN_URL!
echo   branch     = !CURRENT_BRANCH!
echo.

echo [INFO] 当前变更:
git status --short
echo.

choice /M "继续执行 git add / commit / push"
if errorlevel 2 (
    echo 已取消。
    exit /b 0
)

git add -A
if errorlevel 1 (
    echo [ERROR] git add 失败。
    pause
    exit /b 1
)

echo.
echo 请输入提交说明 commit message:
set /p COMMIT_MSG=
if not defined COMMIT_MSG set COMMIT_MSG=update

git diff --cached --quiet
if errorlevel 1 (
    git commit -m "!COMMIT_MSG!"
    if errorlevel 1 (
        echo [ERROR] git commit 失败。
        pause
        exit /b 1
    )
) else (
    echo [INFO] 没有新的已暂存变更，跳过 commit。
)

git push -u origin !CURRENT_BRANCH!
if errorlevel 1 (
    echo [ERROR] git push 失败。
    echo 可能原因:
    echo   1. 远程仓库地址不对
    echo   2. 还没有权限
    echo   3. HTTPS 需要 token，SSH 需要公钥
    pause
    exit /b 1
)

echo.
echo [OK] 上传完成。
pause
