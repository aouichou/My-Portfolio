# Interactive Portfolio: Terminal + Cloud Architecture

> A modern, production-grade portfolio with interactive terminal demos, running on a distributed cloud architecture

[![Codacy Badge](https://img.shields.io/codacy/grade/db3f1b73496040b39030c8c45c54e5a9?style=for-the-badge&logo=codacy&label=Code%20Quality)](https://app.codacy.com/gh/aouichou/My-Portfolio?utm_source=github.com&utm_medium=referral&utm_content=aouichou/My-Portfolio&utm_campaign=Badge_Grade)
[![Deploy Status](https://img.shields.io/badge/status-live-brightgreen?style=for-the-badge&logo=digitalocean)](https://aouichou.me)
[![WebSocket Status](https://img.shields.io/badge/WebSockets-active-4BC51D?style=for-the-badge&logo=websocket)](https://api.aouichou.me/ws)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aouichou/My-Portfolio/render+heriku.yml?style=for-the-badge&label=CI%2FCD)](https://github.com/aouichou/My-Portfolio/actions)
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-blue?style=for-the-badge&logo=dependabot)](https://github.com/aouichou/My-Portfolio/network/updates)

## Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/aouichou/My-Portfolio.git
cd My-Portfolio

# Run setup script (first time)
./scripts/dev-setup.sh

# Start development environment
docker-compose -f docker-compose.dev.yml up

# Access services
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000/admin
# Terminal:  ws://localhost:8001
```

## Interactive Terminal Demo

<p align="center">
  <img src="docs/terminal_demo.gif" width="650px" alt="Interactive Terminal Demo">
</p>

**Live in-browser terminal execution** of real projects via WebSockets. [Try it yourself!](https://aouichou.me/demo/minishell)

### Terminal Implementation Highlights

- **WebSocket Backend**: Django Channels (browser connection) + Redis channel layer
- **Terminal Execution**: FastAPI service with PTY process management
- **Security**: Command allowlist with regex validation, execution limits, sandboxed environment
- **Live Updates**: Zero-latency character streaming for natural terminal feel
- **Docker Integration**: Custom Ubuntu 24.04 container with GCC toolchain and Python runtime

### Proxied Terminal Connection

The terminal operates through a multi-layered WebSocket architecture:

1. **Browser → Django**: User's browser connects to Django backend via WebSockets
2. **Django → Terminal Service**: Django maintains an internal WebSocket connection to the Terminal service
3. **Terminal Service → PTY**: Terminal service manages PTY processes for command execution
4. **Bi-directional Communication**: Data flows in both directions through this chain

This design ensures greater security as the terminal service is never directly exposed to the internet.

## System Architecture

```mermaid
graph TD
    User("User Browser") -->|HTTPS| CF("Cloudflare")
    CF -->|HTTP/2| Next("Next.js Frontend")
    CF -->|HTTPS| Django("Django Backend")
    Django -->|WebSocket| WS("Terminal Service")
    Django -->|SQL| DB[("Neon PostgreSQL")]
    Django -->|Cache| Redis[("Redis")]
    Django -->|Files| R2[("Cloudflare R2")]
    Next -->|API| Django
    WS -->|PTY| Process("PTY Process")
    Process -->|Files| Projects("Project Files")
    GitHub("GitHub") -->|CI/CD| Actions("GitHub Actions")
    Actions -->|Deploy| Next
    Actions -->|Deploy| Django
    Actions -->|Deploy| WS
    
    style User fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style CF fill:#F6821F,stroke:#C5681A,color:#fff
    style Next fill:#000,stroke:#333,color:#fff
    style Django fill:#092E20,stroke:#0A1F16,color:#fff
    style WS fill:#009688,stroke:#00695C,color:#fff
    style DB fill:#336791,stroke:#22496B,color:#fff
    style Redis fill:#DC382D,stroke:#A02A22,color:#fff
    style R2 fill:#F6821F,stroke:#C5681A,color:#fff
    style GitHub fill:#24292E,stroke:#1B1F23,color:#fff
    style Actions fill:#2088FF,stroke:#176CB8,color:#fff
```

## Cloud Deployment Architecture

```mermaid
graph TD
    User("User") -->|HTTPS| CF("Cloudflare CDN")
    CF --> Heroku("Heroku<br/>Next.js 16")
    CF --> DO("DigitalOcean<br/>Django 5 + FastAPI")
    
    subgraph "Frontend - Heroku"
        Heroku
    end
    
    subgraph "Backend - DigitalOcean"
        DO --> API("Django API")
        DO --> Terminal("Terminal Service")
        API --> Redis[("Redis Cache")]
    end
    
    subgraph "Database - Neon"
        DB[("PostgreSQL<br/>Serverless")]
    end
    
    subgraph "Storage - Cloudflare"
        R2[("R2 Object Storage")]
    end
    
    API --> DB
    API --> R2
    Terminal --> PTY("PTY Processes")
    
    style User fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style CF fill:#F6821F,stroke:#C5681A,color:#fff
    style Heroku fill:#430098,stroke:#2E0066,color:#fff
    style DO fill:#0080FF,stroke:#0059B3,color:#fff
    style DB fill:#336791,stroke:#22496B,color:#fff
    style R2 fill:#F6821F,stroke:#C5681A,color:#fff
    style Redis fill:#DC382D,stroke:#A02A22,color:#fff
```

### Infrastructure Components

| Service | Technology | Provider | Purpose |
|---------|------------|----------|---------|  
| Frontend | Next.js 16 + React 19, TypeScript, Tailwind CSS 3 | Heroku | User interface with Turbopack |
| Backend API | Django 5.1 + Channels 4, DRF 3.15, Python 3.14 | DigitalOcean | Data, auth & WebSocket proxy |
| Terminal Service | FastAPI 0.122, Python 3.14, pexpect, PTY | DigitalOcean | Terminal execution service |
| Database | Neon PostgreSQL (Serverless) | Neon | Persistent storage |
| Cache | Redis 7 | DigitalOcean | Django Channels layer |
| Storage | Cloudflare R2 (S3-compatible) | Cloudflare | Project files, assets |
| CDN | Cloudflare | Cloudflare | Edge caching, WAF |
| CI/CD | GitHub Actions | GitHub | Automated deployment |

## Security & Reliability Features

- **Service Health Monitoring**
  - Mutual health checks to prevent free-tier shutdowns
  - Automatic recovery via GitHub Actions workflow
  - Real-time status monitoring in admin panel

- **Terminal Sandbox Security**
  - Strict command allowlist with regex validation
  - Read-only filesystem access (except project directories)
  - Resource limits (512MB RAM, timeout after 30min)
  - Ubuntu 24.04 sandboxed environment
  - WAF protection against common attacks

- **Infrastructure Security**
  - Content Security Policy (CSP) headers
  - Rate limiting on all API endpoints
  - TLS 1.3 enforced throughout
  - Database connection pooling and timeouts

## Code Quality & Automation

- **Codacy Integration**
  - Separate security scans for each service (API, UI, Terminal)
  - Weekly scheduled analysis + PR-triggered scans
  - SARIF results integrated into GitHub Security tab
  - Continuous monitoring for code quality and vulnerabilities

- **Dependabot Automation**
  - Multi-ecosystem support: npm, pip, Docker, GitHub Actions
  - Grouped dependency updates (production/development)
  - All PRs target dev branch for safe testing
  - Weekly schedule with security priority
  - Recent achievement: Python 3.14, Node 25, Ubuntu 24.04, Next.js 16, React 19

- **Development Workflow**
  - Dev branch for testing updates locally with Docker
  - Main branch for production deployment
  - Path-based deployment (only changed services deployed)
  - Force deploy flag: [deploy-all] in commit message

## Performance Optimization

```text
Frontend Metrics                API Performance
==================              ===============
Lighthouse: 98                  Avg Response: 120ms
FCP: 0.8s                       Peak Requests: 1.2k/min
TTI: 1.4s                       Error Rate: 0.02%
Bundle Size: 128kb              Cache Hit Rate: 92%
```

## Technical Decisions

- **Hybrid WebSocket Architecture**: Django Channels handles browser connections with Redis channel layer, then proxies to FastAPI terminal service for actual command execution
- **FastAPI for Terminal Service**: Chose FastAPI over Express.js for strong async/await support, built-in WebSocket handling, and seamless Python PTY integration
- **React 19 Early Adoption**: Upgraded to React 19 for improved concurrent rendering and automatic batching
- **Tailwind CSS v3 over v4**: Stayed on v3 for production stability; v4 requires significant migration effort
- **Next.js 16 with Turbopack**: Leveraging Turbopack for faster development builds and improved HMR
- **Split Deployment Strategy**: Heroku for frontend (simple Docker deployment), DigitalOcean for backend services (superior App Platform, integrated Redis)
- **Multi-Provider Backup**: Render and Neon as backup providers for database and backend services
- **Custom R2 Integration**: Built custom Cloudflare R2 storage class to handle delayed file processing and zip extraction

## Getting Started

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

### Repository Structure

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
