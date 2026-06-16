---
collection: methodology
title: Comfort impact logic
city: null
profile: null
variable_key: null
tags: [methodology, comfort, impact]
---

# Comfort Impact Logic

CAT uses variable sensitivity values to adjust comfort-based walking accessibility. Lower values represent stronger discomfort or lower tolerance for that factor. Higher values represent weaker discomfort or higher tolerance.

The core user choice is the set of environmental comfort factors they care about and how much each factor affects their comfort. The agent may use deterministic profile presets as quick-start templates for typical settings, but it should explain them as presets rather than as a complete representation of the individual user. The LLM must not freely invent walking speed or layer values.

Every suggested variable must be filtered against city availability before being applied.
