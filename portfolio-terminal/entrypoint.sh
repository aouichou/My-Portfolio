#!/bin/bash
# Create sandbox directories in coder's home directory
mkdir -p /home/coder/sandboxes
mkdir -p /home/coder/projects
mkdir -p /home/coder/projects/minishell

# Copy demo files if needed
if [ ! -f /home/coder/projects/minishell/README.md ]; then
    echo "# Minishell Project" > /home/coder/projects/minishell/README.md
    echo "Welcome to the terminal demo!" >> /home/coder/projects/minishell/README.md
fi

chown -R coder:coder /home/coder
# Start the terminal service
exec uvicorn main:app --host 0.0.0.0 --port 8000