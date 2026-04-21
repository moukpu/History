@echo off
setlocal
cd /d "%~dp0"
echo Starting frontend on http://127.0.0.1:3000
npm.cmd run dev
