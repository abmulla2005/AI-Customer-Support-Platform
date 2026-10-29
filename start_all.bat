@echo off
title AI Customer Support Platform - System Launcher
echo ===============================================================
echo       AI Customer Support Platform (MCA Major Project)
echo ===============================================================
echo.
echo Launching Backend and Frontend in separate windows...
echo.

start "AI Support - Backend API (FastAPI)" cmd /k "%~dp0start_backend.bat"
start "AI Support - Frontend UI (React + Vite)" cmd /k "%~dp0start_frontend.bat"

echo.
echo ===============================================================
echo Both servers are launching!
echo.
echo  * Frontend Application: http://localhost:5173
echo  * Backend API and Docs: http://localhost:8000/docs
echo.
echo Default Admin credentials (auto-seeded):
echo    Email:    admin@aisupport.com
echo    Password: AdminSecurePassword123!
echo ===============================================================
echo.
