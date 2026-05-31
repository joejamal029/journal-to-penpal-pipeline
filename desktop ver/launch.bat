@echo off
title Journal-to-Penpal Pipeline Launcher
echo ===================================================
echo   Starting Journal-to-Penpal Pipeline Dev Server...
echo ===================================================
echo.
npm run tauri dev
if %errorlevel% neq 0 (
    echo.
    echo Launch failed with error code %errorlevel%.
    pause
)
