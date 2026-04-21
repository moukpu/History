@echo off
setlocal
cd /d "%~dp0"
start "Sapar Quest Backend" cmd /c "start_backend.bat"
start "Sapar Quest Frontend" cmd /c "start_frontend.bat"
echo Backend: http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:3000
