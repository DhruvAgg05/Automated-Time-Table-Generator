const XLSX = require("xlsx");

function parseSheet(fileBuffer, fileName) {
  const workbook = XLSX.read(fileBuffer, {
    type: "buffer"
  });

  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: ""
  });

  return rows.map((row) => normalizeKeys(row));
}

function normalizeKeys(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = String(key)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    normalized[cleanKey] = typeof value === "string" ? value.trim() : value;
  }

  return normalized;
}

module.exports = {
  parseSheet
};
