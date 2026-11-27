@echo off
title PARXSTREAM Ultra Streaming Server
echo =======================================================
echo          PARXSTREAM Ultra Streaming Server
echo =======================================================
echo.
echo Freeing port 8080 if previously used...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo.
echo Checking Python environment...
python -m pip install -r requirements.txt
echo.
echo Starting PARXSTREAM Stream Server at http://localhost:8080
echo Launching your browser...
start http://localhost:8080
echo.
set PORT=8080
python server.py
pause
