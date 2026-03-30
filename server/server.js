const express = require('express');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const port = Number(process.env.PORT) || 3000;
const dataDirectory = path.join(__dirname, '..', 'data');
const workbookPath = path.join(dataDirectory, 'registrations.xlsx');
const sheetName = 'Registrations';

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
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
    age: payload.age,
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

app.listen(port, () => {
  console.log(`Registration API running on http://localhost:${port}`);
});

function normalizeRegistration(body) {
  return {
    campaignName: cleanValue(body?.campaignName),
    fullName: cleanValue(body?.fullName),
    phoneNumber: cleanValue(body?.phoneNumber),
    email: cleanValue(body?.email),
    age: cleanValue(body?.age),
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
