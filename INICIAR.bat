@echo off
title 100 Personas Dijeron
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  No se encontro Node.js. Instalalo desde https://nodejs.org
  echo  o simplemente abre index.html y panel.html con doble clic
  echo  (modo local, dos ventanas en la misma computadora^).
  echo.
  pause
  exit /b
)
start "" http://localhost:8080/
node servidor.js
pause
