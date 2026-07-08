#!/bin/bash

# Quick Start Script for Case Intake App with RAG Grounding
# This script sets up and runs the application

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Legal Case Intake Form - RAG Grounded Version         ║"
echo "║        Kanoon Ka Database (with Hallucination Prevention)  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check Python version
echo "📋 Checking Python version..."
python_version=$(python3 --version 2>&1)
echo "✓ $python_version"
echo ""

# Create virtual environment (optional)
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
    
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
    echo "✓ Virtual environment activated"
else
    echo "✓ Virtual environment found"
    source venv/bin/activate
fi
echo ""

# Install dependencies
echo "📥 Installing dependencies from requirements.txt..."
pip install -q -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Setup .env file
if [ ! -f ".env" ]; then
    echo "⚙️  Setting up environment variables..."
    cp .env.example .env
    echo "⚠️  Please update .env with your GROQ_API_KEY"
    echo "   Get it from: https://console.groq.com"
    echo ""
    read -p "   Press Enter after updating .env file..."
else
    echo "✓ .env file already exists"
fi
echo ""

# Initialize knowledge base
if [ ! -d "legal_db" ] || [ -z "$(ls -A legal_db/)" ]; then
    echo "📚 Initializing RAG Knowledge Base..."
    echo "   This creates embeddings for legal documents..."
    python3 setup_knowledge_base.py
    echo ""
else
    echo "✓ Knowledge base already initialized"
    echo "   (legal documents in legal_db/)"
fi
echo ""

# Run the application
echo "🚀 Starting Case Intake Application..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "The app will open in your browser at: http://localhost:8501"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run with RAG grounding (recommended)
streamlit run app_rag.py

# Or run without RAG:
# streamlit run app.py
