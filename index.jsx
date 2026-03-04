import { React, run } from 'uebersicht';
const { useState } = React;

export const command = 'python3 ~/Library/Application\\ Support/Übersicht/widgets/mets-dashboard.widget/mets.py';
export const refreshFrequency = 15 * 1000;  // Python handles TTL — fast when live, cached when idle

export const className = `
  width: 1200px;
  height: 480px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
  @keyframes livePulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scrollList {
    from { transform: translateY(0); }
    to   { transform: translateY(-50%); }
  }
  input[type=range] {
    -webkit-appearance: none; width: 100%; height: 3px;
    background: rgba(255,255,255,0.18); border-radius: 2px;
    outline: none; cursor: pointer; margin: 4px 0;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 13px; height: 13px;
    border-radius: 50%; background: #fff; cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  }
  .hue-slider {
    background: linear-gradient(to right,
      hsl(0,80%,35%), hsl(45,80%,35%), hsl(90,80%,35%), hsl(135,80%,35%),
      hsl(180,80%,35%), hsl(225,80%,35%), hsl(270,80%,35%), hsl(315,80%,35%), hsl(360,80%,35%)
    ) !important;
  }
  input[type=checkbox] { cursor: pointer; accent-color: #FF5910; }
`;

const ORANGE = '#FF5910';
const GREEN  = '#2ecc71';
const BG     = 'rgba(8,12,24,0.88)';
const SUBTLE = 'rgba(255,255,255,0.62)';
const BORDER = 'rgba(0,45,114,0.7)';

const DEFAULT_CONFIG = {
  bg_opacity: 0.88, border_enabled: true, border_width: 1,
  border_hue: 216,  border_opacity: 0.7,  border_radius: 14, blur: 20,
  font_family: 'sf-pro',
};

const FONTS = {
  'sf-pro':     '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
  'sf-rounded': '"SF Pro Rounded", -apple-system, sans-serif',
  'helvetica':  '"Helvetica Neue", Helvetica, Arial, sans-serif',
  'futura':     'Futura, "Century Gothic", "Trebuchet MS", sans-serif',
  'georgia':    'Georgia, "Times New Roman", serif',
  'menlo':      '"Menlo", "SF Mono", Monaco, "Courier New", monospace',
};

const METS_PY = '~/Library/Application\\ Support/Übersicht/widgets/mets-dashboard.widget/mets.py';

const TEAM_ABBR = {
  'New York Mets': 'NYM',       'New York Yankees': 'NYY',
  'Boston Red Sox': 'BOS',      'Baltimore Orioles': 'BAL',
  'Toronto Blue Jays': 'TOR',   'Tampa Bay Rays': 'TB',
  'Chicago White Sox': 'CWS',   'Cleveland Guardians': 'CLE',
  'Detroit Tigers': 'DET',      'Kansas City Royals': 'KC',
  'Minnesota Twins': 'MIN',     'Houston Astros': 'HOU',
  'Los Angeles Angels': 'LAA',  'Athletics': 'OAK',
  'Seattle Mariners': 'SEA',    'Texas Rangers': 'TEX',
  'Atlanta Braves': 'ATL',      'Chicago Cubs': 'CHC',
  'Cincinnati Reds': 'CIN',     'Milwaukee Brewers': 'MIL',
  'Pittsburgh Pirates': 'PIT',  'St. Louis Cardinals': 'STL',
  'Arizona Diamondbacks': 'ARI','Colorado Rockies': 'COL',
  'Los Angeles Dodgers': 'LAD', 'San Diego Padres': 'SD',
  'San Francisco Giants': 'SF', 'Miami Marlins': 'MIA',
  'Philadelphia Phillies': 'PHI','Washington Nationals': 'WSH',
};

// ESPN CDN abbreviations — most match MLB standard lowercased;
// White Sox is the main exception (espn uses "chw", not "cws")
const TEAM_ESPN_ABBR = {
  121: 'nym', 147: 'nyy', 111: 'bos', 110: 'bal', 141: 'tor',
  139: 'tb',  145: 'chw', 114: 'cle', 116: 'det', 118: 'kc',
  142: 'min', 117: 'hou', 108: 'laa', 133: 'oak', 136: 'sea',
  140: 'tex', 144: 'atl', 112: 'chc', 113: 'cin', 158: 'mil',
  134: 'pit', 138: 'stl', 109: 'ari', 115: 'col', 119: 'lad',
  135: 'sd',  137: 'sf',  146: 'mia', 143: 'phi', 120: 'wsh',
};

const GAME_TYPE = {
  S: { label: 'Spring Training', short: null  },  // panel header already says it; no per-row badge
  R: { label: 'Regular Season',  short: null  },
  D: { label: 'Wild Card',       short: 'WC'  },
  L: { label: 'LCS',             short: 'LCS' },
  W: { label: 'World Series',    short: 'WS'  },
  E: { label: 'Exhibition',      short: 'EX'  },
};

const STATE_ORDER = { Live: 0, Preview: 1, Final: 2 };

