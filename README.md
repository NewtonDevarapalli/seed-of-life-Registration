# Seed Of Life Registration

This project is a Baptism registration application for Seed of Life Ministry. It provides a
mobile-friendly black-and-gold registration experience, collects participant details, and stores
submissions in an Excel file for now.

## Features

- Fixed campaign: `Registration for - Baptism`
- Premium mobile-friendly registration form
- Guided field progression with skip support for optional fields
- Thank-you screen after successful submission
- Express backend with Excel logging to `data/registrations.xlsx`
- GitHub Pages workflow for the Angular frontend
- Render blueprint for the backend API

## Local run

```bash
npm install
npm start
```

Frontend:

```text
http://localhost:4200/
```

Backend:

```text
http://localhost:3000/
```

## Deployment

### GitHub Pages frontend

The repo includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

After enabling GitHub Pages in the repository settings, the workflow deploys the Angular frontend
to:

```text
https://newtondevarapalli.github.io/seed-of-life-Registration/
```

### Render backend

The repo includes `render.yaml` for a Render web service named:

```text
seed-of-life-registration-api
```

Expected backend URL:

```text
https://seed-of-life-registration-api.onrender.com
```

Update `public/app-config.json` if you use a different Render service URL.

## Useful scripts

```bash
npm start
npm run frontend
npm run backend
npm run build
npm run build:pages
npm run test
```
