const express = require('express');
const fs = require('fs');
const { newDb } = require('pg-mem');
const path = require('path');
const { Pool } = require('pg');
const QRCode = require('qrcode');
const sharp = require('sharp');
const XLSX = require('xlsx');

const app = express();
const port = Number(process.env.PORT) || 3000;
const exportFileName = 'registrations.xlsx';
const browserDistPath = path.join(__dirname, '..', 'dist', 'seed-of-life-registration', 'browser');
const registrationTableName = 'registrations';
const database = createDatabase();
const databaseReady = database.initialize();

app.use(express.json());

app.get('/api/health', async (_request, response) => {
  try {
    await databaseReady;

    response.json({
      status: 'ok',
      storageMode: 'postgres',
      databaseMode: database.mode
    });
  } catch (error) {
    console.error('Health check failed:', error);
    response.status(500).json({
      status: 'error',
      message: 'Database connection failed.'
    });
  }
});

app.get('/api/registrations/export', async (_request, response) => {
  try {
    await databaseReady;
    const rows = await database.getAllRegistrations();

    if (!rows.length) {
      response.status(404).json({
        message: 'No registrations have been exported yet.'
      });
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows.map(toExportRow));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer'
    });

    response
      .status(200)
      .setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      .setHeader('Content-Disposition', `attachment; filename="${exportFileName}"`)
      .send(buffer);
  } catch (error) {
    console.error('Failed to export registrations:', error);
    response.status(500).json({
      message: 'Failed to export registrations.'
    });
  }
});

app.get('/api/registrations/summary', async (_request, response) => {
  try {
    await databaseReady;
    const [count, latestRegistrations] = await Promise.all([
      database.getRegistrationCount(),
      database.getLatestRegistrations(10)
    ]);

    response.json({
      count,
      latestRegistrations,
      exportUrl: '/api/registrations/export'
    });
  } catch (error) {
    console.error('Failed to load registration summary:', error);
    response.status(500).json({
      message: 'Failed to load registration summary.'
    });
  }
});

app.post('/api/registrations', async (request, response) => {
  const payload = normalizeRegistration(request.body);

  if (!payload.campaignName || !payload.fullName || !payload.phoneNumber || !payload.city) {
    response.status(400).json({
      message: 'Campaign name, full name, phone number, and city are required.'
    });
    return;
  }

  const savedAt = new Date().toISOString();
  const row = {
    submittedAt: savedAt,
    campaignName: payload.campaignName,
    fullName: payload.fullName,
    phoneNumber: payload.phoneNumber,
    email: payload.email,
    gender: payload.gender,
    city: payload.city,
    prayerRequest: payload.prayerRequest
  };

  try {
    await databaseReady;
    await database.saveRegistration(row);

    response.status(201).json({
      message: 'Registration saved successfully.',
      savedAt,
      storageMode: 'postgres'
    });
  } catch (error) {
    console.error('Failed to save registration:', error);
    response.status(500).json({
      message: 'Failed to save registration.'
    });
  }
});

app.get('/promo/qr.png', async (request, response) => {
  try {
    const siteUrl = getPublicSiteUrl(request);
    const qrBuffer = await QRCode.toBuffer(siteUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 900,
      color: {
        dark: '#f4e3bc',
        light: '#050505'
      }
    });

    response.type('png').send(qrBuffer);
  } catch (error) {
    console.error('Failed to generate QR image:', error);
    response.status(500).json({ message: 'Failed to generate QR image.' });
  }
});

