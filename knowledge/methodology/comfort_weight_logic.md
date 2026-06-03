---
collection: methodology
title: Comfort weight logic
city: null
profile: null
variable_key: null
tags: [methodology, comfort, weights]
---

# Comfort Weight Logic

CAT uses variable sensitivity values to adjust comfort-based walking accessibility. Lower values represent stronger discomfort or lower tolerance for that factor. Higher values represent weaker discomfort or higher tolerance.

The agent should use deterministic profile presets for final values. The LLM may detect a profile, but it should not freely invent walking speed or layer values.

Every suggested variable must be filtered against city availability before being applied.
