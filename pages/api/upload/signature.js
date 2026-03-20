// pages/api/upload/signature.js
import crypto from "crypto";
import { allowCors } from "../_lib/auth"; // ✅ THIS is the correct relative path from /upload/

function json(res, status, body) {
  return res.status(status).json(body);
}

// Robust JSON body reader (works even if req.body is undefined)
function readJsonBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);

    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return json(res, 500, {
      ok: false,
      error:
        "Missing Cloudinary env vars. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
    });
  }

  const body = await readJsonBody(req);
  const requestedFolder = String(body.folder || "").trim();

  // Keep uploads inside your brand folder
  const folder =
    requestedFolder && requestedFolder.startsWith("stylegrades/")
      ? requestedFolder
      : "stylegrades/uploads";

  const timestamp = Math.floor(Date.now() / 1000);

  // Sign EXACT params Cloudinary will evaluate
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  return json(res, 200, {
    ok: true,
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
  });
}
