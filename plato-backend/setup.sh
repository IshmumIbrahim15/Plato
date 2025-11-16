#!/bin/bash

# PLATO ONE-COMMAND SETUP
# Run this to set up your entire local dev environment
# Usage: chmod +x setup.sh && ./setup.sh

set -e  # Exit on error

echo "🎓 PLATO Backend Setup Script"
echo "=============================="
echo ""

# Check for required tools
echo "✓ Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "Node.js not found. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "PostgreSQL not found. Please install PostgreSQL first."
    echo "   Visit: https://www.postgresql.org/download/"
    exit 1
fi

echo "✓ Node.js: $(node --version)"
echo "✓ PostgreSQL: $(psql --version)"
echo ""

# Create .env file
echo "Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ .env created (update OPENROUTER_API_KEY!)"
else
    echo "✓ .env already exists"
fi
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Create PostgreSQL database
echo "Setting up PostgreSQL..."
psql -U postgres -c "DROP DATABASE IF EXISTS plato;" 2>/dev/null || true
psql -U postgres -c "CREATE DATABASE plato;" 2>/dev/null || true
echo "✓ Database created"
echo ""

# Run schema
echo "Running database schema..."
psql -U postgres -d plato -f src/database/schema.sql > /dev/null 2>&1
echo "✓ Schema created"
echo ""

# Seed data
echo "Seeding sample data..."
psql -U postgres -d plato -f src/database/seed.sql > /dev/null 2>&1
echo "✓ Sample data loaded"
echo ""

# Verify database
TOPIC_COUNT=$(psql -U postgres -d plato -t -c "SELECT COUNT(*) FROM topics;")
echo "✓ Database check: $TOPIC_COUNT topics loaded"
echo ""

# Ready!
echo "SETUP COMPLETE!"
echo ""
echo "🚀 To start the server:"
echo "   npm start"
echo ""
echo "📍 Server will run at: http://localhost:3001"
echo ""
echo "🔑 IMPORTANT:"
echo "   1. Edit .env and add your OPENROUTER_API_KEY"
echo "   2. Get a key from: https://openrouter.ai/keys"
echo "   3. Then run: npm start"
echo ""