// Division lookup (mirrors mets.py TEAM_TO_DIV / DIV_NAMES)
const JS_TEAM_TO_DIV = {
  121:204, 143:204, 144:204, 146:204, 120:204,
  112:205, 138:205, 113:205, 158:205, 134:205,
  119:203, 135:203, 137:203, 115:203, 109:203,
  147:201, 111:201, 141:201, 110:201, 139:201,
  114:202, 145:202, 142:202, 116:202, 118:202,
  117:200, 108:200, 133:200, 136:200, 140:200,
};
const JS_DIV_NAMES = {
  201:'AL East', 202:'AL Central', 200:'AL West',
  203:'NL West',  204:'NL East',   205:'NL Central',
};

// Panel label for each team
const TEAM_ID_LABEL = {
  121: 'NY METS',    143: 'PHILLIES',   144: 'BRAVES',     146: 'MARLINS',   120: 'NATIONALS',
  112: 'CUBS',       138: 'CARDINALS',  113: 'REDS',       158: 'BREWERS',   134: 'PIRATES',
  119: 'DODGERS',    135: 'PADRES',     137: 'GIANTS',     115: 'ROCKIES',   109: 'D-BACKS',
  147: 'YANKEES',    111: 'RED SOX',    141: 'BLUE JAYS',  110: 'ORIOLES',   139: 'RAYS',
  114: 'GUARDIANS',  145: 'WHITE SOX',  142: 'TWINS',      116: 'TIGERS',    118: 'ROYALS',
  117: 'ASTROS',     108: 'ANGELS',     133: 'ATHLETICS',  136: 'MARINERS',  140: 'RANGERS',
};

const abbr         = name => TEAM_ABBR[name] || name.slice(0, 3).toUpperCase();
const gameState    = game => game.status.abstractGameState;
const gameTypeMeta = type => GAME_TYPE[type] || { label: null, short: null };
const teamLogoUrl  = id => `https://a.espncdn.com/i/teamlogos/mlb/500/${TEAM_ESPN_ABBR[id] || 'mlb'}.png`;

// Sort games: Live → Preview → Final, then most-recent within each group
const sortGames = games => [...games].sort((a, b) => {
  const sa = STATE_ORDER[gameState(a)] ?? 3;
  const sb = STATE_ORDER[gameState(b)] ?? 3;
  if (sa !== sb) return sa - sb;
  return (b.gameDate || '').localeCompare(a.gameDate || '');
});

const statusLabel = game => {
  const s = game.status;
  if (gameState(game) === 'Final') return s.statusCode === 'FT' ? 'TIE' : 'FINAL';
  if (gameState(game) === 'Live')  return s.detailedState || 'LIVE';
  const utc = game.gameDate;
  if (!utc) return 'SCHED';
  const d = new Date(utc);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
};

// Builds the live game situation line: ▲ 5th  ·  1–2  ·  2 outs
const inningInfo = game => {
  const ls = game.linescore;
  if (!ls || ls.currentInning == null) return null;
  const arrow = ls.isTopInning ? '▲' : '▼';
  const count = (ls.balls != null && ls.strikes != null) ? `${ls.balls}–${ls.strikes}` : null;
  const outs  = ls.outs  != null ? `${ls.outs} out${ls.outs !== 1 ? 's' : ''}` : null;
  return [`${arrow} ${ls.currentInningOrdinal}`, count, outs].filter(Boolean).join('  ·  ');
};

const formatUpcoming = utcStr => {
  if (!utcStr) return { day: '–', date: '–', time: 'TBD' };
  const d = new Date(utcStr), opts = { timeZone: 'America/New_York' };
  return {
    day:  d.toLocaleDateString('en-US', { ...opts, weekday: 'short' }).toUpperCase(),
    date: d.toLocaleDateString('en-US', { ...opts, month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { ...opts, hour: 'numeric', minute: '2-digit' }),
  };
};

// ── Shared components ─────────────────────────────────────────────────────────

const TeamLogo = ({ teamId, size = 18 }) => (
  <img
    src={teamLogoUrl(teamId)}
    width={size} height={size}
    style={{ objectFit: 'contain', flexShrink: 0, display: 'block' }}
    onError={e => { e.target.style.display = 'none'; }}
  />
);

// Broadcast channel chips — shown for live and upcoming games
const BroadcastChips = ({ game }) => {
  const chips = [...new Map(
    (game.broadcasts || [])
      .filter(b => !b.language || b.language === 'en')
      .map(b => [b.name, b])
  ).values()];
  if (chips.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px', justifyContent: 'center' }}>
      {chips.map(b => (
        <span key={b.name} style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '3px', padding: '2px 7px',
          color: 'rgba(255,255,255,0.78)',
        }}>{b.name}</span>
      ))}
    </div>
  );
};

// ── Up Next block ─────────────────────────────────────────────────────────────

