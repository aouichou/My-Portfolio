```markdown
# My Portfolio  
Modern full-stack developer portfolio showcasing projects, skills, and contact integration. Built with Django + Next.js 2025 stack.  

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-Next.js%2014%20%7C%20TypeScript%20%7C%20Tailwind-blue.svg" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-Django%204.2%20%7C%20DRF%20%7C%20SQLite-green.svg" alt="Backend" />
  <img src="https://img.shields.io/badge/Features-Dark%20Mode%20%7C%20Contact%20Form%20%7C%20SEO-orange.svg" alt="Features" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success.svg" alt="Status" />
</p>

## Overview  
**My Portfolio** is a cutting-edge developer portfolio featuring:  
- Project showcases with dynamic filtering  
- Secure contact form with email integration  
- Dark/light mode toggle with system preference detection  
- SEO optimization and responsive design  
- CI/CD-ready Dockerized architecture  

## Key Features  

1. **Modern Tech Stack**  
   - Next.js 14 App Router with TypeScript  
   - Django REST Framework backend API  
   - Tailwind CSS + Framer Motion animations  

2. **Projects Showcase**  
   - Filterable project grid with tech stack badges  
   - Dynamic image loading with Next.js Optimization  
   - Admin-controlled content via Django Admin  

3. **Contact System**  
   - Secure message submission with rate limiting  
   - EmailJS integration for instant notifications  
   - Form validation and loading states  

4. **DevOps Ready**  
   - Dockerized services with compose orchestration  
   - Vercel-optimized frontend deployment  
   - PostgreSQL-ready migrations  

## Tech Stack  

**Frontend**  
```bash
Next.js 14 | TypeScript | Tailwind CSS | React Query | Framer Motion | Axios
```  

**Backend**  
```bash
Django 4.2 | Django REST Framework | SQLite/PostgreSQL | CORS Headers | Simple JWT
```  

**Infrastructure**  
```bash
Docker | Nginx | Vercel | GitHub Actions
```

## Project Structure  

```
portfolio/
├── portfolio_api/              # Django backend
│   ├── projects/               # Projects app
│   │   ├── models.py           # Project data model
│   │   ├── serializers.py      # DRF serializers
│   │   └── views.py            # API endpoints
│   └── settings.py             # Django config
│
└── portfolio_ui/               # Next.js frontend
    ├── src/app/                # App router
    │   ├── layout.tsx          # Root layout
    │   └── page.tsx            # Home page
    ├── components/             # React components
    │   ├── ContactForm.tsx     # Animated form
    │   └── ProjectsGrid.tsx    # Dynamic project display
    └── lib/                    # Utilities
        └── api-client.ts       # Axios instance
```

## Quick Start  

1. **Clone Repository**  
   ```bash
   git clone https://github.com/Agrippa2023/portfolio.git
   cd portfolio
   ```

2. **Configure Environment**  
   ```bash
   cp portfolio_api/.env.example portfolio_api/.env
   # Fill in Django secret key and email credentials
   ```

3. **Run with Docker**  
   ```bash
   docker-compose up --build
   ```
   Access at:  
   - Frontend: `http://localhost:3000`  
   - Django Admin: `http://localhost:8000/admin`  

4. **Local Development**  
   ```bash
   # Backend
   cd portfolio_api && python -m venv env
   source env/bin/activate
   pip install -r requirements.txt
   python manage.py runserver

   # Frontend 
   cd ../portfolio_ui
   npm install
   npm run dev
   ```

## Deployment  

1. **Vercel (Frontend)**  
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAgrippa2023%2Fportfolio)  

2. **Docker Production**  
   ```bash
   docker-compose -f docker-compose.prod.yml up --build
   ```

## Screenshots  

<div align="center">

</div>

## Roadmap  

- [ ] Blog integration with MDX  
- [ ] PDF resume generator endpoint  
- [ ] Guestbook with Firebase Realtime DB  
- [ ] Internationalization (i18n) support  
- [ ] Lighthouse performance optimization  

## License  

No License

---  
<p align="center">
  Crafted with ❤️ by <a href="https://github.com/aouichou">Amine</a><br/>
  Let's connect on <a href="https://linkedin.com/in/yourprofile">LinkedIn</a>!
</p>
```  
