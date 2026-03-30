# Seed Of Life Registration

This project is a Baptism registration application for Seed of Life Ministry. It now runs as a
single Render-hosted Node application that:

- serves the Angular frontend
- accepts form submissions
- stores submissions in an Excel file inside the same app
- generates the QR image and promo banner inside the same app

## Features

- Fixed campaign: `Registration for - Baptism`
- Premium black-and-gold registration form
- Guided field progression with skip support for optional fields
- Thank-you screen after successful submission
- Excel logging inside the same application
- Built-in QR image route and banner image route

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

## Single Render deployment

This repo includes `render.yaml` for one web service:

```text
seed-of-life-registration
```

Render will:

1. install dependencies
2. build the Angular app
3. run the Node server
4. serve both frontend and Excel-writing API from the same domain

## Important note about Excel on Render

The Excel file is fine for short-term use, but hosted server files are not a long-term database.
For production, a database is better.

## Useful scripts

```bash
npm start
npm run frontend
npm run backend
npm run build
npm run generate:promo-assets
npm run test
```
