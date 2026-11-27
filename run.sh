#!/usr/bin/env bash
# ==============================================================================
# PARXSTREAM Cinema Engine - Linux VPS Production Runner
# ==============================================================================

set -e

PORT="${PORT:-8080}"
WORKERS="${WORKERS:-4}"

echo "======================================================="
echo "   PARXSTREAM Cinema Engine - Linux VPS Server"
echo "======================================================="
echo "Port:    $PORT"
echo "Workers: $WORKERS"
echo "======================================================="

# Ensure Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found. Please install Python 3 (e.g., sudo apt install python3 python3-pip python3-venv)"
    exit 1
fi

# Set up virtual environment if needed
if [ ! -d "venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python3 -m venv venv || true
fi

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Install / update dependencies
echo "[INFO] Installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt

# Start production server with Uvicorn
echo "[INFO] Starting PARXSTREAM on http://0.0.0.0:$PORT..."
exec uvicorn server:app --host 0.0.0.0 --port "$PORT" --workers "$WORKERS"
