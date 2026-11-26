@echo off
title PARXSTREAM Ultra Streaming Server
echo =======================================================
echo          PARXSTREAM Ultra Streaming Server
echo =======================================================
echo Checking Python environment...
python -m pip install -r requirements.txt
echo.
echo Starting PARXSTREAM Stream Server at http://localhost:8080
echo.
set PORT=8080
python server.py
pause
