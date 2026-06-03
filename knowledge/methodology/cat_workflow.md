---
collection: methodology
title: CAT workflow
city: null
profile: null
variable_key: null
tags: [methodology, workflow]
---

# CAT Workflow

CAT lets users select a city, choose walking time and walking speed, place a start point, enable comfort variables, set variable sensitivity values, and run the existing accessibility analysis.

The accessibility agent should translate natural language into a structured action that updates existing CAT state. It should not create a separate map calculation flow.

Preferred flow: user message, intent detection, RAG retrieval, structured action generation, frontend state update, existing MapComponent analysis flow, then explanation based on actual result metadata.
