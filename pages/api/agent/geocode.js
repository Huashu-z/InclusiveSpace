import { geocodeLocation } from "../../../utils/agentGeocode.js";

function normalizeBody(body = {}) {
  const locationText = typeof body.locationText === "string" ? body.locationText.trim() : "";
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "hamburg";
  return { locationText, city };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = normalizeBody(req.body);
  if (!input.locationText) {
    return res.status(400).json({ error: "locationText is required" });
  }

  const result = await geocodeLocation(input);
  return res.status(200).json(result);
}
