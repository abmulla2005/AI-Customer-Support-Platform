@echo off
title AI Customer Support Platform - Backend Server
echo ===================================================
echo Starting AI Customer Support Platform Backend...
echo ===================================================
cd /d "%~dp0backend"

if not exist venv (
    echo [1/3] Creating Python virtual environment (venv)...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create venv with python, trying with py...
        py -m venv venv
    )
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
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