const UpNextBlock = ({ game }) => {
  const { away, home } = game.teams;
  const metsIsAway = away.team.id === 121;
  const opp        = metsIsAway ? home : away;
  const { day, date, time } = formatUpcoming(game.gameDate);
  const venue    = game.venue && game.venue.name;
  const typeMeta = gameTypeMeta(game.gameType);

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '10px', textAlign: 'center', flexShrink: 0 }}>
      <div style={{
        fontSize: '11px', letterSpacing: '1.4px', fontWeight: 700,
        color: SUBTLE, marginBottom: '8px',
      }}>
        UP NEXT
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
        <TeamLogo teamId={opp.team.id} size={29} />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            {day} · {date}
          </div>
          <div style={{ fontSize: '13px', color: SUBTLE, marginTop: '3px' }}>
            {time} ET · {metsIsAway ? '@' : 'vs'} {abbr(opp.team.name)}
          </div>
        </div>
      </div>
      <BroadcastChips game={game} />
    </div>
  );
};

// ── NL East standings ─────────────────────────────────────────────────────────

const StandingsStrip = ({ standings, featuredTeamId }) => {
  if (!standings || standings.length === 0) return null;
  const divName = JS_DIV_NAMES[JS_TEAM_TO_DIV[featuredTeamId]] || 'DIVISION';
  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '8px', marginTop: '6px', flexShrink: 0 }}>
      <div style={{
        fontSize: '11px', letterSpacing: '1.4px', fontWeight: 700,
        color: SUBTLE, marginBottom: '6px',
      }}>
        {divName.toUpperCase()}
      </div>
      {standings.map(tr => {
        const isMets = tr.team.id === featuredTeamId;
        const gb     = tr.gamesBack === '-' ? '—' : tr.gamesBack;
        return (
          <div key={tr.team.id} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '3px 0',
          }}>
            <TeamLogo teamId={tr.team.id} size={17} />
            <span style={{
              fontSize: '13px',
              fontWeight: isMets ? 700 : 400,
              color: isMets ? ORANGE : SUBTLE,
              minWidth: '34px', letterSpacing: '0.2px',
            }}>
              {abbr(tr.team.name)}
            </span>
            <span style={{ fontSize: '12px', color: isMets ? 'rgba(255,255,255,0.85)' : SUBTLE }}>
              {tr.wins}–{tr.losses}
            </span>
            <span style={{ fontSize: '12px', color: SUBTLE, marginLeft: 'auto' }}>
              {gb}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── Full standings components ─────────────────────────────────────────────────

const DivisionSection = ({ name, teams, featuredTeamId }) => (
  <div style={{ marginBottom: '7px' }}>
    <div style={{
      fontSize: '9px', fontWeight: 700, letterSpacing: '1.2px',
      textTransform: 'uppercase', color: SUBTLE, marginBottom: '4px',
    }}>
      {name.replace('NL ', '').replace('AL ', '')}
    </div>
    {teams.map((tr, i) => {
      const isMets = tr.team.id === featuredTeamId;
      const gb     = (tr.gamesBack === '-' || tr.gamesBack === '0.0') ? '—' : tr.gamesBack;
      return (
        <div key={tr.team.id} style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '1.5px 0', lineHeight: 1,
        }}>
          <span style={{ width: '10px', fontSize: '10px', color: SUBTLE, flexShrink: 0, textAlign: 'right' }}>
            {i + 1}
          </span>
          <TeamLogo teamId={tr.team.id} size={14} />
          <span style={{
            flex: 1, fontSize: '13px', fontWeight: isMets ? 700 : 400,
            color: isMets ? ORANGE : '#fff', letterSpacing: '0.1px',
          }}>
            {abbr(tr.team.name)}
          </span>
          <span style={{ fontSize: '12px', color: SUBTLE, marginRight: '3px', fontVariantNumeric: 'tabular-nums' }}>
            {tr.wins}–{tr.losses}
          </span>
          <span style={{ fontSize: '12px', color: SUBTLE, width: '26px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {gb}
          </span>
        </div>
      );
    })}
  </div>
);

const LeagueCol = ({ label, divisions, featuredTeamId }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
    <div style={{
      fontSize: '12px', fontWeight: 700, letterSpacing: '1.2px',
      textTransform: 'uppercase', color: ORANGE, marginBottom: '8px', flexShrink: 0,
    }}>
      {label}
    </div>
    {divisions.map(d => (
      <DivisionSection key={d.id} name={d.name} teams={d.teams} featuredTeamId={featuredTeamId} />
    ))}
  </div>
);

// ── Mets featured card ────────────────────────────────────────────────────────

const MetsCard = ({ game, featuredTeamId }) => {
  const { away, home } = game.teams;
  const metsIsAway = away.team.id === featuredTeamId;
  const mets = metsIsAway ? away : home;
  const opp  = metsIsAway ? home : away;
  const state    = gameState(game);
  const final    = state === 'Final';
  const live     = state === 'Live';
  const hasScore = final || live;
  const tied     = game.status.statusCode === 'FT';
  const metsWon  = final && !tied && mets.isWinner;
  const metsLost = final && !tied && opp.isWinner;

  const badgeBg  = live ? GREEN : tied ? SUBTLE : metsWon ? ORANGE : 'rgba(190,40,40,0.85)';
  const badge    = live ? 'LIVE' : tied ? 'TIE' : metsWon ? 'WIN' : final ? 'LOSS' : null;
  const typeMeta = gameTypeMeta(game.gameType);
  const inning   = live ? inningInfo(game) : null;
  const venue    = game.venue && game.venue.name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* WIN / LOSS / LIVE / TIE badge */}
      {badge && (
        <div style={{
          display: 'inline-block', padding: '3px 11px',
          borderRadius: '4px', fontSize: '12px', fontWeight: 800,
          letterSpacing: '0.8px', background: badgeBg, marginBottom: '12px',
          color: '#fff',
          animation: live ? 'livePulse 2.5s ease-in-out infinite' : 'none',
        }}>{badge}</div>
      )}

      {/* Matchup — [Logo][NYM] [score vs/@ score] [OPP][Logo] */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>

        {/* Featured team: logo LEFT of abbr */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TeamLogo teamId={featuredTeamId} size={22} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: ORANGE }}>
            {TEAM_ESPN_ABBR[featuredTeamId]?.toUpperCase() || '???'}
          </span>
        </div>

        {/* Scores + separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '38px', fontWeight: 900, lineHeight: 1,
            color: metsWon ? ORANGE : metsLost ? SUBTLE : '#fff',
          }}>{hasScore ? mets.score : '–'}</span>
          <span style={{ fontSize: '19px', color: SUBTLE, fontWeight: 300 }}>
            {metsIsAway ? '@' : 'vs'}
          </span>
          <span style={{
            fontSize: '38px', fontWeight: 900, lineHeight: 1,
            color: metsLost ? '#fff' : metsWon ? SUBTLE : '#fff',
          }}>{hasScore ? opp.score : '–'}</span>
        </div>

        {/* Opponent: abbr LEFT of logo (logo on RIGHT) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: SUBTLE }}>{abbr(opp.team.name)}</span>
          <TeamLogo teamId={opp.team.id} size={22} />
        </div>

      </div>

      {/* Live inning line: ▲ 5th  ·  1–2  ·  2 outs */}
      {inning && (
        <div style={{
          fontSize: '14px', fontWeight: 600, color: GREEN,
          marginBottom: '5px', letterSpacing: '0.3px',
        }}>
          {inning}
        </div>
      )}

      {/* Broadcast channels — always visible */}
      <BroadcastChips game={game} />

      {/* Status · series description · venue */}
      <div style={{
        fontSize: '12px', color: SUBTLE, letterSpacing: '0.4px',
        lineHeight: 1.7, marginTop: (live ? 6 : 0), textAlign: 'center',
      }}>
        <div>
          {statusLabel(game)}
          {game.seriesDescription ? ` · ${game.seriesDescription}` : ''}
        </div>
        {venue && <div>{venue}</div>}
      </div>

      {/* Season record */}
      {mets.leagueRecord && (
        <div style={{ fontSize: '12px', color: SUBTLE, marginTop: '3px', marginBottom: '10px', textAlign: 'center' }}>
          {mets.leagueRecord.wins}–{mets.leagueRecord.losses}
        </div>
      )}

    </div>
  );
};

