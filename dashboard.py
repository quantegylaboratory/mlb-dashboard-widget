#!/usr/bin/env python3
import warnings
warnings.filterwarnings("ignore")

import os
import sys
import time
import calendar as cal_module
import requests
import json
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer

METS_TEAM_ID   = 121
NL_EAST_DIV_ID = 204

# Division order: East → Central → West within each league
NL_DIV_IDS = [204, 205, 203]
AL_DIV_IDS = [201, 202, 200]
DIV_NAMES  = {
    201: "AL East", 202: "AL Central", 200: "AL West",
    203: "NL West", 204: "NL East",   205: "NL Central",
}

# Team ID → division ID (all 30 teams)
TEAM_TO_DIV = {
    # NL East
    121: 204, 143: 204, 144: 204, 146: 204, 120: 204,
    # NL Central
    112: 205, 138: 205, 113: 205, 158: 205, 134: 205,
    # NL West
    119: 203, 135: 203, 137: 203, 115: 203, 109: 203,
    # AL East
    147: 201, 111: 201, 141: 201, 110: 201, 139: 201,
    # AL Central
    114: 202, 145: 202, 142: 202, 116: 202, 118: 202,
    # AL West
    117: 200, 108: 200, 133: 200, 136: 200, 140: 200,
}

# Team ID → 3-letter abbreviation
TEAM_ABBRS = {
    121: "NYM", 143: "PHI", 144: "ATL", 146: "MIA", 120: "WSH",
    112: "CHC", 138: "STL", 113: "CIN", 158: "MIL", 134: "PIT",
    119: "LAD", 135: "SD",  137: "SF",  115: "COL", 109: "ARI",
    147: "NYY", 111: "BOS", 141: "TOR", 110: "BAL", 139: "TB",
    114: "CLE", 145: "CWS", 142: "MIN", 116: "DET", 118: "KC",
    117: "HOU", 108: "LAA", 133: "OAK", 136: "SEA", 140: "TEX",
}

CACHE_FILE     = "/tmp/mlb_dashboard_cache.json"
CONFIG_FILE    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

DEFAULT_CONFIG = {
    "bg_opacity": 0.88,
    "border_enabled": True,
    "border_width": 1,
    "border_hue": 216,
    "border_opacity": 0.7,
    "border_radius": 14,
    "blur": 20,
    "font_family": "sf-pro",
    "featured_team_id": 121,
    "font_scale": 1.0,
    "text_hue": 0,
    "text_sat": 0,
    "show_featured": True,
    "show_upcoming": True,
    "show_live": True,
    "show_standings": True,
}


def load_config():
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE) as f:
                return {**DEFAULT_CONFIG, **json.load(f)}
    except Exception:
        pass
    return dict(DEFAULT_CONFIG)


# ── Derive featured team from config (used by fetch_all_standings + main body) ─

_boot_cfg        = load_config()
FEATURED_TEAM_ID = int(_boot_cfg.get("featured_team_id", METS_TEAM_ID))
FEATURED_DIV_ID  = TEAM_TO_DIV.get(FEATURED_TEAM_ID, NL_EAST_DIV_ID)
FEATURED_ABBR    = TEAM_ABBRS.get(FEATURED_TEAM_ID, "NYM")


# ── --write-config handler (called from widget settings UI) ───────────────────

if len(sys.argv) == 3 and sys.argv[1] == "--write-config":
    try:
        new_cfg = json.loads(sys.argv[2])
        with open(CONFIG_FILE, "w") as f:
            json.dump(new_cfg, f, indent=2)
        # Clear cache so next refresh picks up new config (e.g. featured team change)
        try:
            os.remove(CACHE_FILE)
        except FileNotFoundError:
            pass
    except Exception:
        pass
    sys.exit(0)


# ── --serve handler (settings UI server on localhost:1986) ────────────────────

