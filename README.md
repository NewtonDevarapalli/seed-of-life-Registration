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

## Single Render deployment with persistent Excel storage

This repo includes `render.yaml` for one web service:

```text
seed-of-life-registration
```

Render will:

1. install dependencies
2. build the Angular app
3. run the Node server
4. attach a persistent disk at `/var/data`
5. save `registrations.xlsx` on that disk
6. serve both frontend and Excel-writing API from the same domain

The app uses:

- local development: [data](C:/Users/Asha/seed-of-life-Registration/data)
- Render: `/var/data` through `REGISTRATION_DATA_DIR`

## Render steps

1. Open your Render service.
2. Change the plan to one that supports disks, such as `Starter`.
3. Add a disk:
   - Name: `registration-data`
   - Mount path: `/var/data`
   - Size: `1 GB`
4. Add environment variable:

```text
REGISTRATION_DATA_DIR=/var/data
```

5. Deploy the latest commit.

After that, the Excel file will be stored on the Render disk and should stay across redeploys.

## Important note about Excel on Render

- Without a disk, Render storage is temporary and old registrations can disappear.
- With a persistent disk, the Excel file survives redeploys and restarts.
- For production at larger scale, a database is still better.

## Useful scripts

```bash
npm start
npm run frontend
npm run backend
npm run build
npm run generate:promo-assets
npm run test
```
