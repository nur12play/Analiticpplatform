const mongoose = require("mongoose");
const Measurement = require("./models/Measurement");

const MONGO_URI = "mongodb://127.0.0.1:27017/analyticsdb";

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected. Seeding more data...");

  await Measurement.deleteMany({});

  const start = new Date("2025-01-01T00:00:00.000Z");
  const days = 7;
  const stepMinutes = 30;

  const docs = [];
  const totalSteps = (days * 24 * 60) / stepMinutes;

  for (let i = 0; i < totalSteps; i++) {
    const ts = new Date(start.getTime() + i * stepMinutes * 60 * 1000);

    docs.push({
      timestamp: ts,
      field1: Number(rand(17, 30).toFixed(2)),
      field2: Number(rand(35, 85).toFixed(2)),
      field3: Number(rand(300, 650).toFixed(2)) 
    });
  }

  await Measurement.insertMany(docs);
  console.log(`✅ Inserted ${docs.length} measurements`);

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch(console.error);
