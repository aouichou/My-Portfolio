#!/bin/bash
# Create sandbox directories in coder's home directory
mkdir -p /home/coder/sandboxes
mkdir -p /home/coder/projects
mkdir -p /home/coder/projects/minishell


# Start the terminal service
exec uvicorn main:app --host 0.0.0.0 --port 8000