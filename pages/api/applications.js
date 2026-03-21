export default async function handler(req, res) {
  // ✅ ADD THIS (CORS)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ KEEP your existing GET check
  if (req.method === "GET") {
    return res.status(200).json({ message: "API is working" });
  }

  if (req.method === "POST") {
    try {
      const data = req.body;

      console.log("Application received:", data);

      return res.status(200).json({
        ok: true,
        message: "Application received successfully",
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: "Server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}