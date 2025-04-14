// pages/api/accessibility.js
import { Pool } from "pg";

const pool = new Pool({
  user: "incspace",
  host: "172.25.110.158",
  database: "gis",
  password: "123456",
  port: 5432,
});

export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    // Step 1: 找到离用户最近的顶点 ID
    const nearestVertexResult = await pool.query(`
      SELECT id
      FROM ways_vertices_pgr
      ORDER BY the_geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT 1;
    `, [lon, lat]);

    const startVid = nearestVertexResult.rows[0]?.id;
    if (!startVid) {
      return res.status(404).json({ error: "No nearby vertex found" });
    }

    // Step 2: 使用 pgr_drivingDistance 分析可达边
    const result = await pool.query(`
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(w.the_geom)::json,
            'properties', json_build_object('gid', w.gid)
          )
        )
      ) AS geojson
      FROM ways w
      WHERE gid IN (
        SELECT edge
        FROM pgr_drivingDistance(
          'SELECT gid AS id, source, target, ST_Length(the_geom::geography) AS cost FROM ways',
          $1::integer,
          1250::float,
          false::boolean
        )
      )
    `, [startVid]);

    const geojson = result.rows[0].geojson;
    res.status(200).json(geojson);

  } catch (error) {
    console.error("Error in API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
