@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Git PR Workflow

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
for /f "delims=" %%i in ('git config user.email 2^>nul') do set GIT_EMAIL=%%i
for /f "delims=" %%i in ('git config --get remote.origin.url 2^>nul') do set ORIGIN_URL=%%i
for /f "delims=" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i

if not defined GIT_NAME (
    echo [ERROR] 缺少 git user.name，请先配置。
    pause
    exit /b 1
)

if not defined GIT_EMAIL (
    echo [ERROR] 缺少 git user.email，请先配置。
    pause
    exit /b 1
)

if not defined ORIGIN_URL (
    echo [ERROR] 缺少 remote origin，请先配置。
    pause
    exit /b 1
)

if not defined CURRENT_BRANCH (
    set CURRENT_BRANCH=main
    git branch -M !CURRENT_BRANCH!
)

set BASE_BRANCH=main

if /i "!CURRENT_BRANCH!"=="main" goto choose_branch
if /i "!CURRENT_BRANCH!"=="master" goto choose_branch
goto branch_ready

:choose_branch
echo 当前在主分支 !CURRENT_BRANCH!，建议新建功能分支再提 PR。
echo 请输入新分支名，例如 feat/init-ui:
set /p NEW_BRANCH=
if not defined NEW_BRANCH (
    echo [ERROR] 分支名不能为空。
    pause
    exit /b 1
)

git checkout -b "!NEW_BRANCH!"
if errorlevel 1 (
    echo [ERROR] 创建分支失败。
    pause
    exit /b 1
)
set CURRENT_BRANCH=!NEW_BRANCH!

:branch_ready
echo.
echo [INFO] 当前身份:
echo   user.name  = !GIT_NAME!
echo   user.email = !GIT_EMAIL!
echo   origin     = !ORIGIN_URL!
echo   branch     = !CURRENT_BRANCH!
echo   base       = !BASE_BRANCH!
echo.

echo [INFO] 当前变更:
git status --short
echo.

choice /M "继续执行 git add / commit / push，并生成 PR 链接"
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

git diff --cached --quiet
if errorlevel 1 (
    echo.
    echo 请输入提交说明 commit message:
    set /p COMMIT_MSG=
    if not defined COMMIT_MSG set COMMIT_MSG=update

    git commit -m "!COMMIT_MSG!"
    if errorlevel 1 (
        echo [ERROR] git commit 失败。
        pause
        exit /b 1
    )
) else (
    echo [INFO] 没有新的已暂存变更，跳过 commit。
)

git push -u origin "!CURRENT_BRANCH!"
if errorlevel 1 (
    echo [ERROR] git push 失败。
    pause
    exit /b 1
)

set REPO_PATH=!ORIGIN_URL!
set REPO_PATH=!REPO_PATH:https://github.com/=!
set REPO_PATH=!REPO_PATH:http://github.com/=!
set REPO_PATH=!REPO_PATH:git@github.com:=!
if "!REPO_PATH:~-4!"==".git" set REPO_PATH=!REPO_PATH:~0,-4!

set PR_URL=https://github.com/!REPO_PATH!/compare/!BASE_BRANCH!...!CURRENT_BRANCH!?expand=1

echo.
echo [OK] 分支已推送。
echo PR 创建链接:
echo !PR_URL!
echo.
echo 打开上面的链接即可创建 Pull Request。
pause
