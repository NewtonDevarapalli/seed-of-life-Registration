# Seed Of Life Registration

This project is a Baptism registration application for Seed of Life Ministry. It now runs as a
single Render-hosted Node application that:

- serves the Angular frontend
- accepts form submissions
- stores submissions in Google Sheets when configured, or Excel as a fallback
- generates the QR image and promo banner inside the same app

## Features

- Fixed campaign: `Registration for - Baptism`
- Premium black-and-gold registration form
- Guided field progression with skip support for optional fields
- Thank-you screen after successful submission
- Google Sheets logging with Render-friendly environment variable setup
- Excel fallback for local use or temporary storage
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
4. serve both frontend and registration API from the same domain

## Google Sheets setup

The app will write to Google Sheets when `GOOGLE_SHEETS_SPREADSHEET_ID` is configured. Otherwise it
will continue writing to `data/registrations.xlsx`.

### 1. Create the Google Sheet

1. Create a Google Sheet for registrations.
2. Copy the spreadsheet ID from the URL.

Example:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

### 2. Create a Google Cloud service account

1. Open Google Cloud Console.
2. Create or choose a project.
3. Enable the Google Sheets API.
4. Create a service account.
5. Create a JSON key for that service account.
6. Share the Google Sheet with the service account email as an editor.

### 3. Set Render environment variables

Add these environment variables in Render:

```text
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=Registrations
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
PUBLIC_APP_URL=https://seed-of-life-registration.onrender.com
```

Notes:

- Keep the `\n` characters in the private key value when pasting into Render.
- `GOOGLE_SHEETS_SHEET_NAME` is optional. It defaults to `Registrations`.
- If the tab does not exist yet, the app will create it automatically.
- You can also use `GOOGLE_SERVICE_ACCOUNT_JSON` instead of the email/private key pair if you prefer
  to store the full JSON key as one environment variable.

### 4. Redeploy

After saving the environment variables, redeploy the Render service.

### 5. Verify

After deployment:

- `GET /api/health` will show `storageMode: "google-sheets"`
- `POST /api/registrations` will append rows to the Google Sheet
- `GET /api/registrations/export` will return the Google Sheet URL instead of an Excel file

## Important note about storage

- Google Sheets is better than Excel for shared access and cleanup.
- Excel inside a hosted server is fine for short-term use, but it is not a long-term database.
- For production-scale use, a database is still better.

## Useful scripts

```bash
npm start
npm run frontend
npm run backend
npm run build
npm run generate:promo-assets
npm run test
```
