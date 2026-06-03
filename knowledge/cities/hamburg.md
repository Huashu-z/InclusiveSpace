---
collection: cities
title: Hamburg data availability
city: hamburg
profile: null
variable_key: null
tags: [city, hamburg, availability]
---

# Hamburg Data Availability

City name: Hamburg.

Available variables: noise, light, tree, trafficLight, tactile_pavement, temperatureSummer, temperatureWinter, greeninf, blueinf, station, wcDisabled, narrowRoads, stair, obstacle, slope, unevenSurface, poorPavement, kerbsHigh, facility, pedestrianFlow.

Unavailable or limited variables: ramp is listed in city configuration but is not currently rendered as a selectable comfort variable in the sidebar. Treat ramp as limited unless a future UI and data layer explicitly support it.

Available map layers: noise_wms, temp_summer, temp_winter, streetlight, trafic_light_wms, tactile_guidance, tree_wms, green_infrastructure_wms, blue_infrastructure_wms, transport_station_wms, wc_disabled, sidewalk_narrow, stair, obstacle, slope, uneven_surfaces, poor_pavement, kerbs_high, facility_wms, pedestrian_flow_wms.

Warnings: Some layers are WMS visualization layers. The agent should not claim precise feature counts or local spatial conditions from RAG. Local spatial facts must come from CAT map state, `/api/accessibility`, or spatial summary tools.
