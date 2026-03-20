// pages/api/_lib/hiddenSeedStore.js
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "hidden-seed.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    const initial = { hiddenSeedIds: [] };
    await fs.writeFile(FILE_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function getHiddenSeedIds() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf8");
  const parsed = JSON.parse(raw || "{}");
  const arr = Array.isArray(parsed.hiddenSeedIds) ? parsed.hiddenSeedIds : [];
  // store as strings for consistent comparison
  return arr.map((x) => String(x));
}

export async function setHiddenSeedIds(nextIds) {
  await ensureFile();
  const unique = Array.from(
    new Set((Array.isArray(nextIds) ? nextIds : []).map((x) => String(x)))
  );

  const next = { hiddenSeedIds: unique };
  const tmp = FILE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, FILE_PATH);

  return unique;
}

export async function hideSeedId(id) {
  const hidden = await getHiddenSeedIds();
  const sid = String(id);
  if (!hidden.includes(sid)) hidden.push(sid);
  return await setHiddenSeedIds(hidden);
}

export async function unhideSeedId(id) {
  const sid = String(id);
  const hidden = await getHiddenSeedIds();
  return await setHiddenSeedIds(hidden.filter((x) => x !== sid));
}
