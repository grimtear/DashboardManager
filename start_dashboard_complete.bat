@echo off
setlocal enabledelayedexpansion

:: Set window title
title DataTrackerPro Dashboard

:: Set paths
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%DataTrackerPro"
set "FRONTEND_DIR=%ROOT_DIR%DataTrackerPro\client"

echo.
echo ===================================
echo  🚀 DataTrackerPro - Full Stack
echo ===================================
echo.

:: Check Python installation
where python >nul 2>nul
if errorlevel 1 (
    echo ❌ Python not found in PATH
    echo Please install Python and add it to PATH
    pause
    exit /b 1
)

:: Check Node.js installation
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js not found in PATH
    echo Please install Node.js and add it to PATH
    pause
    exit /b 1
)

:: Install backend dependencies if needed
echo 🐍 Checking backend dependencies...
cd /d "%BACKEND_DIR%"
if exist "requirements.txt" (
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo ⚠️ Some backend dependencies failed to install
        timeout /t 2 >nul
    )
)

echo.
echo ================================================
echo 🚀 Starting Backend Services...
echo ================================================
echo.

:: [1] Start Main Backend Server (FastAPI)
echo [1/5] 🐍 Starting Main Backend Server (FastAPI)...
start "Backend Server" /D "%BACKEND_DIR%" cmd /c "set PYTHONPATH=%BACKEND_DIR% && python -m uvicorn server.upload_server:app --host 192.168.1.194 --port 8087 --reload"
timeout /t 3 >nul

:: [2] Start File Monitor Service
echo [2/5] 👁️  Starting File Monitor Service...
start "File Monitor" /D "%BACKEND_DIR%" cmd /c "set PYTHONPATH=%BACKEND_DIR% && python server/file_monitor.py"
timeout /t 2 >nul

:: [3] Start Google Sheets Watcher
echo [3/5] 📊 Starting Google Sheets Watcher...
start "Google Sheets Watcher" /D "%BACKEND_DIR%" cmd /c "set PYTHONPATH=%BACKEND_DIR% && python server/google_sheets_watcher.py"
timeout /t 2 >nul

:: [4] Start Backend Scheduler
echo [4/5] ⏰ Starting Backend Scheduler...
start "Backend Scheduler" /D "%BACKEND_DIR%" cmd /c "set PYTHONPATH=%BACKEND_DIR% && python backend_scheduler.py"
timeout /t 2 >nul

:: [5] Start Frontend Development Server
echo [5/5] ⚛️  Starting Frontend (React Vite)...
start "Frontend Server" /D "%FRONTEND_DIR%" cmd /c "npm run dev -- --port 4177"

:: Wait for services to initialize
echo.
echo 🔄 Waiting for all services to initialize...
timeout /t 5 >nul

:: Display service URLs
echo.
echo ===================================
echo  ✨ All Services Started!
echo  - Frontend: http://192.168.1.194:4177
echo  - Backend API: http://192.168.1.194:8087
echo  - API Docs: http://192.168.1.194:8087/docs
echo ===================================
echo.

:: Open frontend in default browser
timeout /t 2 >nul
start "" "http://192.168.1.194:4177"

echo.
echo 📝 Press Ctrl+C to stop all services...
echo.

:: Keep the window open
pause >nul

:: Cleanup on exit
echo.
echo 🔄 Stopping all services...
taskkill /F /FI "WINDOWTITLE eq Backend Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq File Monitor*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Google Sheets Watcher*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend Scheduler*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" >nul 2>&1

exit /b 0