if len(sys.argv) == 2 and sys.argv[1] == "--serve":
    WIDGET_DIR   = os.path.dirname(os.path.abspath(__file__))
    SETTINGS_HTML = os.path.join(WIDGET_DIR, "settings.html")
    PORT = 1986

    class SettingsHandler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            pass  # silence request logs

        def _cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self):
            if self.path == "/config":
                body = json.dumps(load_config()).encode()
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", len(body))
                self.end_headers()
                self.wfile.write(body)
            elif self.path in ("/", "/index.html"):
                try:
                    with open(SETTINGS_HTML, "rb") as f:
                        body = f.read()
                    self.send_response(200)
                    self._cors()
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", len(body))
                    self.end_headers()
                    self.wfile.write(body)
                except FileNotFoundError:
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(b"settings.html not found")
            else:
                self.send_response(404)
                self.end_headers()

        def do_POST(self):
            if self.path == "/config":
                length = int(self.headers.get("Content-Length", 0))
                body   = self.rfile.read(length)
                try:
                    new_cfg = json.loads(body)
                    with open(CONFIG_FILE, "w") as f:
                        json.dump(new_cfg, f, indent=2)
                    # Clear cache so next widget refresh picks up new config
                    try:
                        os.remove(CACHE_FILE)
                    except FileNotFoundError:
                        pass
                    self.send_response(200)
                    self._cors()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"ok":true}')
                except Exception as e:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(str(e).encode())
            else:
                self.send_response(404)
                self.end_headers()

    print(f"Mets Widget Settings → http://localhost:{PORT}", flush=True)
    try:
        server = HTTPServer(("127.0.0.1", PORT), SettingsHandler)
        server.serve_forever()
    except OSError as e:
        print(f"Could not start server on port {PORT}: {e}", file=sys.stderr)
        sys.exit(1)


CACHE_TTL_LIVE = 15   # seconds — fast refresh when a game is in progress
CACHE_TTL_IDLE = 60   # seconds — standard refresh otherwise

# ── Cache helpers ─────────────────────────────────────────────────────────────

def load_cache():
    try:
        if os.path.exists(CACHE_FILE):
            age = time.time() - os.path.getmtime(CACHE_FILE)
            with open(CACHE_FILE) as f:
                return json.load(f), age
    except Exception:
        pass
    return None, float("inf")


def save_cache(data):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


# ── API helpers ───────────────────────────────────────────────────────────────

def fetch_games(date_str, hydrate=True):
    params = "&hydrate=linescore,broadcasts" if hydrate else ""
    url = f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={date_str}{params}"
    try:
        resp = requests.get(url, timeout=10)
        dates = resp.json().get("dates", [])
        return dates[0].get("games", []) if dates else []
    except Exception:
        return []


def fetch_all_standings():
    """Return (nl_east, nl_divisions, al_divisions, team_records) from MLB standings API."""
    url = "https://statsapi.mlb.com/api/v1/standings?leagueId=103,104"
    nl_east, nl_divs, al_divs, team_records = [], [], [], {}
    try:
        resp = requests.get(url, timeout=10)
        by_div = {
            rec["division"]["id"]: rec.get("teamRecords", [])
            for rec in resp.json().get("records", [])
            if "division" in rec
        }
        nl_east = by_div.get(FEATURED_DIV_ID, [])
        nl_divs = [{"id": d, "name": DIV_NAMES[d], "teams": by_div.get(d, [])} for d in NL_DIV_IDS]
        al_divs = [{"id": d, "name": DIV_NAMES[d], "teams": by_div.get(d, [])} for d in AL_DIV_IDS]
        for div_teams in by_div.values():
            for tr in div_teams:
                team_records[tr["team"]["id"]] = {
                    "wins": tr["wins"],
                    "losses": tr["losses"],
                }
    except Exception:
        pass
    return nl_east, nl_divs, al_divs, team_records


