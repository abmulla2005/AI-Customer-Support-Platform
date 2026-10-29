import os
import sys

# Ensure unbuffered stdout on Windows
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Ensure backend root is in Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("Starting AI Customer Support Platform backend on http://127.0.0.1:8000...", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