// ── Game row for the league grid ──────────────────────────────────────────────

const GameRow = ({ game }) => {
  const { away, home } = game.teams;
  const final    = gameState(game) === 'Final';
  const live     = gameState(game) === 'Live';
  const hasScore = final || live;
  const tied     = game.status.statusCode === 'FT';

  const nameColor  = side => (final && !tied && side.isWinner) ? '#fff' : SUBTLE;
  const nameWeight = side => (final && !tied && side.isWinner) ? 700 : 400;
  const statusText = live ? (inningInfo(game) || statusLabel(game)) : statusLabel(game);

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '7px 0',
      paddingLeft: live ? '8px' : '2px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      borderLeft: live ? `2px solid ${GREEN}` : '2px solid transparent',
    }}>
      {/* Away: logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1 }}>
        <TeamLogo teamId={away.team.id} size={16} />
        <span style={{ fontSize: '14px', fontWeight: nameWeight(away), color: nameColor(away) }}>
          {abbr(away.team.name)}
        </span>
      </div>

      {/* Score — thin weight, centered */}
      <div style={{
        fontSize: '14px', fontWeight: 300, color: '#fff',
        width: '64px', textAlign: 'center', letterSpacing: '1px',
        flexShrink: 0, fontVariantNumeric: 'tabular-nums',
      }}>
        {hasScore ? `${away.score} – ${home.score}` : '–'}
      </div>

      {/* Home: name + logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '14px', fontWeight: nameWeight(home), color: nameColor(home) }}>
          {abbr(home.team.name)}
        </span>
        <TeamLogo teamId={home.team.id} size={16} />
      </div>

      {/* Status / inning */}
      <div style={{
        fontSize: '14px', letterSpacing: '0.2px',
        color: live ? GREEN : SUBTLE,
        fontWeight: live ? 600 : 400,
        animation: live ? 'livePulse 2.5s ease-in-out infinite' : 'none',
        minWidth: '120px', textAlign: 'right', flexShrink: 0,
        marginLeft: '12px',
      }}>
        {statusText}
      </div>
    </div>
  );
};

