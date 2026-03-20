// server/lib/reviews.js
import crypto from "crypto";
import { readTokens, writeTokens, readReviews, writeReviews } from "../data/store.js";

export function makeToken() {
  return crypto.randomBytes(24).toString("hex"); // 48 chars
}

export function createReviewToken({ stylistId, expiresDays = 30, maxUses = 1 }) {
  const tokens = readTokens();

  const token = makeToken();
  const now = Date.now();
  const expiresAt = now + expiresDays * 24 * 60 * 60 * 1000;

  const record = {
    id: `rt_${now}_${Math.random().toString(16).slice(2)}`,
    token,
    stylistId: String(stylistId),
    createdAt: now,
    expiresAt,
    maxUses,
    uses: 0,
    active: true,
  };

  tokens.push(record);
  writeTokens(tokens);

  return record;
}

export function getTokenRecord(token) {
  const tokens = readTokens();
  return tokens.find((t) => t.token === token) || null;
}

export function validateToken(token) {
  const t = getTokenRecord(token);
  if (!t) return { ok: false, reason: "not_found" };
  if (!t.active) return { ok: false, reason: "inactive" };
  if (Date.now() > t.expiresAt) return { ok: false, reason: "expired" };
  if (t.uses >= t.maxUses) return { ok: false, reason: "used" };
  return { ok: true, token: t };
}

export function consumeToken(token) {
  const tokens = readTokens();
  const idx = tokens.findIndex((t) => t.token === token);
  if (idx === -1) return null;

  tokens[idx].uses += 1;
  if (tokens[idx].uses >= tokens[idx].maxUses) {
    tokens[idx].active = false;
  }
  writeTokens(tokens);
  return tokens[idx];
}

export function addVerifiedReview({ stylistId, rating, comment, token }) {
  const reviews = readReviews();
  const now = Date.now();

  const rec = {
    id: `rev_${now}_${Math.random().toString(16).slice(2)}`,
    stylistId: String(stylistId),
    rating: Number(rating),
    comment: String(comment || ""),
    verified: true,
    verificationMethod: "token",
    token,
    createdAt: now,
  };

  reviews.push(rec);
  writeReviews(reviews);
  return rec;
}

export function getVerifiedAggregate(stylistId) {
  const reviews = readReviews().filter(
    (r) => r.verified === true && String(r.stylistId) === String(stylistId)
  );

  const count = reviews.length;
  if (!count) return { rating: null, count: 0 };

  const avg = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count;

  // 1 decimal like 4.8
  const rating = Math.round(avg * 10) / 10;
  return { rating, count };
}
