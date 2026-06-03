---
collection: methodology
title: RAG data boundary
city: null
profile: null
variable_key: null
tags: [rag, boundary, safety]
---

# RAG Data Boundary

The CAT accessibility agent uses RAG only for textual knowledge and metadata.

Allowed knowledge includes project methodology, user profile definitions, comfort variable explanations, city data availability, FAQ, UI guidance, and map layer metadata such as layer names or availability.

RAG must not contain raw geometry, road network geometries, POI point coordinates, city boundary coordinates, routing result GeoJSON, or catchment area polygons.

Spatial facts must come from the existing CAT Web GIS workflow, including frontend map state, `/api/accessibility`, Turf/PostGIS/pgRouting outputs, and actual result metadata.

The LLM should propose structured actions and explanations. It must not directly manipulate React state, invent map results, or generate raw GeoJSON.
