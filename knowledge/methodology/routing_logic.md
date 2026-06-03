---
collection: methodology
title: Routing logic
city: null
profile: null
variable_key: null
tags: [methodology, routing, pgRouting]
---

# Routing Logic

CAT accessibility analysis is based on the existing GIS and routing workflow. The agent must not invent routing results.

Road network geometry, reachable areas, catchment polygons, and route calculations must stay outside RAG. These spatial outputs should be produced by CAT APIs and GIS tools.

The agent may ask the frontend to run analysis after it proposes walking time, walking speed, enabled variables, layer values, city, and optionally coordinates.