// Team nickname (last word, with Red Sox / White Sox exceptions)
const NICKNAME_OVERRIDES = { 'Boston Red Sox': 'Red Sox', 'Chicago White Sox': 'White Sox' };
const nickname = name => NICKNAME_OVERRIDES[name] || name.split(' ').slice(-1)[0];

// ── Mets upcoming schedule ────────────────────────────────────────────────────

const ScheduleGameRow = ({ game, last, teamRecords, featuredTeamId }) => {
  const { away, home } = game.teams;
  const metsIsAway = away.team.id === featuredTeamId;
  const opp        = metsIsAway ? home : away;
  const oppRec     = teamRecords && teamRecords[String(opp.team.id)];
  const typeMeta   = gameTypeMeta(game.gameType);

  const d        = new Date(game.gameDate);
  const tz       = { timeZone: 'America/New_York' };
  const dayAbbr  = d.toLocaleDateString('en-US', { ...tz, weekday: 'short' }).toUpperCase();
  const dayNum   = d.toLocaleDateString('en-US', { ...tz, day: 'numeric' });
  const timeStr  = d.toLocaleTimeString('en-US', { ...tz, hour: 'numeric', minute: '2-digit' });
  const label    = typeMeta.short ? ` · ${typeMeta.short}` : '';

  const chips = [...new Map(
    (game.broadcasts || [])
      .filter(b => !b.language || b.language === 'en')
      .map(b => [b.name, b])
  ).values()];

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '8px 2px',
      borderBottom: last ? 'none' : `1px solid rgba(0,45,114,0.3)`,
      gap: '8px',
    }}>
      {/* Date column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '38px', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {dayAbbr}
        </span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>
          {dayNum}
        </span>
      </div>

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>

        {/* Matchup: @/vs · logo · name · record */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
            {metsIsAway ? '@' : 'vs'}
          </span>
          <TeamLogo teamId={opp.team.id} size={21} />
          <span style={{ fontSize: '17px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
            {nickname(opp.team.name)}
          </span>
          {oppRec && (
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>
              {oppRec.wins}–{oppRec.losses}
            </span>
          )}
        </div>

        {/* Time + broadcast on one line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
            {timeStr} ET{label}
          </span>
          {chips.length > 0 && (
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {chips.map(b => (
                <span key={b.name} style={{
                  fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                  background: 'rgba(0,45,114,0.45)',
                  color: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(0,45,114,0.75)',
                }}>{b.name}</span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ── Monthly mini calendar ─────────────────────────────────────────────────────

const MonthCalendar = ({ scheduleMonth, today }) => {
  const [yr, mo] = (today || '').split('-').map(Number);
  if (!yr || !mo) return null;

  // date string → game object
  const byDate = {};
  (scheduleMonth || []).forEach(g => { byDate[g.date] = g; });

  // Opening Day = first R-type game in the month
  const firstR = (scheduleMonth || []).find(g => g.gameType === 'R');
  const openingDay = firstR ? firstR.date : null;

  // Calendar grid
  const firstDow   = new Date(yr, mo - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const numRows = cells.length / 7;

  const monthLabel = new Date(yr, mo - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Month label */}
      <div style={{
        textAlign: 'center', fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.45)', marginBottom: '5px', flexShrink: 0,
      }}>
        {monthLabel}
      </div>

      {/* Grid: 1 header row + numRows data rows */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: `14px repeat(${numRows}, 1fr)`,
        flex: 1,
        gap: '1px',
      }}>
        {/* Day-of-week headers */}
        {DOW.map(d => (
          <div key={d} style={{
            fontSize: '8px', fontWeight: 600, textAlign: 'center',
            color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em', alignSelf: 'center',
          }}>{d}</div>
        ))}

        {/* Calendar cells */}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const pad    = n => String(n).padStart(2, '0');
          const ds     = `${yr}-${pad(mo)}-${pad(day)}`;
          const game   = byDate[ds];
          const isToday    = ds === today;
          const isOpening  = ds === openingDay;

          let bg     = 'transparent';
          let border = 'none';
          if (isToday) {
            bg     = 'rgba(255,89,16,0.12)';
            border = '1px solid rgba(255,89,16,0.35)';
          } else if (isOpening) {
            bg     = 'rgba(255,215,0,0.08)';
            border = '1px solid rgba(255,215,0,0.3)';
          } else if (game?.result === 'W') {
            bg = 'rgba(46,204,113,0.06)';
          }

          const numColor  = isToday ? ORANGE : isOpening ? '#FFD700' : game ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)';
          const numWeight = (isToday || isOpening) ? 700 : 400;

          const wlColor = game?.result === 'W' ? '#4ade80'
                        : game?.result === 'L' ? 'rgba(255,89,16,0.85)'
                        : SUBTLE;

          return (
            <div key={ds} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'flex-start', paddingTop: '2px', gap: '1px',
              borderRadius: '3px', minHeight: 0,
              background: bg, border,
            }}>
              <span style={{ fontSize: '8px', color: numColor, fontWeight: numWeight, lineHeight: 1 }}>
                {day}
              </span>
              {game && <TeamLogo teamId={game.oppTeamId} size={17} />}
              {game?.result && (
                <span style={{ fontSize: '7px', fontWeight: 800, lineHeight: 1, color: wlColor }}>
                  {game.result}
                </span>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

// ── Live game row (compact 2-line layout for the in-progress column) ──────────

const LiveGameRow = ({ game }) => {
  const { away, home } = game.teams;
  const inning = inningInfo(game) || statusLabel(game);
  return (
    <div style={{
      padding: '8px 0 8px 8px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      borderLeft: `2px solid ${GREEN}`,
    }}>
      {/* Team / score line */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
          <TeamLogo teamId={away.team.id} size={16} />
          <span style={{ fontSize: '14px', fontWeight: 400, color: SUBTLE }}>
            {abbr(away.team.name)}
          </span>
        </div>
        <div style={{
          fontSize: '14px', fontWeight: 300, color: '#fff',
          width: '50px', textAlign: 'center',
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>
          {away.score} – {home.score}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '14px', fontWeight: 400, color: SUBTLE }}>
            {abbr(home.team.name)}
          </span>
          <TeamLogo teamId={home.team.id} size={16} />
        </div>
      </div>
      {/* Inning line */}
      <div style={{
        fontSize: '12px', color: GREEN, fontWeight: 600,
        marginTop: '3px', letterSpacing: '0.3px',
        animation: 'livePulse 2.5s ease-in-out infinite',
        textAlign: 'center',
      }}>
        {inning}
      </div>
    </div>
  );
};

// ── Final game row (winner always left, winner +15% size) ─────────────────────

const FinalGameRow = ({ game }) => {
  const { away, home } = game.teams;
  const tied      = game.status.statusCode === 'FT';
  const flipSides = !tied && home.isWinner;
  const left      = flipSides ? home : away;   // winner (or away if tied)
  const right     = flipSides ? away : home;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Left — winner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
        <TeamLogo teamId={left.team.id} size={tied ? 16 : 18} />
        <span style={{ fontSize: tied ? '14px' : '16px', fontWeight: 700, color: '#fff' }}>
          {abbr(left.team.name)}
        </span>
      </div>

      {/* Score — winner's run total first */}
      <div style={{
        fontSize: '14px', fontWeight: 300, color: '#fff',
        width: '50px', textAlign: 'center',
        fontVariantNumeric: 'tabular-nums', flexShrink: 0,
      }}>
        {left.score} – {right.score}
      </div>

      {/* Right — loser */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '14px', fontWeight: 400, color: SUBTLE }}>
          {abbr(right.team.name)}
        </span>
        <TeamLogo teamId={right.team.id} size={16} />
      </div>
    </div>
  );
};

// ── Scrolling results list ────────────────────────────────────────────────────

const ResultsScroll = ({ games }) => {
  if (games.length === 0) return (
    <div style={{ color: SUBTLE, fontSize: '13px', fontStyle: 'italic' }}>No results yet</div>
  );

  // 3.85s per row — ~10% slower
  const duration = games.length * 3.85;

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <div style={{ animation: `scrollList ${duration}s linear infinite` }}>
        {[...games, ...games].map((g, i) => (
          <FinalGameRow key={`${g.gamePk}-${i}`} game={g} />
        ))}
      </div>
    </div>
  );
};

