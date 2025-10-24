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
	valgrind \
	libx11-dev \
	libxext-dev \
	libxrandr-dev \
	libxi-dev \
	libxrender-dev \
	libbsd-dev \
	mesa-common-dev \
	libglu1-mesa-dev \
	dumb-init \
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
RUN sed -i 's/ZSH_THEME="agnoster"/ZSH_THEME="robbyrussell"/' /home/coder/.zshrc && \
	git clone --depth=1 https://github.com/romkatv/powerlevel10k.git /home/coder/.oh-my-zsh/custom/themes/powerlevel10k && \
	sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="powerlevel10k\/powerlevel10k"/' /home/coder/.zshrc && \
	echo 'POWERLEVEL9K_MODE="nerdfont-complete"' >> /home/coder/.zshrc && \
	echo 'POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(dir vcs)' >> /home/coder/.zshrc && \
	echo 'POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status)' >> /home/coder/.zshrc

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

# Runtime safety configurations
RUN echo "alias sudo='echo \"Command not permitted: sudo\"'" >> /home/coder/.bashrc && \
    echo "alias docker='echo \"Command not permitted: docker\"'" >> /home/coder/.bashrc && \
    echo "alias kubectl='echo \"Command not permitted: kubectl\"'" >> /home/coder/.bashrc && \
    echo "set -o noclobber" >> /home/coder/.bashrc

# Copy security policy files and create directory
RUN mkdir -p /app/security && chown -R coder:coder /app/security
COPY --chown=coder:coder seccomp-profile.json /app/security/

# Run as non-root user
USER coder

# Start the service  
CMD ["dumb-init", "bash", "-c", "ulimit -n 1024 && exec ./entrypoint.sh"]