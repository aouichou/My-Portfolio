#!/bin/bash
# Create sandbox directories in coder's home directory
mkdir -p /home/coder/sandboxes
mkdir -p /home/coder/projects

# Set permissions (don't fail if chown doesn't work in Render)
chown -R coder:coder /home/coder 2>/dev/null || true

# Start the terminal service
exec uvicorn main:app --host 0.0.0.0 --port 8000