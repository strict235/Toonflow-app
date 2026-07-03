@echo off
chcp 65001 >nul
title Toonflow - dev:gui

REM 切换到本脚本所在目录（项目根目录）
cd /d "%~dp0"

REM 双击启动时 Explorer 可能未加载终端里的 PATH，补充常见 Node/Yarn 路径
where yarn >nul 2>&1
if errorlevel 1 (
  set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
)

echo ========================================
echo   Toonflow 开发模式启动中...
echo   命令: yarn dev:gui
echo   目录: %CD%
echo ========================================
echo.
echo 关闭本窗口将停止开发服务。
echo.

yarn dev:gui

echo.
if errorlevel 1 (
  echo [错误] 启动失败，请检查是否已安装 Node/Yarn 并执行过 yarn install。
  pause
) else (
  echo Toonflow 已退出。
  timeout /t 3 >nul
)
