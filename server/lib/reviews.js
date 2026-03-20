// server/lib/reviews.js
import crypto from "crypto";
import { readTokens, writeTokens, readReviews, writeReviews } from "../data/store.js";

function nowIso() {
  return new Date().toISOString();
}

function toId(v) {
  return String(v ?? "").trim();
}

function clampRating(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  if (x < 1) return 1;
  if (x > 5) return 5;
  // allow halves if you want; otherwise keep as-is
  return x;
}

/**
 * Admin-only: creates a one-time invite token for a stylist
 * Returns: { token }
 */
export function createReviewInvite({ stylistId }) {
  const sid = toId(stylistId);
  if (!sid) throw new Error("Missing stylistId");

  const token = crypto.randomBytes(24).toString("hex");

  const tokens = readTokens();
  tokens.push({
    id: `tok_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    stylistId: sid,
    token,
    used: false,
    createdAt: nowIso(),
    usedAt: null,
  });

  writeTokens(tokens);
  return { token };
}

/**
 * Public: submit a verified review with a token
 * Throws if invalid/expired/used
 * Returns the stored review record
 */
export function addVerifiedReview({ stylistId, rating, comment, token }) {
  const sid = toId(stylistId);
  const tok = toId(token);

  if (!sid) throw new Error("Missing stylistId");
  if (!tok) throw new Error("Missing token");

  const r = clampRating(rating);
  if (r == null) throw new Error("Invalid rating");

  const tokens = readTokens();
  const idx = tokens.findIndex(
    (t) => t && t.token === tok && String(t.stylistId) === sid
  );

  if (idx === -1) throw new Error("Invalid token");

  const t = tokens[idx];
  if (t.used) throw new Error("Token already used");

  // mark token used
  tokens[idx] = { ...t, used: true, usedAt: nowIso() };
  writeTokens(tokens);

  const reviews = readReviews();
  const rec = {
    id: `rev_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    stylistId: sid,
    rating: r,
    comment: String(comment || "").slice(0, 800),
    verified: true,
    createdAt: nowIso(),
  };

  reviews.push(rec);
  writeReviews(reviews);

  return rec;
}

/**
 * Public: get verified aggregate for a stylist
 * Returns: { rating: number|null, count: number }
 */
export function getVerifiedAggregate(stylistId) {
  const sid = toId(stylistId);
  if (!sid) return { rating: null, count: 0 };

  const reviews = readReviews().filter(
    (r) => r && r.verified === true && String(r.stylistId) === sid
  );

  const count = reviews.length;
  if (!count) return { rating: null, count: 0 };

  const avg = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count;
  const rating = Math.round(avg * 10) / 10; // 1 decimal, e.g. 4.8

  return { rating, count };
}
