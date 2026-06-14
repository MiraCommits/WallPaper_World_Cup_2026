const fs = require("fs/promises");
const path = require("path");

const API = "https://api.football-data.org/v4";
const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const COMPETITION = process.env.COMPETITION || "WC";
const SEASON = process.env.SEASON || "2026";

const OPENFOOTBALL_JSON_URL =
  process.env.OPENFOOTBALL_JSON_URL ||
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

if (!TOKEN) {
  console.error("Missing FOOTBALL_DATA_TOKEN");
  process.exit(1);
}

async function fdGet(endpoint, params = {}) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, value);
    }
  });

  const url = `${API}${endpoint}${qs.toString() ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: {
      "X-Auth-Token": TOKEN,
      Accept: "application/json"
    }
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok || json.error) {
    throw new Error(json.message || json.error || `football-data HTTP ${res.status}`);
  }

  return json;
}

async function fetchOpenFootball() {
  const res = await fetch(`${OPENFOOTBALL_JSON_URL}?t=${Date.now()}`, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`openfootball HTTP ${res.status}`);
  }

  return res.json();
}

function mapStatus(status) {
  if (status === "FINISHED") return "FT";
  if (status === "IN_PLAY" || status === "PAUSED" || status === "LIVE") return "LIVE";
  if (status === "TIMED" || status === "SCHEDULED") return "NS";
  if (status === "POSTPONED") return "PP";
  if (status === "SUSPENDED") return "SUSP";
  if (status === "CANCELED" || status === "CANCELLED") return "CANCEL";
  if (status === "AWARDED") return "FT";
  return status || "NS";
}

function readScore(score = {}) {
  const fullTime = score.fullTime || {};
  const regularTime = score.regularTime || {};

  return {
    home: scoreValue(fullTime.home, fullTime.homeTeam, regularTime.home, regularTime.homeTeam),
    away: scoreValue(fullTime.away, fullTime.awayTeam, regularTime.away, regularTime.awayTeam)
  };
}

function scoreValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }

  return null;
}

function shortCode(name = "") {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "TBD";
}

function teamFromApi(team = {}) {
  const code = String(team.tla || team.code || team.id || shortCode(team.shortName || team.name || "TBD"));

  return {
    code,
    name: team.shortName || team.name || code,
    logo: team.crest || team.emblem || team.logo || "",
    flagCode: ""
  };
}

function extractGroup(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const normalized = raw.replace(/[\s-]+/g, "_").toUpperCase();
  const groupMatch =
    normalized.match(/GROUP_?([A-L])$/) ||
    normalized.match(/^([A-L])$/);

  return groupMatch ? groupMatch[1] : "";
}

function normalizeFootballData(matchesRes = {}) {
  return (matchesRes.matches || [])
    .map((m) => {
      const homeTeam = teamFromApi(m.homeTeam || {});
      const awayTeam = teamFromApi(m.awayTeam || {});
      const score = readScore(m.score);

      return {
        id: String(m.id || `${homeTeam.code}-${awayTeam.code}-${m.utcDate || ""}`),
        group: extractGroup(m.group || ""),
        round: m.stage || m.matchday || "",
        home: homeTeam.code,
        away: awayTeam.code,
        venue: m.venue || "TBA",
        ground: m.venue || "",
        kickoff: m.utcDate,
        status: mapStatus(m.status),
        minute: m.minute ?? null,
        injuryTime: m.injuryTime ?? null,
        homeGoals: score.home,
        awayGoals: score.away,
        duration: m.score?.duration || "REGULAR",
        lastUpdated: m.lastUpdated,
        goals: [],
        homeTeam,
        awayTeam
      };
    })
    .filter((m) => m.kickoff && m.home && m.away);
}

function stripText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

const TEAM_ALIASES = new Map([
  ["south korea", "korea republic"],
  ["korea republic", "korea republic"],
  ["czech republic", "czechia"],
  ["czechia", "czechia"],
  ["usa", "usa"],
  ["united states", "usa"],
  ["bosnia and herzegovina", "bosnia h"],
  ["bosnia herzegovina", "bosnia h"],
  ["bosnia h", "bosnia h"],
  ["ivory coast", "ivory coast"],
  ["cote d ivoire", "ivory coast"],
  ["dr congo", "congo dr"],
  ["congo dr", "congo dr"],
  ["curacao", "curacao"]
]);

function canonicalTeamName(name = "") {
  const key = stripText(name);
  return TEAM_ALIASES.get(key) || key;
}

function sameTeam(a, b) {
  return canonicalTeamName(a) === canonicalTeamName(b);
}

function parseOpenFootballKickoff(match) {
  if (!match.date || !match.time) return null;

  const timeMatch = String(match.time).match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/i);
  if (!timeMatch) return null;

  const [year, month, day] = String(match.date).split("-").map(Number);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const offset = Number(timeMatch[3]);

  if (![year, month, day, hour, minute, offset].every(Number.isFinite)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hour - offset, minute, 0));
}

function normalizeOpenFootballMatches(openData = {}) {
  return (openData.matches || []).map((m) => ({
    ...m,
    groupCode: extractGroup(m.group || ""),
    kickoffDate: parseOpenFootballKickoff(m)
  }));
}

function findOpenFootballMatch(fixture, openMatches) {
  const fixtureDate = new Date(fixture.kickoff);

  return openMatches.find((m) => {
    if (!m.kickoffDate || Number.isNaN(m.kickoffDate.getTime())) return false;

    const timeDiff = Math.abs(m.kickoffDate.getTime() - fixtureDate.getTime());
    const closeEnough = timeDiff <= 6 * 60 * 60 * 1000;

    if (!closeEnough) return false;

    const sameGroup =
      !fixture.group ||
      !m.groupCode ||
      String(fixture.group) === String(m.groupCode);

    const sameOrder =
      sameTeam(fixture.homeTeam?.name || fixture.home, m.team1) &&
      sameTeam(fixture.awayTeam?.name || fixture.away, m.team2);

    const reversedOrder =
      sameTeam(fixture.homeTeam?.name || fixture.home, m.team2) &&
      sameTeam(fixture.awayTeam?.name || fixture.away, m.team1);

    return sameGroup && (sameOrder || reversedOrder);
  });
}

function goalEventsFromOpenFootball(fixture, openMatch) {
  const sameOrder =
    sameTeam(fixture.homeTeam?.name || fixture.home, openMatch.team1) &&
    sameTeam(fixture.awayTeam?.name || fixture.away, openMatch.team2);

  const goalsForHome = sameOrder ? openMatch.goals1 : openMatch.goals2;
  const goalsForAway = sameOrder ? openMatch.goals2 : openMatch.goals1;

  const homeGoals = Array.isArray(goalsForHome) ? goalsForHome : [];
  const awayGoals = Array.isArray(goalsForAway) ? goalsForAway : [];

  return [
    ...homeGoals.map((g) => ({
      team: fixture.home,
      side: "home",
      name: g.name || "",
      minute: String(g.minute || ""),
      penalty: Boolean(g.penalty),
      ownGoal: Boolean(g.owngoal)
    })),
    ...awayGoals.map((g) => ({
      team: fixture.away,
      side: "away",
      name: g.name || "",
      minute: String(g.minute || ""),
      penalty: Boolean(g.penalty),
      ownGoal: Boolean(g.owngoal)
    }))
  ];
}

function mergeOpenFootball(fixtures, openData) {
  const openMatches = normalizeOpenFootballMatches(openData);

  return fixtures.map((fixture) => {
    const openMatch = findOpenFootballMatch(fixture, openMatches);
    if (!openMatch) return fixture;

    const ft = openMatch.score?.ft;
    const hasOpenScore = Array.isArray(ft) && ft.length >= 2;

    const sameOrder =
      sameTeam(fixture.homeTeam?.name || fixture.home, openMatch.team1) &&
      sameTeam(fixture.awayTeam?.name || fixture.away, openMatch.team2);

    const openHomeGoals = hasOpenScore ? Number(sameOrder ? ft[0] : ft[1]) : null;
    const openAwayGoals = hasOpenScore ? Number(sameOrder ? ft[1] : ft[0]) : null;

    const shouldUseOpenScore =
      hasOpenScore &&
      (fixture.homeGoals === null ||
        fixture.homeGoals === undefined ||
        fixture.awayGoals === null ||
        fixture.awayGoals === undefined);

    return {
      ...fixture,

      // Ưu tiên ground của openfootball nếu football-data đang TBA.
      venue:
        fixture.venue && fixture.venue !== "TBA"
          ? fixture.venue
          : openMatch.ground || fixture.venue || "TBA",

      ground: openMatch.ground || fixture.ground || fixture.venue || "TBA",
      round: openMatch.round || fixture.round || "",
      openfootballDate: openMatch.date || "",
      openfootballTime: openMatch.time || "",

      homeGoals: shouldUseOpenScore ? openHomeGoals : fixture.homeGoals,
      awayGoals: shouldUseOpenScore ? openAwayGoals : fixture.awayGoals,

      // Nếu openfootball đã có score.ft mà football-data vẫn chưa đổi status,
      // coi là FT để bảng điểm và giao diện hiển thị kết quả.
      status:
        hasOpenScore && fixture.status === "NS"
          ? "FT"
          : fixture.status,

      goals: goalEventsFromOpenFootball(fixture, openMatch),
      sourceExtra: "openfootball"
    };
  });
}

function buildGroupsFromFixtures(fixtures) {
  const byGroup = new Map();

  fixtures.forEach((m) => {
    if (!m.group) return;
    if (!/^[A-L]$/.test(m.group)) return;

    if (!byGroup.has(m.group)) byGroup.set(m.group, new Map());

    const map = byGroup.get(m.group);
    map.set(m.home, m.homeTeam);
    map.set(m.away, m.awayTeam);
  });

  return Array.from(byGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, map]) => ({
      name,
      teams: Array.from(map.values())
    }));
}

function hasScore(m) {
  return (
    m.homeGoals !== null &&
    m.homeGoals !== undefined &&
    m.awayGoals !== null &&
    m.awayGoals !== undefined
  );
}

function isFinishedStatus(status) {
  return ["FT", "AET", "PEN", "AWARDED"].includes(String(status || "").toUpperCase());
}

function computeStandings(fixtures, groups) {
  const table = {};

  groups.forEach((group) => {
    table[group.name] = (group.teams || []).map((team) => ({
      team: team.code,
      played: 0,
      goalDiff: 0,
      points: 0,
      goalsFor: 0
    }));
  });

  const findRow = (group, teamCode) =>
    table[group]?.find((row) => String(row.team) === String(teamCode));

  fixtures.forEach((m) => {
    if (!m.group || !isFinishedStatus(m.status) || !hasScore(m)) return;

    const homeGoals = Number(m.homeGoals);
    const awayGoals = Number(m.awayGoals);

    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;

    const home = findRow(m.group, m.home);
    const away = findRow(m.group, m.away);

    if (!home || !away) return;

    home.played += 1;
    away.played += 1;

    home.goalDiff += homeGoals - awayGoals;
    away.goalDiff += awayGoals - homeGoals;

    home.goalsFor += homeGoals;
    away.goalsFor += awayGoals;

    if (homeGoals > awayGoals) {
      home.points += 3;
    } else if (awayGoals > homeGoals) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  });

  Object.keys(table).forEach((group) => {
    table[group].sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        String(a.team).localeCompare(String(b.team))
    );
  });

  return table;
}

async function main() {
  const matchesRes = await fdGet(`/competitions/${COMPETITION}/matches`, {
    season: SEASON
  });

  const openFootball = await fetchOpenFootball();

  const footballFixtures = normalizeFootballData(matchesRes);
  const fixtures = mergeOpenFootball(footballFixtures, openFootball);

  const groups = buildGroupsFromFixtures(fixtures);
  const standings = computeStandings(fixtures, groups);

  const data = {
    timezone: "Asia/Ho_Chi_Minh",
    source: "football-data.org + openfootball/worldcup.json via GitHub Actions",
    competition: COMPETITION,
    season: SEASON,
    updatedAt: new Date().toISOString(),
    groups,
    standings,
    fixtures
  };

  const root = process.cwd();

  await fs.writeFile(
    path.join(root, "data.json"),
    JSON.stringify(data, null, 2),
    "utf8"
  );

  await fs.writeFile(
    path.join(root, "data.js"),
    `window.WC2026_DATA = ${JSON.stringify(data, null, 2)};\n`,
    "utf8"
  );

  console.log(`Updated data.json with ${fixtures.length} fixtures`);
  console.log("Sources: football-data.org + openfootball");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});