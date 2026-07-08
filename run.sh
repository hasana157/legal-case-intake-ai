#!/bin/bash

# Case Intake Application Startup Script
# This script sets up and runs the Legal Case Intake Form application

echo "================================"
echo "Legal Case Intake Form Application"
echo "================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

echo ""
echo "🔧 Activating virtual environment..."
source venv/bin/activate

echo "📥 Installing dependencies..."
pip install -r requirements.txt --quiet

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "   Please edit .env and add your GROQ_API_KEY"
    echo ""
    read -p "Press Enter after adding your API key..."
fi

# Check if GROQ_API_KEY is set
if ! grep -q "GROQ_API_KEY=.*[^=]" .env; then
    echo ""
    echo "⚠️  GROQ_API_KEY is not set in .env file"
    echo "❌ Please add your Groq API key to .env file before running the application"
    echo "   Get your key from: https://console.groq.com/"
    exit 1
fi

echo ""
echo "✓ All checks passed!"
echo "🚀 Starting application..."
echo ""
echo "The app will open at: http://localhost:8501"
echo "Press Ctrl+C to stop the server"
echo ""

streamlit run app.py
