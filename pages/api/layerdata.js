// pages/api/layerdata.js
// if use Supabase to fetch layer data
import { Pool } from "pg";

const pool = new Pool({
  connectionString: "postgresql://postgres.tcxrvmwzddsyivnfurdx:incspace123456@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  const { layer } = req.query;
  if (!layer) return res.status(400).json({ error: "Missing layer name" });

  try {
    const result = await pool.query(`
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(ST_AsGeoJSON(geom)::json)
      ) as geojson
      FROM ${layer}
    `);

    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
