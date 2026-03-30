const express = require('express');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');
const XLSX = require('xlsx');

const app = express();
const port = Number(process.env.PORT) || 3000;
const dataDirectory = path.join(__dirname, '..', 'data');
const workbookPath = path.join(dataDirectory, 'registrations.xlsx');
const sheetName = 'Registrations';
const browserDistPath = path.join(__dirname, '..', 'dist', 'seed-of-life-registration', 'browser');
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/registrations/export', (_request, response) => {
  if (!fs.existsSync(workbookPath)) {
    response.status(404).json({
      message: 'No registrations have been exported yet.'
    });
    return;
  }

  response.download(workbookPath, 'registrations.xlsx');
});

app.post('/api/registrations', (request, response) => {
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
    fs.mkdirSync(dataDirectory, { recursive: true });

    const workbook = fs.existsSync(workbookPath) ? XLSX.readFile(workbookPath) : XLSX.utils.book_new();
    const existingSheet = workbook.Sheets[sheetName];
    const existingRows = existingSheet ? XLSX.utils.sheet_to_json(existingSheet) : [];
    const nextRows = [...existingRows, row];
    const nextSheet = XLSX.utils.json_to_sheet(nextRows);

    workbook.Sheets[sheetName] = nextSheet;

    if (!workbook.SheetNames.includes(sheetName)) {
      workbook.SheetNames.push(sheetName);
    }

    XLSX.writeFile(workbook, workbookPath);

    response.status(201).json({
      message: 'Registration saved successfully.',
      filePath: workbookPath,
      savedAt
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
