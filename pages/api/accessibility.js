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
//   const { lat, lon } = req.query;
const { lat, lon, time, speed } = req.query;

const walkingTime = parseFloat(time) || 15; // 分钟
const walkingSpeed = parseFloat(speed) || 5; // km/h
const maxDistance = (walkingSpeed * 1000 * walkingTime) / 60; // 单位：米

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
            $2::float,
            false::boolean
          )
        )
    `, [startVid, maxDistance]);

    const hullRes = await pool.query(`
        SELECT ST_AsGeoJSON(ST_ConcaveHull(ST_Collect(the_geom), 0.3)) AS geojson
        FROM ways
        WHERE gid IN (
          SELECT edge
          FROM pgr_drivingDistance(
            'SELECT gid AS id, source, target, ST_Length(the_geom::geography) AS cost FROM ways',
            $1::integer,
            $2::float,
            false::boolean
          )
        )
    `, [startVid, maxDistance]);     

    const geojson = result.rows[0].geojson;
    // res.status(200).json(geojson);
    res.status(200).json({
        roads: result.rows[0].geojson,
        hull: JSON.parse(hullRes.rows[0].geojson),
      });

  } catch (error) {
    console.error("Error in API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
