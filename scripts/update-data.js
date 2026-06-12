#!/usr/bin/env node
/*
  Update World Cup 2026 data from football-data.org and write:
  - data.json for the browser/Lively to refresh without CORS
  - data.js as initial fallback for file:// or first render

  Required env:
    FOOTBALL_DATA_TOKEN
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const API = "https://api.football-data.org/v4";
const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const COMPETITION = process.env.COMPETITION || "WC";
const SEASON = process.env.SEASON || "2026";
const TIMEZONE = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";

if (!TOKEN) {
  console.error("Missing FOOTBALL_DATA_TOKEN. Add it in GitHub repo Settings > Secrets and variables > Actions.");
  process.exit(1);
}

const FLAG_BY_TLA = {
  ARG: "ar", AUS: "au", AUT: "at", BEL: "be", BIH: "ba", BRA: "br", CAN: "ca", CIV: "ci",
  COL: "co", CPV: "cv", CRO: "hr", CUW: "cw", CZE: "cz", DEN: "dk", ECU: "ec", EGY: "eg",
  ENG: "gb-eng", ESP: "es", FRA: "fr", GER: "de", GHA: "gh", HAI: "ht", IRN: "ir", IRQ: "iq",
  JPN: "jp", KOR: "kr", MAR: "ma", MEX: "mx", NED: "nl", NOR: "no", NZL: "nz", PAN: "pa",
  PAR: "py", POL: "pl", POR: "pt", QAT: "qa", RSA: "za", SCO: "gb-sct", SEN: "sn", SUI: "ch",
  SWE: "se", TUN: "tn", TUR: "tr", URU: "uy", USA: "us", UZB: "uz"
};

async function fdGet(pathname, params = {}) {
  const url = new URL(API + pathname);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: { "X-Auth-Token": TOKEN }
  });

  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`${url} returned non-JSON: ${text.slice(0, 200)}`);
  }

  if (!res.ok || json.error) {
    throw new Error(`${url} failed: ${json.message || json.error || res.status}`);
  }

  return json;
}

function shortCode(name = "") {
  return String(name).replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "TBD";
}

function extractGroup(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/[\s-]+/g, "_").toUpperCase();
  const groupMatch = normalized.match(/GROUP_?([A-L])$/) || normalized.match(/^([A-L])$/);
  return groupMatch ? groupMatch[1] : "";
}

function teamFromApi(team = {}) {
  const code = String(team.tla || team.code || team.id || shortCode(team.shortName || team.name || "TBD"));
  return {
    code,
    name: team.shortName || team.name || code,
    logo: team.crest || team.emblem || team.logo || "",
    flagCode: FLAG_BY_TLA[code] || ""
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

function readScore(score = {}) {
  const fullTime = score.fullTime || {};
  const regularTime = score.regularTime || {};
  return {
    home: scoreValue(fullTime.home, fullTime.homeTeam, regularTime.home, regularTime.homeTeam),
    away: scoreValue(fullTime.away, fullTime.awayTeam, regularTime.away, regularTime.awayTeam)
  };
}

function mapStatus(status) {
  if (status === "FINISHED" || status === "AWARDED") return "FT";
  if (status === "IN_PLAY" || status === "PAUSED" || status === "LIVE") return "LIVE";
  if (status === "TIMED" || status === "SCHEDULED") return "NS";
  if (status === "POSTPONED") return "PP";
  if (status === "SUSPENDED") return "SUSP";
  if (status === "CANCELED" || status === "CANCELLED") return "CANCEL";
  return status || "NS";
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMatches(matchesRes = {}) {
  return (matchesRes.matches || [])
    .map((m) => {
      const homeTeam = teamFromApi(m.homeTeam || {});
      const awayTeam = teamFromApi(m.awayTeam || {});
      const score = readScore(m.score || {});
      return {
        id: String(m.id || `${homeTeam.code}-${awayTeam.code}-${m.utcDate || ""}`),
        group: extractGroup(m.group || m.stage || ""),
        home: homeTeam.code,
        away: awayTeam.code,
        venue: m.venue || "TBA",
        kickoff: m.utcDate,
        status: mapStatus(m.status),
        minute: m.minute ?? null,
        injuryTime: m.injuryTime ?? null,
        homeGoals: score.home,
        awayGoals: score.away,
        duration: m.score?.duration || "REGULAR",
        lastUpdated: m.lastUpdated || null,
        homeTeam,
        awayTeam
      };
    })
    .filter((m) => m.kickoff && m.home && m.away)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
}

function buildGroupsFromFixtures(fixtures) {
  const byGroup = new Map();
  for (const m of fixtures) {
    if (!m.group) continue;
    if (!byGroup.has(m.group)) byGroup.set(m.group, new Map());
    const groupMap = byGroup.get(m.group);
    groupMap.set(m.homeTeam.code, m.homeTeam);
    groupMap.set(m.awayTeam.code, m.awayTeam);
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, teams]) => ({ name, teams: [...teams.values()] }));
}

function normalizeStandings(standingsRes = {}) {
  const standings = {};
  const groups = [];

  for (const standing of standingsRes.standings || []) {
    const groupName = extractGroup(standing.group || standing.stage || "");
    if (!groupName || !Array.isArray(standing.table)) continue;

    const rows = standing.table.map((r) => {
      const team = teamFromApi(r.team || {});
      return {
        team: team.code,
        played: numberOrZero(r.playedGames),
        goalDiff: numberOrZero(r.goalDifference),
        points: numberOrZero(r.points),
        goalsFor: numberOrZero(r.goalsFor)
      };
    });

    standings[groupName] = rows;
    groups.push({
      name: groupName,
      teams: rows.map((r) => {
        const fromRow = standing.table.find((row) => teamFromApi(row.team || {}).code === r.team);
        return teamFromApi(fromRow?.team || { tla: r.team, name: r.team });
      })
    });
  }

  return { standings, groups };
}

function computeStandings(fixtures, groups) {
  const table = {};

  for (const group of groups) {
    table[group.name] = group.teams.map((team) => ({
      team: team.code,
      played: 0,
      goalDiff: 0,
      points: 0,
      goalsFor: 0
    }));
  }

  const findRow = (group, teamCode) => table[group]?.find((row) => String(row.team) === String(teamCode));

  for (const m of fixtures) {
    if (!["FT", "AET", "PEN"].includes(m.status)) continue;
    if (m.homeGoals === null || m.awayGoals === null) continue;

    const home = findRow(m.group, m.home);
    const away = findRow(m.group, m.away);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalDiff += m.homeGoals - m.awayGoals;
    away.goalDiff += m.awayGoals - m.homeGoals;
    home.goalsFor += m.homeGoals;
    away.goalsFor += m.awayGoals;

    if (m.homeGoals > m.awayGoals) home.points += 3;
    else if (m.awayGoals > m.homeGoals) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }

  for (const group of Object.keys(table)) {
    table[group].sort((a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor
    );
  }

  return table;
}

function comparable(data) {
  const copy = JSON.parse(JSON.stringify(data));
  delete copy.updatedAt;
  return copy;
}

function writeData(data) {
  const jsonPath = path.join(ROOT, "data.json");
  const jsPath = path.join(ROOT, "data.js");

  let current = null;
  if (fs.existsSync(jsonPath)) {
    try {
      current = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch (_) {}
  }

  if (current && JSON.stringify(comparable(current)) === JSON.stringify(comparable(data))) {
    console.log("No score/fixture/standing changes. Keeping existing data files.");
    return;
  }

  data.updatedAt = new Date().toISOString();
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(jsonPath, json + "\n", "utf8");
  fs.writeFileSync(jsPath, `window.WC2026_DATA = ${json};\n`, "utf8");
  console.log(`Updated data.json and data.js: ${data.fixtures.length} matches, ${data.groups.length} groups, updatedAt=${data.updatedAt}`);
}

async function main() {
  console.log(`Fetching football-data.org ${COMPETITION} season ${SEASON}...`);

  const matchesRes = await fdGet(`/competitions/${COMPETITION}/matches`, { season: SEASON });
  const fixtures = normalizeMatches(matchesRes);

  if (!fixtures.length) {
    throw new Error(`football-data.org returned 0 matches for ${COMPETITION} season ${SEASON}`);
  }

  let groups = buildGroupsFromFixtures(fixtures);
  let standings = {};

  try {
    const standingsRes = await fdGet(`/competitions/${COMPETITION}/standings`);
    const normalized = normalizeStandings(standingsRes);
    if (Object.keys(normalized.standings).length) standings = normalized.standings;
    if (normalized.groups.length) groups = normalized.groups;
    console.log(`Loaded standings from API: ${Object.keys(standings).length} groups`);
  } catch (err) {
    console.warn(`Could not load standings from API, computing from finished matches: ${err.message}`);
  }

  if (!Object.keys(standings).length) {
    standings = computeStandings(fixtures, groups);
  }

  writeData({
    timezone: TIMEZONE,
    source: "football-data.org via GitHub Actions",
    competition: COMPETITION,
    season: SEASON,
    updatedAt: new Date().toISOString(),
    groups,
    standings,
    fixtures
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
