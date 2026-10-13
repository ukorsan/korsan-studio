@echo off
title KORSAN Video Editor
cd /d "%~dp0"
if exist "dist\KorsanStudio-1.0.0-beta.1.exe" (
  start "" "dist\KorsanVideoEditor-0.6.0-alpha.exe"
  exit /b 0
)
netstat -ano | findstr ":4196" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "KORSAN Video Editor Source" /min cmd /k "node server.js"
  timeout /t 2 /nobreak >nul
)
start "" "http://127.0.0.1:4189/"
exit
