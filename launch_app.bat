@echo off
setlocal
cd /d %~dp0
echo =============================
echo Launching backend and frontend
echo =============================

where python >nul 2>&1
if errorlevel 1 (
  echo Python not found. Install Python and add it to PATH.
  goto end
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm not found. Install Node.js and add npm to PATH.
  goto end
)

echo Starting Flask backend on http://localhost:8080
start "Flask Backend" powershell -NoExit -Command "cd /d '%~dp0'; if (Test-Path 'requirements.txt') { python -m pip install -r requirements.txt }; python app.py"

echo Starting React frontend (Vite dev server)
if exist "%~dp0frontend" (
  start "React Frontend" powershell -NoExit -Command "cd /d '%~dp0frontend'; if (Test-Path 'package-lock.json' -or Test-Path 'pnpm-lock.yaml' -or Test-Path 'yarn.lock') { npm ci } else { npm install }; npm run dev -- --host"
) else (
  echo Frontend directory not found: %~dp0frontend
)

echo =============================
echo Backend: http://localhost:8080
echo Frontend: http://localhost:5170
echo =============================

:end
pause
