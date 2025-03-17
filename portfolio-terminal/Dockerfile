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

# Create a non-root user
RUN useradd -m -s /bin/bash coder
RUN mkdir -p /home/coder/projects /home/coder/sandboxes
RUN chown -R coder:coder /home/coder

# Install zsh and oh-my-zsh
RUN apt-get update && apt-get install -y zsh curl git \
    && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" \
    && chsh -s /bin/zsh coder \
    && cp -R /root/.oh-my-zsh /home/coder/ \
    && cp /root/.zshrc /home/coder/ \
    && sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="agnoster"/' /home/coder/.zshrc \
    && chmod -R 755 /home/coder/.oh-my-zsh \
    && chown -R coder:coder /home/coder/.oh-my-zsh /home/coder/.zshrc

# Add plugins
RUN sed -i 's/plugins=(git)/plugins=(git colorize npm python vscode)/' /home/coder/.zshrc

# Add custom settings for better terminal experience
RUN echo "export TERM=xterm-256color" >> /home/coder/.zshrc && \
    echo "setopt share_history" >> /home/coder/.zshrc && \
    echo "setopt auto_cd" >> /home/coder/.zshrc && \
    echo "setopt prompt_subst" >> /home/coder/.zshrc

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install -r requirements.txt

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