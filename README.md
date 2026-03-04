# MLB Dashboard · Übersicht Widget

A macOS desktop widget built with [Übersicht](https://tracesof.net/uebersicht/) that displays live MLB scores, standings, and a monthly schedule — focused on any team you choose.

## Features

- **Featured Team panel** — live score or most recent result, inning/count/outs status, broadcast chips, division standings strip, and a monthly schedule calendar
- **Upcoming games** — next two games with opponent, time, and broadcast info
- **In Progress panel** — live games league-wide with real-time inning data; scrolling final scores when no games are live
- **Full standings** — all 6 divisions across NL and AL
- **Settings UI** — pick your featured team, tune opacity, blur, border, corner radius, and font via a local web UI (no clicking on the widget required)

## Requirements

- macOS (tested on Tahoe / macOS 15)
- [Übersicht](https://tracesof.net/uebersicht/) installed
- Python 3 with the `requests` library

```bash
pip3 install requests
```

## Install

1. Clone this repo into your Übersicht widgets folder, naming it exactly `mets-dashboard.widget`:

```bash
cd ~/Library/Application\ Support/Übersicht/widgets/
git clone https://github.com/quantegylaboratory/mlb-dashboard-widget mets-dashboard.widget
```

2. Übersicht picks up the widget automatically. It refreshes every 15 seconds (Python-level caching handles API throttling).

## Settings

Double-click `settings.command` to open the settings UI in your browser at `http://localhost:1986`.

| Setting | Description |
|---------|-------------|
| **Featured Team** | Any of the 30 MLB teams — left panel updates on the next refresh |
| **Background opacity** | Panel translucency |
| **Backdrop blur** | Glassmorphism blur amount |
| **Border** | Toggle on/off, thickness, hue, and opacity |
| **Corner radius** | Panel rounding |
| **Typography** | SF Pro, SF Rounded, Helvetica, Futura, Georgia, or Menlo |

Settings are saved to `config.json` in the widget directory and take effect within 15 seconds.

## Data Sources

- Game data: [MLB Stats API](https://statsapi.mlb.com) — free, no API key required
- Team logos: ESPN CDN

## File Structure

| File | Purpose |
|------|---------|
| `index.jsx` | Übersicht widget — all UI as React-style JSX with inline styles |
| `mets.py` | Python backend — fetches MLB Stats API, prints JSON to stdout; also serves the settings UI on `localhost:1986` |
| `config.json` | Persisted appearance + team settings (created on first save) |
| `settings.html` | Settings web UI served by `mets.py --serve` |
| `settings.command` | Double-click launcher — starts the server and opens your browser |

## Architecture Notes

- Übersicht runs `mets.py` as a shell command on each refresh; stdout JSON is passed into the widget as the `output` prop
- Python-level cache at `/tmp/mets_widget_cache.json` — 15s TTL during live games, 60s otherwise — keeps API calls minimal
- No build step: Übersicht transpiles JSX directly
- All styling is inline CSS-in-JS (Übersicht does not support external stylesheets)

## Color Reference

| Token | Value | Usage |
|-------|-------|-------|
| BLUE | `#002D72` | Panel border default |
| ORANGE | `#FF5910` | Featured team accent, win state |
| BG | `rgba(8,12,24,0.88)` | Panel background |
| SUBTLE | `rgba(255,255,255,0.62)` | Secondary text |
| GREEN | `#2ecc71` | Live game indicators |

## Publishing to the Übersicht Widget Gallery

The [Übersicht widget gallery](https://tracesof.net/uebersicht-widgets/) is community-maintained via GitHub. To submit this widget:

1. Fork [felixhageloh/uebersicht-widgets](https://github.com/felixhageloh/uebersicht-widgets)
2. Add an entry to `widgets.json` in this format:

```json
{
  "name": "MLB Dashboard",
  "description": "Live MLB scores, standings, and schedule for any team. Featured team, upcoming games, league-wide live scores, full standings, and a monthly calendar — with a settings UI to customize appearance and pick your team.",
  "author": "quantegylaboratory",
  "authorUrl": "https://github.com/quantegylaboratory",
  "screenshot": "mlb-dashboard.png",
  "url": "https://github.com/quantegylaboratory/mlb-dashboard-widget"
}
```

3. Add a screenshot (`mlb-dashboard.png`) to the `screenshots/` folder in your fork
4. Open a pull request against `felixhageloh/uebersicht-widgets`

## Repository

**https://github.com/quantegylaboratory/mlb-dashboard-widget**

## License

MIT
