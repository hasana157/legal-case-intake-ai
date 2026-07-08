@echo off
REM Quick Start Script for Case Intake App with RAG Grounding (Windows)

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Legal Case Intake Form - RAG Grounded Version         ║
echo ║        Kanoon Ka Database (with Hallucination Prevention)  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check Python version
echo 📋 Checking Python version...
python --version
echo.

REM Create virtual environment (optional)
if not exist "venv" (
    echo 🔧 Creating virtual environment...
    python -m venv venv
    echo ✓ Virtual environment created
    
    echo 📦 Activating virtual environment...
    call venv\Scripts\activate.bat
    echo ✓ Virtual environment activated
) else (
    echo ✓ Virtual environment found
    call venv\Scripts\activate.bat
)
echo.

REM Install dependencies
echo 📥 Installing dependencies from requirements.txt...
pip install -q -r requirements.txt
echo ✓ Dependencies installed
echo.

REM Setup .env file
if not exist ".env" (
    echo ⚙️  Setting up environment variables...
    copy .env.example .env
    echo ⚠️  Please update .env with your GROQ_API_KEY
    echo    Get it from: https://console.groq.com
    echo.
    pause
) else (
    echo ✓ .env file already exists
)
echo.

REM Initialize knowledge base
if not exist "legal_db" (
    echo 📚 Initializing RAG Knowledge Base...
    echo    This creates embeddings for legal documents...
    python setup_knowledge_base.py
    echo.
) else (
    echo ✓ Knowledge base already initialized
    echo    (legal documents in legal_db/)
)
echo.

REM Run the application
echo 🚀 Starting Case Intake Application...
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo The app will open in your browser at: http://localhost:8501
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Run with RAG grounding (recommended)
streamlit run app_rag.py

REM Or run without RAG:
REM streamlit run app.py

pause
