// pages/api/_lib/auth.js

export function allowCors(req, res) {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://www.stylegrades.com",
    "https://stylegrades.com",
    "https://stylegrades.vercel.app"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-admin-key"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
}

export function requireAdmin(req, res) {
  const expected = process.env.ADMIN_API_KEY;

  // If you forgot to set ADMIN_API_KEY, fail closed
  if (!expected) {
    res.status(500).json({
      ok: false,
      error: "Server misconfigured: ADMIN_API_KEY is missing",
    });
    return false;
  }

  const provided = req.headers["x-admin-key"];

  if (!provided || provided !== expected) {
    res.status(401).json({
      ok: false,
      error: "Unauthorized",
    });
    return false;
  }

  return true;
}
