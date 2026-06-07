export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { city } = req.query;

  if (!city) {
    return res.status(400).json({
      error: "Missing city",
    });
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(city)}` +
      `&key=${process.env.GOOGLE_GEOCODE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log("GOOGLE GEOCODE DATA:", data);

    if (
      !data.results ||
      data.results.length === 0
    ) {
      return res.status(404).json({
        error: "Location not found",
      });
    }

    const result = data.results[0];

    const zipComponent =
      result.address_components.find(
        (c) =>
          c.types.includes("postal_code")
      );

    return res.status(200).json({
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      zip: zipComponent?.long_name || "",
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Geocoding failed",
    });
  }
}