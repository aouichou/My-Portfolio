#!/bin/bash

# Create sandbox directories
mkdir -p /app/sandboxes

# Start the terminal service
exec uvicorn main:app --host 0.0.0.0 --port 8000