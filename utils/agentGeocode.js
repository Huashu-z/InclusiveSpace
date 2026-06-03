const knownLocations = {
  hamburg: {
    "hamburg hauptbahnhof": {
      locationText: "Hamburg Hauptbahnhof",
      coordinates: [10.0064, 53.5528],
      confidence: "high",
      source: "local_known_location",
    },
    hauptbahnhof: {
      locationText: "Hamburg Hauptbahnhof",
      coordinates: [10.0064, 53.5528],
      confidence: "high",
      source: "local_known_location",
    },
  },
  penteli: {},
};

function normalizeLocation(text) {
  return String(text || "").trim().toLowerCase();
}

function getKnownLocation(locationText, city) {
  const normalized = normalizeLocation(locationText);
  return knownLocations[city]?.[normalized] || null;
}

export async function geocodeLocation({ locationText, city = "hamburg", limit = 1, fetchImpl = fetch }) {
  if (!locationText) {
    return {
      locationText: null,
      coordinates: null,
      confidence: "none",
      source: "missing_location_text",
    };
  }

  const known = getKnownLocation(locationText, city);
  if (known) return known;

  const query = city && !normalizeLocation(locationText).includes(city)
    ? `${locationText}, ${city}`
    : locationText;
  const params = new URLSearchParams({
    format: "json",
    addressdetails: "0",
    limit: String(limit),
    q: query,
  });

  try {
    const response = await fetchImpl(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "InclusiveSpace-CAT-Agent/1.0",
      },
    });
    if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    const lon = Number(first?.lon);
    const lat = Number(first?.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return {
        locationText,
        coordinates: null,
        confidence: "low",
        source: "nominatim_no_result",
      };
    }

    return {
      locationText: first.display_name || locationText,
      coordinates: [lon, lat],
      confidence: Number(first.importance) > 0.4 ? "high" : "medium",
      source: "nominatim",
    };
  } catch (error) {
    return {
      locationText,
      coordinates: null,
      confidence: "low",
      source: "geocoding_failed",
      error: error.message,
    };
  }
}
