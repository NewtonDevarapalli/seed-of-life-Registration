const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');

const projectRoot = path.join(__dirname, '..');
const outputDir = path.join(projectRoot, 'public', 'assets');
const publishedUrl = 'https://newtondevarapalli.github.io/seed-of-life-Registration/';
const qrOutputPath = path.join(outputDir, 'baptism-registration-qr.png');
const bannerOutputPath = path.join(outputDir, 'baptism-registration-banner.png');

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const qrBuffer = await QRCode.toBuffer(publishedUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 900,
    color: {
      dark: '#f4e3bc',
      light: '#050505'
    }
  });

  await sharp(qrBuffer).png().toFile(qrOutputPath);

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
      <text x="110" y="250" fill="#f8f3ea" font-family="Georgia, serif" font-size="96" font-weight="700">Scan below QR</text>
      <text x="110" y="352" fill="#f8f3ea" font-family="Georgia, serif" font-size="96" font-weight="700">for Baptism Registration</text>

      <text x="110" y="450" fill="#b8ab97" font-family="Segoe UI, Arial, sans-serif" font-size="34">
        Open the live registration page instantly on mobile.
      </text>

      <rect x="95" y="520" width="610" height="228" rx="30" fill="#171717" fill-opacity="0.95" stroke="#8f7441" stroke-opacity="0.28" />
      <text x="135" y="592" fill="#d8b36d" font-family="Segoe UI, Arial, sans-serif" font-size="24" letter-spacing="4">LIVE URL</text>
      <text x="135" y="652" fill="#f6efdf" font-family="Segoe UI, Arial, sans-serif" font-size="30">${escapeXml(publishedUrl)}</text>
      <text x="135" y="710" fill="#aa9c88" font-family="Segoe UI, Arial, sans-serif" font-size="26">Point your phone camera at the QR code to open the page.</text>

      <rect x="1015" y="190" width="470" height="520" rx="40" fill="#141414" fill-opacity="0.96" stroke="#907545" stroke-opacity="0.36" />
      <text x="1114" y="765" fill="#d8b36d" font-family="Segoe UI, Arial, sans-serif" font-size="28" letter-spacing="3">SCAN NOW</text>
    </svg>
  `;

  await sharp({
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
    .toFile(bannerOutputPath);

  console.log(`QR saved to ${qrOutputPath}`);
  console.log(`Banner saved to ${bannerOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
