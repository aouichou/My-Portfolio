# Modern Full-Stack Developer Portfolio [![Production Status](https://img.shields.io/badge/status-live-success?style=flat-square&logo=azure-devops)](https://aouichou.me)

**A Cloud-Native Showcase of Modern Web Development Practices**  
*Django 4.2 | Next.js 14 | Kubernetes | Azure DevOps*

## 📌 Key Features

### ✅ Implemented
- **Core Architecture**
  - Multi-stage Docker builds with Alpine base images
  - Kubernetes cluster deployment (AKS) with ingress-nginx
  - Azure-managed PostgreSQL database
  - Automated CI/CD with GitHub Actions
  - Let's Encrypt TLS certificates via cert-manager

- **Frontend**
  - Dynamic project grid with Next.js Image optimization
  - Contact form with EmailJS integration
  - System-aware dark/light theme toggle
  - Responsive layouts with Tailwind CSS

- **Backend**
  - REST API with Django REST Framework
  - Media file handling with persistent volumes
  - Rate-limited API endpoints
  - Admin-controlled content via Django Admin

### 🚧 In Progress
- **Security Enhancements**
  - HashiCorp Vault integration for secret management
  - OWASP ModSecurity WAF rules
  - 2FA authentication flow

- **Observability**
  - ELK Stack for centralized logging
  - Prometheus/Grafana monitoring
  - Application performance tracing

- **Advanced Features**
  - Interactive terminal simulation
  - PDF resume generator with signed URLs
  - MDX-based blog system

---

## 🛠 Technical Architecture

```mermaid
graph TD
    A[User] --> B[Azure CDN]
    B --> C[NGINX Ingress]
    C --> D[Next.js Frontend]
    C --> E[Django Backend]
    E --> F[PostgreSQL]
    E --> G[Azure Blob Storage]
    H[GitHub Actions] --> I[ACR]
    I --> J[AKS Cluster]
    K[Vault] -->|Secrets| J
    L[Prometheus] -->|Metrics| J
    M[ELK Stack] -->|Logs| J
```

---

## ⚙️ Deployment Overview

### Local Development
```bash
# Start core services
docker-compose up -d frontend backend reverse-proxy

# Run with monitoring stack
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up
```

### Production Infrastructure
```bash
# Apply Kubernetes manifests
kubectl apply -f kubernetes/ --recursive

# Manage deployments
kubectl rollout restart deployment/frontend
kubectl rollout status deployment/backend --timeout=300s
```

### CI/CD Pipeline
```mermaid
graph LR
    A[Code Push] --> B[Security Scan]
    B --> C[Build & Push Images]
    C --> D[AKS Deployment]
    D --> E[Smoke Tests]
    E --> F[Monitoring Alerts]
```

---

## 📚 Documentation Hub

| Area                  | Resources                          | Status       |
|-----------------------|------------------------------------|--------------|
| API Reference         | Swagger Docs                       | ✅ Complete  |
| Deployment Guide      | Azure Setup Walkthrough            | ✅ Complete  |
| Security Model        | Threat Matrix Analysis             | 🔄 In Draft  |
| Performance Tuning    | Lighthouse Reports                 | 🚧 In Progress|


## 📈 Performance Metrics

```text
Frontend Optimization          Backend Performance
=====================          ===================
Lighthouse: 98                 Req/Sec: 1.2k       
FCP: 0.8s                      Error Rate: 0.02%   
TTI: 1.4s                      DB Latency: 12ms    
Bundle Size: 128kb             Cache Hit: 92%      
```

---

## 🛡 Security Posture

```text
Security Control               Status
=================              ======
TLS 1.3 Only                  ✅ Enforced
CSP Headers                   ✅ Active
Rate Limiting                 ✅ Implemented
WAF Rules                     🚧 Testing
Secret Rotation               🔜 Q3 2025
```

---

<details>
<summary>🖥 System Overview</summary>

```text
System Components              Version
==================             =======
Kubernetes Cluster             v1.32.0
Django                         v5.0.11
Next.js                        v15.1.6
```
</details>

---

## 📬 Let's Connect!

<p align="center">
  <a href="https://www.linkedin.com/in/amine-ouichou-168236345" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
  </a>
  <a href="mailto:amine@aouichou.me">
    <img src="https://img.shields.io/badge/Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email">
  </a>
  <a href="https://aouichou.me">
    <img src="https://img.shields.io/badge/Portfolio-FF4088?style=for-the-badge&logo=react&logoColor=white" alt="Portfolio">
  </a>
</p>

<p align="center">
  <a href="https://github.com/aouichou">
    <img src="https://komarev.com/ghpvc/?username=aouichou&label=Profile%20Views&color=0e75b6&style=flat" alt="Profile Views">
  </a>
  <a href="https://github.com/aouichou?tab=repositories">
    <img src="https://img.shields.io/badge/Open_Source-181717?style=flat&logo=github&logoColor=white" alt="Open Source">
  </a>
  <a href="https://aouichou.me/blog">
    <img src="https://img.shields.io/badge/Technical_Writing-4285F4?style=flat&logo=google-docs&logoColor=white" alt="Technical Writing">
  </a>
</p>

<p align="center">
  <em>"Building robust systems from kernel to cloud"</em>
</p>

<p align="center">
  © 2024 Amine Ouichou | <a href="https://aouichou.me/privacy">Privacy Policy</a> | <a href="https://aouichou.me/terms">Terms of Use</a>
</p>
