@echo off
setlocal
cd /d "%~dp0"
echo Starting backend on http://127.0.0.1:8000
echo Loading .env from this folder if it exists
py -3.12 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