app.get('/promo/banner.png', async (request, response) => {
  try {
    const siteUrl = getPublicSiteUrl(request);
    const qrBuffer = await QRCode.toBuffer(siteUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 900,
      color: {
        dark: '#f4e3bc',
        light: '#050505'
      }
    });

    const qrForBanner = await sharp(qrBuffer)
      .resize(420, 420, { fit: 'contain' })
      .png()
      .toBuffer();

    const bannerSvg = `
      <svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#050505" />
            <stop offset="100%" stop-color="#111111" />
          </linearGradient>
          <radialGradient id="glow" cx="0" cy="0" r="1">
            <stop offset="0%" stop-color="#f2dca9" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#f2dca9" stop-opacity="0" />
          </radialGradient>
        </defs>

        <rect width="1600" height="900" fill="url(#bg)" />
        <rect x="34" y="34" width="1532" height="832" rx="42" fill="none" stroke="#7f6432" stroke-opacity="0.35" />
        <circle cx="220" cy="180" r="220" fill="url(#glow)" />
        <circle cx="1290" cy="720" r="180" fill="url(#glow)" />

        <text x="110" y="138" fill="#d8b36d" font-family="Georgia, serif" font-size="34" letter-spacing="8">SEED OF LIFE MINISTRY</text>
        <text x="110" y="228" fill="#f8f3ea" font-family="Georgia, serif" font-size="72" font-weight="700">Scan the QR code</text>
        <text x="110" y="318" fill="#f8f3ea" font-family="Georgia, serif" font-size="80" font-weight="700">for Baptism</text>
        <text x="110" y="410" fill="#f8f3ea" font-family="Georgia, serif" font-size="80" font-weight="700">Registration</text>

        <text x="110" y="490" fill="#b8ab97" font-family="Segoe UI, Arial, sans-serif" font-size="32">
          Open the live registration page instantly on mobile.
        </text>

        <rect x="95" y="558" width="760" height="230" rx="30" fill="#171717" fill-opacity="0.95" stroke="#8f7441" stroke-opacity="0.28" />
        <text x="135" y="628" fill="#d8b36d" font-family="Segoe UI, Arial, sans-serif" font-size="24" letter-spacing="4">LIVE URL</text>
        <text x="135" y="684" fill="#f6efdf" font-family="Segoe UI, Arial, sans-serif" font-size="24">${escapeXml(siteUrl)}</text>
        <text x="135" y="740" fill="#aa9c88" font-family="Segoe UI, Arial, sans-serif" font-size="23">Point your phone camera at the QR code to open the page.</text>

        <rect x="1035" y="170" width="430" height="530" rx="40" fill="#141414" fill-opacity="0.96" stroke="#907545" stroke-opacity="0.36" />
        <text x="1142" y="758" fill="#d8b36d" font-family="Segoe UI, Arial, sans-serif" font-size="28" letter-spacing="3">SCAN NOW</text>
      </svg>
    `;

    const bannerBuffer = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 4,
        background: '#050505'
      }
    })
      .composite([
        { input: Buffer.from(bannerSvg), top: 0, left: 0 },
        { input: qrForBanner, top: 240, left: 1040 }
      ])
      .png()
      .toBuffer();

    response.type('png').send(bannerBuffer);
  } catch (error) {
    console.error('Failed to generate banner image:', error);
    response.status(500).json({ message: 'Failed to generate banner image.' });
  }
});

if (fs.existsSync(browserDistPath)) {
  app.use(express.static(browserDistPath));

  app.get(/^(?!\/api|\/promo).*/, (_request, response) => {
    response.sendFile(path.join(browserDistPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Registration app running on http://localhost:${port}`);
});

function normalizeRegistration(body) {
  return {
    campaignName: cleanValue(body?.campaignName),
    fullName: cleanValue(body?.fullName),
    phoneNumber: cleanValue(body?.phoneNumber),
    email: cleanValue(body?.email),
    gender: cleanValue(body?.gender),
    city: cleanValue(body?.city),
    prayerRequest: cleanValue(body?.prayerRequest)
  };
}

function cleanValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function createDatabase() {
  if (!process.env.DATABASE_URL) {
    return createPgMemDatabase();
  }

  return createPostgresDatabase(process.env.DATABASE_URL);
}

function createPostgresDatabase(connectionString) {
  const pool = new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString)
      ? {
          rejectUnauthorized: false
        }
      : undefined
  });

  return {
    mode: 'postgres',
    async initialize() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${registrationTableName} (
          id BIGSERIAL PRIMARY KEY,
          submitted_at TIMESTAMPTZ NOT NULL,
          campaign_name TEXT NOT NULL,
          full_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          email TEXT NOT NULL DEFAULT '',
          gender TEXT NOT NULL DEFAULT '',
          city TEXT NOT NULL,
          prayer_request TEXT NOT NULL DEFAULT ''
        )
      `);
    },
    async saveRegistration(row) {
      await pool.query(
        `
          INSERT INTO ${registrationTableName} (
            submitted_at,
            campaign_name,
            full_name,
            phone_number,
            email,
            gender,
            city,
            prayer_request
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          row.submittedAt,
          row.campaignName,
          row.fullName,
          row.phoneNumber,
          row.email,
          row.gender,
          row.city,
          row.prayerRequest
        ]
      );
    },
    async getRegistrationCount() {
      const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${registrationTableName}`);
      return Number(result.rows[0]?.count || 0);
    },
    async getLatestRegistrations(limit) {
      const result = await pool.query(
        `
          SELECT submitted_at, full_name, phone_number, gender, city
          FROM ${registrationTableName}
          ORDER BY submitted_at DESC, id DESC
          LIMIT $1
        `,
        [limit]
      );

      return result.rows.map((row) => ({
        submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : cleanValue(row.submitted_at),
        fullName: cleanValue(row.full_name),
        phoneNumber: cleanValue(row.phone_number),
        gender: cleanValue(row.gender),
        city: cleanValue(row.city)
      }));
    },
    async getAllRegistrations() {
      const result = await pool.query(
        `
          SELECT submitted_at, campaign_name, full_name, phone_number, email, gender, city, prayer_request
          FROM ${registrationTableName}
          ORDER BY submitted_at ASC, id ASC
        `
      );

      return result.rows.map((row) => ({
        submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : cleanValue(row.submitted_at),
        campaignName: cleanValue(row.campaign_name),
        fullName: cleanValue(row.full_name),
        phoneNumber: cleanValue(row.phone_number),
        email: cleanValue(row.email),
        gender: cleanValue(row.gender),
        city: cleanValue(row.city),
        prayerRequest: cleanValue(row.prayer_request)
      }));
    }
  };
}

function createPgMemDatabase() {
  const memoryDb = newDb({
    autoCreateForeignKeyIndices: true
  });
  const adapter = memoryDb.adapters.createPg();
  const pool = new adapter.Pool();

  return {
    mode: 'pg-mem',
    async initialize() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${registrationTableName} (
          id BIGSERIAL PRIMARY KEY,
          submitted_at TIMESTAMPTZ NOT NULL,
          campaign_name TEXT NOT NULL,
          full_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          email TEXT NOT NULL DEFAULT '',
          gender TEXT NOT NULL DEFAULT '',
          city TEXT NOT NULL,
          prayer_request TEXT NOT NULL DEFAULT ''
        )
      `);
    },
    async saveRegistration(row) {
      await createPostgresDatabaseAdapter(pool).saveRegistration(row);
    },
    async getRegistrationCount() {
      return createPostgresDatabaseAdapter(pool).getRegistrationCount();
    },
    async getLatestRegistrations(limit) {
      return createPostgresDatabaseAdapter(pool).getLatestRegistrations(limit);
    },
    async getAllRegistrations() {
      return createPostgresDatabaseAdapter(pool).getAllRegistrations();
    }
  };
}