const LiveGamesScroll = ({ games }) => {
  if (games.length === 0) return null;

  // 4.4s per row — ~10% slower
  const duration = games.length * 4.4;

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <div style={{ animation: `scrollList ${duration}s linear infinite` }}>
        {[...games, ...games].map((g, i) => (
          <LiveGameRow key={`${g.gamePk}-${i}`} game={g} />
        ))}
      </div>
    </div>
  );
};

// ── Settings panel ────────────────────────────────────────────────────────────

const SettingRow = ({ label, value, children }) => (
  <div style={{ marginBottom: '13px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
      <span style={{ fontSize: '11px', color: SUBTLE, letterSpacing: '0.4px' }}>{label}</span>
      <span style={{ fontSize: '11px', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
    {children}
  </div>
);

const SettingSection = ({ children }) => (
  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px', color: SUBTLE, marginBottom: '10px', marginTop: '14px' }}>
    {children}
  </div>
);

const SettingsPanel = ({ cfg, onUpdate, onClose }) => {
  const [local, setLocal] = useState({ ...cfg });

  const update = (key, val) => {
    const next = { ...local, [key]: val };
    setLocal(next);
    onUpdate(next);
  };

  return (
    <div style={{
      position: 'absolute', top: '8px', right: '46px', zIndex: 200,
      width: '320px',
      background: 'rgba(4,8,18,0.97)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.12)',
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)',
      padding: '14px 18px 18px',
      boxShadow: '0 10px 48px rgba(0,0,0,0.75)',
      pointerEvents: 'all',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', color: '#fff' }}>APPEARANCE</div>
        <div onClick={onClose} style={{ cursor: 'pointer', color: SUBTLE, fontSize: '15px', padding: '2px 4px', userSelect: 'none' }}>✕</div>
      </div>

      {/* ── Background ── */}
      <SettingSection>BACKGROUND</SettingSection>
      <SettingRow label="Opacity" value={`${Math.round(local.bg_opacity * 100)}%`}>
        <input type="range" min="0.05" max="1" step="0.01"
          value={local.bg_opacity}
          onChange={e => update('bg_opacity', parseFloat(e.target.value))} />
      </SettingRow>

      {/* ── Border ── */}
      <SettingSection>BORDER</SettingSection>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '13px' }}>
        <input type="checkbox" id="s_border" checked={local.border_enabled}
          onChange={e => update('border_enabled', e.target.checked)} />
        <label htmlFor="s_border" style={{ fontSize: '12px', color: local.border_enabled ? '#fff' : SUBTLE, cursor: 'pointer', userSelect: 'none' }}>
          {local.border_enabled ? 'Visible' : 'Hidden'}
        </label>
      </div>

      {local.border_enabled && (<>
        <SettingRow label="Thickness" value={`${local.border_width}px`}>
          <input type="range" min="0.5" max="4" step="0.5"
            value={local.border_width}
            onChange={e => update('border_width', parseFloat(e.target.value))} />
        </SettingRow>
        <SettingRow label="Color hue" value={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '11px', height: '11px', borderRadius: '3px', flexShrink: 0, background: `hsl(${local.border_hue},80%,35%)`, border: '1px solid rgba(255,255,255,0.2)' }} />
            <span>{local.border_hue}°</span>
          </div>
        }>
          <input type="range" min="0" max="360" step="1" className="hue-slider"
            value={local.border_hue}
            onChange={e => update('border_hue', parseInt(e.target.value))} />
        </SettingRow>
        <SettingRow label="Opacity" value={`${Math.round(local.border_opacity * 100)}%`}>
          <input type="range" min="0.1" max="1" step="0.01"
            value={local.border_opacity}
            onChange={e => update('border_opacity', parseFloat(e.target.value))} />
        </SettingRow>
      </>)}

      {/* ── Panels ── */}
      <SettingSection>PANELS</SettingSection>
      <SettingRow label="Corner radius" value={`${local.border_radius}px`}>
        <input type="range" min="0" max="24" step="1"
          value={local.border_radius}
          onChange={e => update('border_radius', parseInt(e.target.value))} />
      </SettingRow>
      <SettingRow label="Backdrop blur" value={`${local.blur}px`}>
        <input type="range" min="0" max="40" step="1"
          value={local.blur}
          onChange={e => update('blur', parseInt(e.target.value))} />
      </SettingRow>
    </div>
  );
};

// ── Main render ───────────────────────────────────────────────────────────────

const WidgetRoot = ({ output, error }) => {
  const [cfg, setCfg] = useState(null);

  if (error)   return <div style={{ color: 'red', fontFamily: 'monospace' }}>{error}</div>;
  if (!output) return <div style={{ color: SUBTLE, fontFamily: 'sans-serif' }}>Loading…</div>;

  let data;
  try { data = JSON.parse(output); }
  catch (e) { return <div style={{ color: 'red' }}>Parse error</div>; }
  if (data.error) return <div style={{ color: 'red' }}>{data.error}</div>;

  // Local state overrides persisted config; falls back to what Python passed
  const liveCfg = cfg || data.config || DEFAULT_CONFIG;

  const saveConfig = newCfg => {
    setCfg(newCfg);
    const jsonStr = JSON.stringify(newCfg).replace(/'/g, "'\\''");
    run(`python3 ${METS_PY} --write-config '${jsonStr}'`);
  };

  // Derived panel styles from live config
  const panelBorder = liveCfg.border_enabled
    ? `${liveCfg.border_width}px solid hsla(${liveCfg.border_hue},80%,30%,${liveCfg.border_opacity})`
    : 'none';

  const panelStyle = {
    background: `rgba(8,12,24,${liveCfg.bg_opacity})`,
    borderRadius: `${liveCfg.border_radius}px`,
    padding: '14px 16px',
    backdropFilter: `blur(${liveCfg.blur}px)`,
    WebkitBackdropFilter: `blur(${liveCfg.blur}px)`,
    boxShadow: '0 6px 32px rgba(0,0,0,0.5)',
  };

  const featuredTeamId  = liveCfg.featured_team_id    || 121;
  const featuredLabel   = TEAM_ID_LABEL[featuredTeamId] || 'MY TEAM';

  const allMets         = data.mets_games            || [];
  const otherGames      = sortGames(data.other_games  || []);
  const liveGames       = otherGames.filter(g => gameState(g) === 'Live');
  const finalGames      = otherGames.filter(g => gameState(g) === 'Final');
  const metsUpcoming    = data.mets_upcoming          || [];
  const featuredDiv     = data.featured_div_standings || data.nl_east_standings || [];
  const nlStandings     = data.nl_standings           || [];
  const alStandings     = data.al_standings           || [];
  const teamRecords     = data.team_records           || {};
  const scheduleMonth   = data.mets_schedule_month    || [];
  const today           = data.today                  || '';
  const fetchedAt       = data.fetched_at             || null;

  const metsGame = allMets.find(g => gameState(g) === 'Live')
                || allMets.find(g => gameState(g) === 'Final')
                || null;

  const dominantType = otherGames.length > 0
    ? (gameTypeMeta(otherGames[0].gameType).label || 'TODAY')
    : 'TODAY';

  const labelStyle = {
    fontSize: '12px', fontWeight: 700,
    letterSpacing: '1.4px', marginBottom: '12px',
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };

  const timestampStyle = {
    fontSize: '9px', color: 'rgba(255,255,255,0.28)',
    fontWeight: 400, letterSpacing: '0.3px',
  };

  return (
    <div style={{
      display: 'flex', gap: '10px',
      height: '100%',
      fontFamily: FONTS[liveCfg.font_family] || FONTS['sf-pro'],
      color: '#fff',
      WebkitFontSmoothing: 'antialiased',
      position: 'relative',
    }}>

      {/* ── Mets Panel ── */}
      <div style={{
        ...panelStyle,
        width: '280px', flexShrink: 0,
        height: '100%',
        display: 'flex', flexDirection: 'column',
        border: panelBorder,
      }}>
        <div style={{ ...labelStyle, color: ORANGE }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '7px' }}>⬤</span> {featuredLabel}
          </span>
          {fetchedAt && <span style={timestampStyle}>{fetchedAt}</span>}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {metsGame
            ? <MetsCard game={metsGame} featuredTeamId={featuredTeamId} />
            : <div style={{ color: SUBTLE, fontSize: '14px', textAlign: 'center' }}>No recent game</div>
          }
        </div>

        <StandingsStrip standings={featuredDiv} featuredTeamId={featuredTeamId} />
      </div>

      {/* ── Mets Schedule Panel ── */}
      <div style={{
        ...panelStyle,
        width: '280px', flexShrink: 0,
        height: '100%',
        display: 'flex', flexDirection: 'column',
        border: panelBorder,
      }}>
        <div style={{ ...labelStyle, color: ORANGE }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '7px' }}>⬤</span> UPCOMING
          </span>
          {fetchedAt && <span style={timestampStyle}>{fetchedAt}</span>}
        </div>

        {/* Top: 2 upcoming game rows */}
        <div style={{ flexShrink: 0 }}>
          {metsUpcoming.length === 0
            ? <div style={{ color: SUBTLE, fontSize: '13px', fontStyle: 'italic' }}>No upcoming games</div>
            : metsUpcoming.slice(0, 2).map((g, i, arr) => (
                <ScheduleGameRow
                  key={g.gamePk} game={g}
                  last={i === arr.length - 1}
                  teamRecords={teamRecords}
                  featuredTeamId={featuredTeamId}
                />
              ))
          }
        </div>

        {/* Separator */}
        <div style={{ height: '1px', background: BORDER, margin: '8px -16px', flexShrink: 0 }} />

        {/* Bottom: monthly mini calendar */}
        <MonthCalendar scheduleMonth={scheduleMonth} today={today} />
      </div>

      {/* ── In Progress / Results Panel ── */}
      <div style={{
        ...panelStyle,
        width: '260px', flexShrink: 0, height: '100%',
        display: 'flex', flexDirection: 'column',
        border: panelBorder,
      }}>
        <div style={{
          ...labelStyle,
          color: liveGames.length > 0 ? GREEN : SUBTLE,
          animation: liveGames.length > 0 ? 'livePulse 2.5s ease-in-out infinite' : 'none',
        }}>
          <span>{liveGames.length > 0 ? 'IN PROGRESS' : 'RESULTS'}</span>
          {fetchedAt && <span style={{ ...timestampStyle, animation: 'none', color: 'rgba(255,255,255,0.28)' }}>{fetchedAt}</span>}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {liveGames.length > 0
            ? <LiveGamesScroll games={liveGames} />
            : <ResultsScroll games={finalGames} />
          }
        </div>
      </div>

      {/* ── Standings Panel ── */}
      <div style={{
        ...panelStyle,
        flex: 1, height: '100%',
        display: 'flex', flexDirection: 'column',
        border: panelBorder,
      }}>
        <div style={{ ...labelStyle, color: SUBTLE }}>
          <span>MLB · STANDINGS</span>
          {fetchedAt && <span style={timestampStyle}>{fetchedAt}</span>}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '12px', overflow: 'hidden' }}>
          <LeagueCol label="National League" divisions={nlStandings} featuredTeamId={featuredTeamId} />
          <div style={{ width: '1px', background: BORDER, flexShrink: 0 }} />
          <LeagueCol label="American League" divisions={alStandings} featuredTeamId={featuredTeamId} />
        </div>
      </div>

    </div>
  );
};

export const render = (props) => <WidgetRoot {...props} />;
