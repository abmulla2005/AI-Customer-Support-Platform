@echo off
title AI Customer Support Platform - Backend Server
echo ===================================================
echo Starting AI Customer Support Platform Backend...
echo ===================================================
cd /d "%~dp0backend"

:: Detect Python executable
set "PYTHON_EXE=python"
if exist "E:\Installation\Python\python.exe" (
    set "PYTHON_EXE=E:\Installation\Python\python.exe"
)

:: Create virtual environment if not present
if not exist "venv\Scripts\activate.bat" (
    echo [1/3] Creating Python virtual environment (venv)...
    "%PYTHON_EXE%" -m venv venv
)

echo [2/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/3] Verifying and installing dependencies...
pip install --no-warn-script-location -r requirements.txt

echo.
echo ===================================================
echo Backend API running at: http://localhost:8000
echo Interactive Swagger Docs: http://localhost:8000/docs
echo ===================================================
echo.
python run_server.py
pause
