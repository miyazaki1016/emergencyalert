# JMA source notes

## Confirmed from current JMA documentation

- High-resolution precipitation nowcast is updated every 5 minutes.
- It provides precipitation intensity at 250 m resolution through 30 minutes.
- Forecasts from 35 through 60 minutes are provided at 1 km resolution.
- JMA's information catalogue identifies both analysis and forecast imagery as PNG.
- The public legend uses precipitation-intensity breakpoints 1, 5, 10, 20, 30, 50 and 80 mm/h.

## Not yet promoted to a contract

The internal jmatile path, JSON metadata shape and PNG palette are implementation
details observed on the JMA website. They are isolated inside the JMA provider
so they can be replaced if JMA changes the website.

The numeric legend breakpoints do NOT by themselves prove exact RGB values.
Do not convert an RGB value to a rain class until that palette is verified.

## Product consequence

EmergencyAlert may say what the official JMA series supports. It must not turn
a fetch error, unknown color or missing frame into "no rain" or "safe".


## 2026-09 re-check: official nowcast cadence/resolution

JMA's current help page states that "雨雲の動き" provides:
- through 30 minutes: 5-minute intervals, 250 m grid;
- through 1 hour: 1 km grid.

This supports the 2026 product's use of official successive frames to show
time progression. It does not authorize EmergencyAlert to extrapolate movement
between or beyond JMA frames.

Source: https://www.jma.go.jp/bosai/faq/pc.html
