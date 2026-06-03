---
collection: profiles
title: Visually impaired profile
city: null
profile: visually_impaired
variable_key: null
tags: [profile, visual impairment, tactile guidance]
---

# Visually Impaired Profile

Profile name: Visually impaired pedestrian.

Typical walking speed: 4.0 km/h.

Relevant comfort variables: tactile_pavement, light, trafficLight, obstacle, pedestrianFlow.

Recommended variable values:
- tactile_pavement: 0.9
- light: 0.8
- trafficLight: 0.8
- obstacle: 0.4
- pedestrianFlow: 0.5

Explanation: Visually impaired pedestrians may rely on tactile paving, lighting, predictable crossings, and obstacle-free paths. Crowding may make navigation more stressful.

Warnings or limitations: The agent must not claim that tactile guidance exists unless the selected city supports the relevant layer or the result metadata includes it.
