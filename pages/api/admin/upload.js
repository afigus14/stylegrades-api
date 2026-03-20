import formidable from "formidable";
import fs from "fs";
import cloudinary from "cloudinary";

export const config = {
  api: { bodyParser: false },
};

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {

  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ ok: false });
    }

    let file = files.file;

    // Normalize file structure safely
    if (Array.isArray(file)) {
      file = file[0];
    }

    if (!file || !file.filepath) {
      console.error("No valid filepath found:", file);
      return res.status(400).json({
        ok: false,
        error: "No valid file uploaded",
      });
    }

    try {
      const result = await cloudinary.v2.uploader.upload(
        file.filepath,
        {
          folder: "stylegrades/stylists",
        }
      );

      // Cleanup temp file
      fs.unlinkSync(file.filepath);

      return res.status(200).json({
        ok: true,
        url: result.secure_url,
      });

    } catch (uploadErr) {
      console.error("Cloudinary error:", uploadErr);
      return res.status(500).json({
        ok: false,
        error: "Upload failed",
      });
    }
  });
}