const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const Upload = require('../models/Upload');

// helper to find consumption field
function findConsumptionField(row) {
  const keys = Object.keys(row);
  const lower = keys.map(k => k.toLowerCase());
  const candidates = ['consumption','usage','energy','value','kwh','kw','power'];
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return keys[idx];
  }
  // fallback: pick the first numeric column
  for (const key of keys) {
    if (!isNaN(parseFloat(row[key]))) return key;
  }
  return null;
}

exports.uploadCSV = (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File missing' });
  const rows = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      try {
        if (rows.length === 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ message: 'CSV is empty or malformed' });
        }

        // Identify fields
        const consumptionField = findConsumptionField(rows[0]);
        const renewableField = Object.keys(rows[0]).find(k => k.toLowerCase().includes('renewable'));
        const nonRenewableField = Object.keys(rows[0]).find(k => k.toLowerCase().includes('non'));
        const costField = Object.keys(rows[0]).find(k => k.toLowerCase().includes('cost'));

        const numeric = [];
        let sum = 0, renewableSum = 0, nonRenewableSum = 0, costSum = 0;
        let max = -Infinity, maxAt = null;

        for (const r of rows) {
          const consumption = parseFloat(r[consumptionField]);
          const renewable = renewableField ? parseFloat(r[renewableField]) : 0;
          const nonRenewable = nonRenewableField ? parseFloat(r[nonRenewableField]) : 0;
          const cost = costField ? parseFloat(r[costField]) : 0;

          if (!isNaN(consumption)) {
            numeric.push({
              ...r,
              _consumption: consumption,
              _renewable: renewable,
              _nonRenewable: nonRenewable,
              _cost: cost,
            });

            sum += consumption;
            renewableSum += isNaN(renewable) ? 0 : renewable;
            nonRenewableSum += isNaN(nonRenewable) ? 0 : nonRenewable;
            costSum += isNaN(cost) ? 0 : cost;

            if (consumption > max) {
              max = consumption;
              maxAt = r.timestamp || r.time || r.date || null;
            }
          }
        }

        const avg = numeric.length ? sum / numeric.length : 0;

        const stats = {
          fieldUsed: consumptionField,
          sum,
          avg,
          max,
          maxAt,
          rows: numeric.length,
          renewable: renewableSum,
          nonRenewable: nonRenewableSum,
          cost: costSum,
        };

        const upload = await Upload.create({
          user: req.user.id,
          originalName: req.file.originalname,
          data: numeric,
          stats,
        });

        // remove temp file
        fs.unlinkSync(filePath);
        res.json({ message: 'Uploaded and parsed', upload });
      } catch (err) {
        console.error(err);
        try { fs.unlinkSync(filePath); } catch (e) {}
        res.status(500).json({ message: 'Error processing CSV' });
      }
    })
    .on('error', (err) => {
      console.error(err);
      try { fs.unlinkSync(filePath); } catch (e) {}
      res.status(500).json({ message: 'Failed to parse CSV' });
    });
};