function createPostgresDatabaseAdapter(pool) {
  return {
    async saveRegistration(row) {
      await pool.query(
        `
          INSERT INTO ${registrationTableName} (
            submitted_at,
            campaign_name,
            full_name,
            phone_number,
            email,
            gender,
            city,
            prayer_request
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          row.submittedAt,
          row.campaignName,
          row.fullName,
          row.phoneNumber,
          row.email,
          row.gender,
          row.city,
          row.prayerRequest
        ]
      );
    },
    async getRegistrationCount() {
      const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${registrationTableName}`);
      return Number(result.rows[0]?.count || 0);
    },
    async getLatestRegistrations(limit) {
      const result = await pool.query(
        `
          SELECT submitted_at, full_name, phone_number, gender, city
          FROM ${registrationTableName}
          ORDER BY submitted_at DESC, id DESC
          LIMIT $1
        `,
        [limit]
      );

      return result.rows.map((row) => ({
        submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : cleanValue(row.submitted_at),
        fullName: cleanValue(row.full_name),
        phoneNumber: cleanValue(row.phone_number),
        gender: cleanValue(row.gender),
        city: cleanValue(row.city)
      }));
    },
    async getAllRegistrations() {
      const result = await pool.query(
        `
          SELECT submitted_at, campaign_name, full_name, phone_number, email, gender, city, prayer_request
          FROM ${registrationTableName}
          ORDER BY submitted_at ASC, id ASC
        `
      );

      return result.rows.map((row) => ({
        submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : cleanValue(row.submitted_at),
        campaignName: cleanValue(row.campaign_name),
        fullName: cleanValue(row.full_name),
        phoneNumber: cleanValue(row.phone_number),
        email: cleanValue(row.email),
        gender: cleanValue(row.gender),
        city: cleanValue(row.city),
        prayerRequest: cleanValue(row.prayer_request)
      }));
    }
  };
}

function shouldUseSsl(connectionString) {
  const explicitSsl = cleanValue(process.env.DATABASE_SSL).toLowerCase();

  if (explicitSsl === 'true') {
    return true;
  }

  if (explicitSsl === 'false') {
    return false;
  }

  return connectionString.includes('sslmode=require');
}

function toExportRow(row) {
  return {
    'Submitted At': row.submittedAt,
    'Campaign Name': row.campaignName,
    'Full Name': row.fullName,
    'Phone Number': row.phoneNumber,
    Email: row.email,
    Gender: row.gender,
    'City / Area': row.city,
    'Prayer Request / Notes': row.prayerRequest
  };
}

function getPublicSiteUrl(request) {
  const forwardedProtoHeader = request.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader || request.protocol || 'https';

  return `${proto}://${request.get('host')}/`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
