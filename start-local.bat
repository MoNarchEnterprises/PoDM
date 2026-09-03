@echo off
title PoDM Local Development Server
cd /d "%~dp0"

echo ==========================================
echo Starting PoDM Backend Server...
echo ==========================================
cd PoDM_project
start "PoDM_Backend" cmd /k "npm run dev:server"

echo.
echo Starting PoDM Frontend (Vite)...
echo ==========================================
cd ..\podm-frontend
start "PoDM_Frontend" cmd /k "npm run dev"

echo.
echo PoDM servers started!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo To stop: Close the terminal windows or press Ctrl+C in each.