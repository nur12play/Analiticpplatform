const express = require("express");
const Measurement = require("../models/Measurement");

const router = express.Router();

const ALLOWED_FIELDS = new Set(["field1", "field2", "field3"]);

function parseDateOnly(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function endOfDayUTC(dateStr) {
  const d = new Date(`${dateStr}T23:59:59.999Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

router.get("/", async (req, res) => {
  try {
    const { field, start_date, end_date } = req.query;

    if (!field || !ALLOWED_FIELDS.has(field)) {
      return res.status(400).json({
        error: "Invalid or missing 'field'. Allowed: field1, field2, field3"
      });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: "Missing start_date or end_date. Format: YYYY-MM-DD"
      });
    }

    const start = parseDateOnly(start_date);
    const end = endOfDayUTC(end_date);

    if (!start || !end) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD"
      });
    }

    if (start > end) {
      return res.status(400).json({
        error: "start_date must be <= end_date"
      });
    }

    const docs = await Measurement.find(
      { timestamp: { $gte: start, $lte: end } },
      { timestamp: 1, [field]: 1, _id: 0 }
    )
      .sort({ timestamp: 1 })
      .lean();

    if (!docs.length) {
      return res.status(404).json({
        error: "No data found for this date range"
      });
    }

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});


router.get("/metrics", async (req, res) => {
  try {
    const { field, start_date, end_date } = req.query;

    if (!field || !ALLOWED_FIELDS.has(field)) {
      return res.status(400).json({
        error: "Invalid or missing 'field'. Allowed: field1, field2, field3"
      });
    }

    const match = {};

    // Фильтрация по датам (опционально)
    if (start_date || end_date) {
      if (!start_date || !end_date) {
        return res.status(400).json({
          error: "If you use date filter, provide BOTH start_date and end_date (YYYY-MM-DD)"
        });
      }
      const start = parseDateOnly(start_date);
      const end = endOfDayUTC(end_date);
      if (!start || !end) {
        return res.status(400).json({
          error: "Invalid date format. Use YYYY-MM-DD"
        });
      }
      if (start > end) {
        return res.status(400).json({
          error: "start_date must be <= end_date"
        });
      }
      match.timestamp = { $gte: start, $lte: end };
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          avg: { $avg: `$${field}` },
          min: { $min: `$${field}` },
          max: { $max: `$${field}` },
          stdDev: { $stdDevPop: `$${field}` },
          count: { $sum: 1 }
        }
      },
      { $project: { _id: 0, avg: 1, min: 1, max: 1, stdDev: 1, count: 1 } }
    ];

    const result = await Measurement.aggregate(pipeline);

    if (!result.length || result[0].count === 0) {
      return res.status(404).json({ error: "No data found for metrics" });
    }

    // Округлим красиво
    const out = result[0];
    const round = (x) => Math.round(x * 1000) / 1000;

    res.json({
      avg: round(out.avg),
      min: round(out.min),
      max: round(out.max),
      stdDev: round(out.stdDev)
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;