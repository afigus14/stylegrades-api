// server/data/store.js
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const TOKENS_PATH = path.join(DATA_DIR, "reviewTokens.json");
const REVIEWS_PATH = path.join(DATA_DIR, "reviews.json");

function ensureFile(filePath, initialValue) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialValue, null, 2), "utf-8");
  }
}

function readJSON(filePath, fallback) {
  ensureFile(filePath, fallback);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJSON(filePath, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export function readTokens() {
  return readJSON(TOKENS_PATH, []);
}

export function writeTokens(tokens) {
  writeJSON(TOKENS_PATH, tokens);
}

export function readReviews() {
  return readJSON(REVIEWS_PATH, []);
}

export function writeReviews(reviews) {
  writeJSON(REVIEWS_PATH, reviews);
}
