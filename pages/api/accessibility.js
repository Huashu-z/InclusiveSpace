// pages/api/accessibility.js
import { Pool } from "pg";

//local postgis service
// const pool = new Pool({
//   user: "incspace",
//   host: "localhost",
//   database: "gis",
//   password: "123456",
//   port: 5432,
// });

const pool = new Pool({
  connectionString: "postgresql://postgres.tcxrvmwzddsyivnfurdx:incspace123456@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) { 
const { lat, lon, time, speed } = req.query;

const walkingTime = parseFloat(time) || 15; // minutes
const walkingSpeed = parseFloat(speed) || 5; // km/h
const maxDistance = (walkingSpeed * 1000 * walkingTime) / 60; // units in meters

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    // Step 1: find the nearest vertex ID to the user
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

    const noiseVariable = parseFloat(req.query.noise) || 1.0;
    const lightVariable = parseFloat(req.query.light) || 1.0;
    const tactileVariable = parseFloat(req.query.tactile) || 1.0;
    const trafficLightVariable = parseFloat(req.query.trafficLight) || 1.0;
    const treeVariable = parseFloat(req.query.tree) || 1.0;
    const temperatureSummerVariable = parseFloat(req.query.temperatureSummer) || 1.0;
    const temperatureWinterVariable = parseFloat(req.query.temperatureWinter) || 1.0;
    const blueinfVariable = parseFloat(req.query.blueinf) || 1.0;
    const greeninfVariable = parseFloat(req.query.greeninf) || 1.0;
    const stationVariable = parseFloat(req.query.station) || 1.0;
    const wcDisabledVariable = parseFloat(req.query.wcDisabled) || 1.0;
    const narrowRoadsVariable = parseFloat(req.query.narrowRoads) || 1.0;
    const rampVariable = parseFloat(req.query.ramp) || 1.0;
    const stairVariable = parseFloat(req.query.stair) || 1.0;
    const elevatorVariable = parseFloat(req.query.elevator) || 1.0;
 
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
          'SELECT gid AS id, source, target, 
            cost / (
              CASE WHEN noise_weight = 0 THEN ' || $3 || ' ELSE 1 END *
              CASE WHEN light_weight = 0 THEN ' || $4 || ' ELSE 1 END *
              CASE WHEN crossing_weight = 1 THEN ' || $5 || ' ELSE 1 END *
              CASE WHEN tactile_weight = 0 THEN ' || $6 || ' ELSE 1 END *
              CASE WHEN tree_weight = 0 THEN ' || $7 || ' ELSE 1 END *
              CASE WHEN temp_weight_s = 1 THEN ' || $8 || ' ELSE 1 END *
              CASE WHEN temp_weight_w = 1 THEN ' || $9 || ' ELSE 1 END *
              CASE WHEN blue_weight = 0 THEN ' || $10 || ' ELSE 1 END *
              CASE WHEN green_weight = 0 THEN ' || $11 || ' ELSE 1 END *
              CASE WHEN station_weight = 0 THEN ' || $12 || ' ELSE 1 END *
              CASE WHEN wc_d_weight = 0 THEN ' || $13 || ' ELSE 1 END *
              CASE WHEN path_width_weight = 1 THEN ' || $14 || ' ELSE 1 END *
              CASE WHEN ramp_weight = 0 THEN ' || $15 || ' ELSE 1 END *
              CASE WHEN stair_weight = 1 THEN ' || $16 || ' ELSE 1 END *
              CASE WHEN elevator_weight = 0 THEN ' || $17 || ' ELSE 1 END
            ) AS cost
          FROM ways',
          $1::integer,
          $2::float,
          false::boolean
        )
      )
    `, [startVid, 
        maxDistance, 
        noiseVariable, 
        lightVariable, 
        trafficLightVariable, 
        tactileVariable, 
        treeVariable, 
        temperatureSummerVariable,
        temperatureWinterVariable,
        blueinfVariable,
        greeninfVariable,
        stationVariable,
        wcDisabledVariable,
        narrowRoadsVariable,
        rampVariable,
        stairVariable,
        elevatorVariable]);
      
 
    const geojson = result.rows[0].geojson;
    // res.status(200).json(geojson);
    res.status(200).json({
        roads: result.rows[0].geojson,
        // hull: JSON.parse(hullRes.rows[0].geojson),
      });

  } catch (error) {
    console.error("Error in API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