def fetch_month_schedule(team_id, year, month):
    """Return all games for team_id in the given month, with result info."""
    last_day = cal_module.monthrange(year, month)[1]
    start = f"{year}-{month:02d}-01"
    end   = f"{year}-{month:02d}-{last_day}"
    url = (
        f"https://statsapi.mlb.com/api/v1/schedule"
        f"?sportId=1&teamId={team_id}&startDate={start}&endDate={end}"
        f"&hydrate=linescore"
    )
    games = []
    try:
        resp = requests.get(url, timeout=10)
        for date_entry in resp.json().get("dates", []):
            for g in date_entry.get("games", []):
                away       = g["teams"]["away"]
                home       = g["teams"]["home"]
                is_away    = away["team"]["id"] == team_id
                mets_side  = away if is_away else home
                opp        = home if is_away else away
                state      = g.get("status", {}).get("abstractGameState")
                result     = None
                if state == "Final":
                    tied = g.get("status", {}).get("statusCode") == "FT"
                    if tied:
                        result = "T"
                    elif mets_side.get("isWinner"):
                        result = "W"
                    else:
                        result = "L"
                games.append({
                    "date":       date_entry["date"],
                    "gamePk":     g.get("gamePk"),
                    "oppTeamId":  opp["team"]["id"],
                    "isAway":     is_away,
                    "result":     result,
                    "metsScore":  mets_side.get("score"),
                    "oppScore":   opp.get("score"),
                    "gameType":   g.get("gameType"),
                    "state":      state,
                })
    except Exception:
        pass
    return games


# ── Decide whether to use cache ───────────────────────────────────────────────

cached, cache_age = load_cache()
any_live = cached and any(
    g.get("status", {}).get("abstractGameState") == "Live"
    for g in cached.get("mets_games", []) + cached.get("other_games", [])
)
ttl = CACHE_TTL_LIVE if any_live else CACHE_TTL_IDLE

if cached and cache_age < ttl:
    cached["config"] = load_config()   # always fresh — not cached
    print(json.dumps(cached))
    sys.exit(0)

# ── Fresh fetch ───────────────────────────────────────────────────────────────

now       = datetime.now()
today     = now.strftime("%Y-%m-%d")
yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")

raw = fetch_games(today) + fetch_games(yesterday)
seen, all_games = set(), []
for g in raw:
    pk = g.get("gamePk")
    if pk not in seen:
        seen.add(pk)
        all_games.append(g)
all_games.sort(key=lambda g: g.get("gameDate", ""), reverse=True)

mets_games  = [g for g in all_games if
               g["teams"]["away"]["team"]["id"] == FEATURED_TEAM_ID or
               g["teams"]["home"]["team"]["id"] == FEATURED_TEAM_ID]

other_games = [g for g in all_games if
               g["teams"]["away"]["team"]["id"] != FEATURED_TEAM_ID and
               g["teams"]["home"]["team"]["id"] != FEATURED_TEAM_ID]

# Upcoming featured-team games: today previews first, then look ahead up to 14 days
mets_upcoming = [g for g in mets_games
                 if g.get("status", {}).get("abstractGameState") == "Preview"]

for i in range(1, 15):
    if len(mets_upcoming) >= 2:
        break
    day    = (now + timedelta(days=i)).strftime("%Y-%m-%d")
    future = fetch_games(day, hydrate=True)
    mets_f = [g for g in future if
              g["teams"]["away"]["team"]["id"] == FEATURED_TEAM_ID or
              g["teams"]["home"]["team"]["id"] == FEATURED_TEAM_ID]
    mets_upcoming.extend(mets_f[:2 - len(mets_upcoming)])

hour       = now.strftime("%I").lstrip("0") or "12"
fetched_at = f"{hour}:{now.strftime('%M %p')}"

nl_east, nl_standings, al_standings, team_records = fetch_all_standings()
mets_schedule_month = fetch_month_schedule(FEATURED_TEAM_ID, now.year, now.month)

result = {
    "mets_games":              mets_games,
    "other_games":             other_games,
    "mets_upcoming":           mets_upcoming[:2],
    "featured_div_standings":  nl_east,
    "nl_standings":            nl_standings,
    "al_standings":            al_standings,
    "team_records":            {str(k): v for k, v in team_records.items()},
    "mets_schedule_month":     mets_schedule_month,
    "featured_team_id":        FEATURED_TEAM_ID,
    "featured_team_abbr":      FEATURED_ABBR,
    "fetched_at":              fetched_at,
    "today":                   today,
    "config":                  load_config(),
}

save_cache(result)
print(json.dumps(result))
