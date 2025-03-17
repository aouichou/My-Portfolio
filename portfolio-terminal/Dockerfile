FROM ubuntu:22.04

# Install necessary packages
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    build-essential gcc g++ make \
    git curl wget \
    nodejs npm \
    bash-completion \
    vim nano \
	libreadline-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Create a non-root user
RUN useradd -m -s /bin/bash coder
RUN mkdir -p /home/coder/projects /home/coder/sandboxes
RUN chown -R coder:coder /home/coder

# Copy application files
COPY --chown=coder:coder . /app
COPY bashrc /app/bashrc
RUN chmod +x /app/bashrc
WORKDIR /app

# Setup security measures
RUN mkdir -p /app/sandboxes
RUN chown -R coder:coder /app/sandboxes
RUN chmod 755 /app/entrypoint.sh

# Expose port
EXPOSE 8000

# Run as non-root user
USER coder

# Start the service
CMD ["/app/entrypoint.sh"]