@echo off
setlocal enabledelayedexpansion

REM TestSheet Development Server Launcher
REM This script starts both Express API and Vite client servers

echo ========================================
echo TestSheet Development Environment
echo ========================================

REM Get the directory where this batch file is located and go there
cd /d "%~dp0"
echo Current directory: %CD%

REM Install dependencies if needed
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

REM Do not kill any existing node processes globally
REM This avoids closing other programs that use Node.js

REM Set environment variables
set NODE_ENV=development
set SESSION_SECRET=local-dev-secret-key-change-in-production
set HOST=0.0.0.0
set PORT=5002

echo.
echo ========================================
echo Starting Development Servers
echo ========================================
echo.
echo [1] Express API Server - Port 5002
echo [2] Vite Dev Server   - Port 5173
echo.
echo Access your app at:
echo   Global:  http://192.168.1.194:5173
echo   Network: http://192.168.1.194:5173
echo.
echo Each server will open in a separate window
echo ========================================
echo.

REM Start Express API Server in a new window
echo Starting Express API Server...
start "NAE TestSheet - Express API (Port 5002)" cmd /k "cd /d %CD% && npx tsx server/index.ts"

REM Wait a moment for the server to start
timeout /t 3 /nobreak >nul

REM Start Vite Client in a new window
echo Starting Vite Client Server...
start "NAE TestSheet - Vite Client (Port 5173)" cmd /k "cd /d %CD% && npm run dev:client"

echo.
echo ========================================
echo Both servers are starting...
echo ========================================
echo.
echo Close the server windows to stop them
echo.
pause
