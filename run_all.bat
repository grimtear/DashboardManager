@echo off
REM Start backend server
start cmd /k "node server.js"

REM Give the server a moment to start
timeout /t 2 /nobreak >nul

REM Open the dashboard on the LAN address
start "" http://192.168.1.194:3000/
