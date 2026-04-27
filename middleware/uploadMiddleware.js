const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv"
    ];

    const isCsv = file.originalname.toLowerCase().endsWith(".csv");
    const isXlsx = file.originalname.toLowerCase().endsWith(".xlsx");

    if (allowed.includes(file.mimetype) || isCsv || isXlsx) {
      return cb(null, true);
    }

    return cb(new Error("Only .xlsx and .csv files are allowed."));
  }
});

module.exports = upload;
