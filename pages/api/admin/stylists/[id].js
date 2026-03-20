console.log("ADMIN ID ROUTE LOADED");

import fs from "fs";
import path from "path";

const DATA_PATH = path.join(
  process.cwd(),
  ".data",
  "applications.json"
);

function readData() {
  const file = fs.readFileSync(DATA_PATH, "utf8");
  return JSON.parse(file);
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  const adminKey = req.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const applications = readData();

  console.log("REQUESTED ID:", id);
  console.log("APPLICATION IDS:", applications.map(a => a.id));

  const index = applications.findIndex(
    (s) => String(s.id) === String(id)
  );

  if (index === -1) {
    return res.status(404).json({ ok: false, error: "Stylist not found" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      stylist: applications[index],
    });
  }

  if (req.method === "PATCH") {
    const updates = req.body;

    applications[index] = {
      ...applications[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeData(applications);

    return res.status(200).json({
      ok: true,
      stylist: applications[index],
    });
  }

  return res.status(405).json({
    ok: false,
    error: "Method not allowed",
  });
}