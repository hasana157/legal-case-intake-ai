@echo off
REM Case Intake Application Startup Script for Windows

echo ================================
echo Legal Case Intake Form Application
echo ================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo X Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

echo Python found: 
python --version
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt --quiet

REM Check if .env file exists
if not exist ".env" (
    echo.
    echo WARNING: .env file not found!
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo Please edit .env and add your GROQ_API_KEY
    echo.
    pause
)

REM Check if GROQ_API_KEY is set
findstr /R "GROQ_API_KEY=.*" .env >nul
if errorlevel 1 (
    echo.
    echo WARNING: GROQ_API_KEY is not set in .env file
    echo Please add your Groq API key to .env file before running the application
    echo Get your key from: https://console.groq.com/
    pause
    exit /b 1
)

echo.
echo All checks passed!
echo Starting application...
echo.
echo The app will open at: http://localhost:8501
echo Press Ctrl+C to stop the server
echo.

streamlit run app.py

pause
