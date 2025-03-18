# 🚀 Interactive Portfolio: Terminal + Cloud Architecture

> A modern, production-grade portfolio with interactive terminal demos, running on a distributed cloud architecture

[![Deploy Status](https://img.shields.io/badge/status-live-brightgreen?style=for-the-badge&logo=render)](https://aouichou.me)
[![WebSocket Status](https://img.shields.io/badge/WebSockets-active-4BC51D?style=for-the-badge&logo=websocket)](https://api.aouichou.me/ws)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aouichou/My-Portfolio/render+heriku.yml?style=for-the-badge&label=CI%2FCD)](https://github.com/aouichou/My-Portfolio/actions)

## 🖥️ Interactive Terminal Demo

<p align="center">
  <img src="docs/terminal_demo.gif" width="650px" alt="Interactive Terminal Demo">
</p>

**Live in-browser terminal execution** of real projects via WebSockets. [Try it yourself!](https://aouichou.me/demo/minishell)

### Terminal Implementation Highlights

- **WebSocket Backend**: Django Channels with Redis for async communication
- **Security**: Command allowlist with regex validation, execution limits, sandboxed environment
- **Live Updates**: Zero-latency character streaming for natural terminal feel
- **Docker Integration**: Custom lightweight Debian-based container with GCC toolchain

### Proxied Terminal Connection

The terminal operates through a multi-layered WebSocket architecture:

1. **Browser → Django**: User's browser connects to Django backend via WebSockets
2. **Django → Terminal Service**: Django maintains an internal WebSocket connection to the Terminal service
3. **Terminal Service → PTY**: Terminal service manages PTY processes for command execution
4. **Bi-directional Communication**: Data flows in both directions through this chain

This design ensures greater security as the terminal service is never directly exposed to the internet.

## 🏗️ DevOps Architecture

<p align="center">
  <img src="docs/architecture_diagram.png" width="650px" alt="System Architecture">
</p>

```mermaid
graph TD
    User[User Browser] -->|HTTPS| CF[Cloudflare]
    CF -->|HTTP/2| Next[Next.js Frontend]
    CF -->|WebSocket| Django[Django Backend]
    Django -->|Internal WebSocket| WS[Terminal Service]
    Django -->|JSON| DB[(PostgreSQL)]
    Django -->|Async Tasks| Redis[(Redis Cache)]
    Django -->|Files| S3[(S3 Storage)]
    Next -->|API Calls| Django
    WS -->|PTY| Terminal[PTY Process]
    Terminal -->|Files| Project[Project Files]
    Github[GitHub] -->|CI/CD| Actions[GitHub Actions]
    Actions -->|Deploy| Next
    Actions -->|Deploy| Django
    Actions -->|Deploy| WS
```

### Infrastructure Components

| Service | Technology | Provider | Purpose |
|---------|------------|----------|---------|
| Frontend | Next.js 14, TypeScript, TailwindCSS | Heroku | User interface |
| Backend API | Django 4.2, Django REST Framework | Render | Data & authentication |
| Terminal Service | FastAPI, pexpect, PTY | Render | WebSocket terminal |
| Database | PostgreSQL 15 | Render | Persistent storage |
| Cache | Redis 7 | Render | WebSocket channel layer |
| Storage | S3-compatible | AWS | Project files, assets |
| CDN | Cloudflare | Cloudflare | Edge caching, WAF |
| CI/CD | GitHub Actions | GitHub | Automated deployment |

## 🛡️ Security & Reliability Features

- **Service Health Monitoring**
  - Mutual health checks to prevent free-tier shutdowns
  - Automatic recovery via GitHub Actions workflow
  - Real-time status monitoring in admin panel

- **Terminal Sandbox Security**
  - Strict command allowlist with regex validation
  - Read-only filesystem access (except project directories)
  - Resource limits (512MB RAM, timeout after 30min)
  - WAF protection against common attacks

- **Infrastructure Security**
  - Content Security Policy (CSP) headers
  - Rate limiting on all API endpoints
  - TLS 1.3 enforced throughout
  - Database connection pooling and timeouts

## 📈 Performance Optimization

```text
Frontend Metrics                API Performance
==================              ===============
Lighthouse: 98                  Avg Response: 120ms
FCP: 0.8s                       Peak Requests: 1.2k/min
TTI: 1.4s                       Error Rate: 0.02%
Bundle Size: 128kb              Cache Hit Rate: 92%
```

## 🧰 Technical Decisions

- **FastAPI vs Express.js**: Chose FastAPI for the terminal service due to strong async/await support and built-in WebSocket handling
- **Django Channels vs Socket.IO**: Selected Django Channels for seamless integration with existing Django backend and Redis
- **Render vs Heroku**: Split deployment between providers to leverage Render's superior container support and Heroku's simpler frontend deployment
- **Custom S3 Integration**: Built custom S3 storage class to handle delayed file processing and zip extraction

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/aouichou/MyPortfolio.git
cd MyPortfolio

# Set up environment variables (copy from example)
cp .env.example .env

# Start the development environment
docker-compose up -d

# Visit http://localhost:3000
```

### 📁 Repository Structure

```
.
├── portfolio_ui/           # Next.js frontend
├── portfolio_api/          # Django backend API
├── portfolio-terminal/     # Terminal WebSocket service
├── .github/workflows/      # CI/CD pipelines
├── docs/                   # Documentation
└── docker-compose.yml      # Local development setup
```

---

<p align="center">
  <a href="https://aouichou.me">
    <img src="https://img.shields.io/badge/Visit_Live_Site-FF4088?style=for-the-badge&logo=react&logoColor=white" alt="Visit Site">
  </a>
</p>
