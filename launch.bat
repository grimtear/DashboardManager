@echo off

REM Start the backend server on port 5005
start "Backend" cmd /k "cd backend && .\venv\Scripts\activate && python app.py --port=5005"

REM Start the frontend server on port 3001 (Node/Vite/React)
start "Frontend" cmd /k "cd frontend && npm run dev -- --port 3001"