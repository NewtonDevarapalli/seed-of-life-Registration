# Seed Of Life Registration

This project is a Baptism registration application for Seed of Life Ministry. It runs as a single
Node application that:

- serves the Angular frontend
- accepts form submissions
- stores registrations in Postgres
- provides an admin dashboard and Excel export generated from the database
- generates the QR image and promo banner inside the same app

## Features

- Fixed campaign: `Registration for - Baptism`
- Premium black-and-gold registration form
- Guided field progression with skip support for optional fields
- Thank-you screen after successful submission
- Admin dashboard at `/admin`
- Excel export from the database at `/api/registrations/export`
- Built-in QR image route and banner image route

## Local run

Install dependencies:

```bash
npm install
```

Start the full development experience:

```bash
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

## Database modes

The app supports two modes:

1. Real Postgres when `DATABASE_URL` is set
2. In-memory Postgres for local development/testing when `DATABASE_URL` is not set

That means you can run the app locally without setting up Postgres first, but for real hosted
storage you should set `DATABASE_URL`.

## Free Postgres deployment

This repo includes `render.yaml` for a free web service. The web app itself can stay on Render
free, and you can point it to any free Postgres provider using `DATABASE_URL`.

Required environment variable:

```text
DATABASE_URL=your_postgres_connection_string
```

Optional:

```text
DATABASE_SSL=true
```

`DATABASE_SSL=true` is helpful for hosted providers that require SSL. If your connection string
already includes `sslmode=require`, the app also enables SSL automatically.

## Render setup

1. Open your Render web service.
2. Add environment variable:

```text
DATABASE_URL=your_postgres_connection_string
```

3. If your provider requires SSL, also add:

```text
DATABASE_SSL=true
```

4. Deploy the latest commit.

After deployment:

- registrations are saved in Postgres
- `/admin` shows the latest entries and count
- `/api/registrations/export` downloads an Excel file generated from database rows

## Admin dashboard

Open:

```text
/admin
```

The dashboard shows:

- total registration count
- latest registrations
- download Excel button

## Useful scripts

```bash
npm start
npm run frontend
npm run backend
npm run build
npm run generate:promo-assets
npm run test
```
