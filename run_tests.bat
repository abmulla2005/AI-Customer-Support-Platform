@echo off
title AI Customer Support Platform - Test Suite
echo ===================================================
echo Running Automated Backend Tests...
echo ===================================================
cd /d "%~dp0backend"

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

pytest -v
pause
