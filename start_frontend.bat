@echo off
title AI Customer Support Platform - Frontend Dev Server
echo ===================================================
echo Starting AI Customer Support Platform Frontend...
echo ===================================================
cd /d "%~dp0frontend"

:: Detect npm executable
set "NPM_CMD=npm"
if exist "E:\Installation\NodeJs\npm.cmd" (
    set "NPM_CMD=E:\Installation\NodeJs\npm.cmd"
    set "PATH=E:\Installation\NodeJs;%PATH%"
)

if not exist node_modules (
    echo [1/2] Installing frontend npm packages (first time setup)...
    call "%NPM_CMD%" --cache "%~dp0.npm-cache" install
)

echo.
echo ===================================================
echo [2/2] Frontend dev server running at: http://localhost:5173
echo ===================================================
echo.
call "%NPM_CMD%" run dev
pause
