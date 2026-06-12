(function () {
  const fallbackData = window.WC2026_DATA || { groups: [], standings: {}, fixtures: [] };
  const config = window.CONFIG || {};
  const locale = "vi-VN";
  const tz = config.TIMEZONE || fallbackData.timezone || "Asia/Saigon";

  const el = {
    clock: document.querySelector("#clock"),
    dateLine: document.querySelector("#dateLine"),
    groupTabs: document.querySelector("#groupTabs"),
    standings: document.querySelector("#standings"),
    particles: document.querySelector("#particles"),
    fixtures: document.querySelector("#fixtures"),
    fixtureCount: document.querySelector("#fixtureCount"),
    countdownMatch: document.querySelector("#countdownMatch"),
    countdownVenue: document.querySelector("#countdownVenue"),
    days: document.querySelector("#days"),
    hours: document.querySelector("#hours"),
    minutes: document.querySelector("#minutes"),
    seconds: document.querySelector("#seconds")
  };

  const groupPages = [
    { label: "A-D", groups: ["A", "B", "C", "D"] },
    { label: "E-H", groups: ["E", "F", "G", "H"] },
    { label: "I-L", groups: ["I", "J", "K", "L"] }
  ];

  let activePage = 0;
  let data = normalizeLocalData(fallbackData);
  let staticDataLastSignature = "";
  const seenTeams = new Map();

  let teams = buildTeamMap(data);

  const flagStyles = {
    ar: { type: "h", colors: ["#74acdf", "#ffffff", "#74acdf"], mark: "#f6b40e" }, at: { type: "h", colors: ["#ed2939", "#ffffff", "#ed2939"] }, au: { type: "solid", color: "#012169", canton: "#ffffff", stars: "#ffffff" }, ba: { type: "diag", colors: ["#002f6c", "#f7d116"] }, be: { type: "v", colors: ["#000000", "#ffd90c", "#ef3340"] }, br: { type: "diamond", base: "#009b3a", diamond: "#ffdf00", circle: "#002776" }, ca: { type: "v", colors: ["#d52b1e", "#ffffff", "#d52b1e"], mark: "#d52b1e" }, cd: { type: "diag", colors: ["#007fff", "#f7d618", "#ce1021"] }, ch: { type: "cross", base: "#d52b1e", cross: "#ffffff" }, ci: { type: "v", colors: ["#f77f00", "#ffffff", "#009e60"] }, co: { type: "h", colors: ["#fcd116", "#003893", "#ce1126"], weights: [2, 1, 1] }, cv: { type: "h", colors: ["#003893", "#ffffff", "#cf2027", "#ffffff", "#003893"], weights: [4, 1, 1, 1, 3] }, cw: { type: "h", colors: ["#002b7f", "#f9e814", "#002b7f"], weights: [5, 1, 4] }, cz: { type: "chevron", colors: ["#ffffff", "#d7141a"], chevron: "#11457e" }, de: { type: "h", colors: ["#000000", "#dd0000", "#ffce00"] }, dz: { type: "v", colors: ["#006233", "#ffffff"], mark: "#d21034" }, ec: { type: "h", colors: ["#ffdd00", "#034ea2", "#ed1c24"], weights: [2, 1, 1] }, eg: { type: "h", colors: ["#ce1126", "#ffffff", "#000000"], mark: "#c09300" }, es: { type: "h", colors: ["#aa151b", "#f1bf00", "#aa151b"], weights: [1, 2, 1] }, fr: { type: "v", colors: ["#0055a4", "#ffffff", "#ef4135"] }, gb_eng: { type: "england" }, gb_sct: { type: "saltire", base: "#005eb8", cross: "#ffffff" }, gh: { type: "h", colors: ["#ce1126", "#fcd116", "#006b3f"], mark: "#111111" }, ht: { type: "h", colors: ["#00209f", "#d21034"] }, hr: { type: "h", colors: ["#ff0000", "#ffffff", "#171796"], mark: "#ff0000" }, iq: { type: "h", colors: ["#ce1126", "#ffffff", "#000000"], mark: "#007a3d" }, ir: { type: "h", colors: ["#239f40", "#ffffff", "#da0000"], mark: "#da0000" }, jo: { type: "chevron", colors: ["#000000", "#ffffff", "#007a3d"], chevron: "#ce1126" }, jp: { type: "circle", base: "#ffffff", circle: "#bc002d" }, kr: { type: "circle", base: "#ffffff", circle: "#c60c30", lower: "#003478" }, ma: { type: "solid", color: "#c1272d", mark: "#006233" }, mx: { type: "v", colors: ["#006847", "#ffffff", "#ce1126"], mark: "#8c6b2f" }, nl: { type: "h", colors: ["#ae1c28", "#ffffff", "#21468b"] }, no: { type: "nordic", base: "#ba0c2f", cross: "#ffffff", inner: "#00205b" }, nz: { type: "solid", color: "#00247d", stars: "#cc142b" }, pa: { type: "quarters", colors: ["#ffffff", "#d21034", "#005293", "#ffffff"] }, pt: { type: "v", colors: ["#006600", "#ff0000"], weights: [2, 3], mark: "#ffcc00" }, py: { type: "h", colors: ["#d52b1e", "#ffffff", "#0038a8"], mark: "#f6b40e" }, qa: { type: "serrated", colors: ["#ffffff", "#8a1538"] }, sa: { type: "solid", color: "#006c35", mark: "#ffffff" }, se: { type: "nordic", base: "#006aa7", cross: "#fecc00" }, sn: { type: "v", colors: ["#00853f", "#fdef42", "#e31b23"], mark: "#00853f" }, tn: { type: "circle", base: "#e70013", circle: "#ffffff", mark: "#e70013" }, tr: { type: "circle", base: "#e30a17", circle: "#ffffff", mark: "#ffffff" }, uy: { type: "h", colors: ["#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff"], mark: "#fcd116" }, us: { type: "usa" }, uz: { type: "h", colors: ["#1eb6e7", "#ffffff", "#009b3a"], mark: "#ffffff" }, za: { type: "h", colors: ["#de3831", "#ffffff", "#007a4d", "#ffffff", "#002395"], weights: [2, 1, 2, 1, 2] }
  };

  function hasApiKey() {
    return Boolean(
      config.FOOTBALL_DATA_TOKEN &&
      config.FOOTBALL_DATA_TOKEN.trim() !== "" &&
      !String(config.FOOTBALL_DATA_TOKEN).includes("PASTE_")
    );
  }

  function apiBase() {
    return String(config.API_HOST || "https://api.football-data.org/v4").replace(/\/$/, "");
  }

  function usesLocalProxy() {
    return apiBase().startsWith("/api") || apiBase().startsWith("http://localhost") || apiBase().startsWith("http://127.0.0.1");
  }

  function hasApiAccess() {
    return usesLocalProxy() || hasApiKey();
  }

  async function fdGet(path, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") qs.set(key, value);
    });

    const url = `${apiBase()}${path}${qs.toString() ? `?${qs}` : ""}`;
    const headers = {};

    // Khi chạy trực tiếp từ file index.html thì cần token ở browser.
    // Khi chạy qua server.js local proxy thì token nằm ở server, không gửi từ frontend.
    if (!usesLocalProxy()) {
      headers["X-Auth-Token"] = config.FOOTBALL_DATA_TOKEN;
    }

    const res = await fetch(url, { headers, cache: "no-store" });
    const text = await res.text();
    let json = {};

    try {
      json = text ? JSON.parse(text) : {};
    } catch (err) {
      throw new Error(`Football-data tra ve du lieu khong phai JSON: ${text.slice(0, 120)}`);
    }

    if (!res.ok || json.error) {
      throw new Error(json.message || json.error || `Football-data HTTP ${res.status}`);
    }

    return json;
  }

  async function loadApiData() {
    if (!hasApiAccess()) {
      console.warn("Chua cau hinh FOOTBALL_DATA_TOKEN hoac local proxy.");
      return;
    }

    const comp = config.COMPETITION || "WC";
    const season = config.SEASON || "2026";
    const dateFrom = config.WORLD_CUP_DATE_FROM || `${season}-06-01`;
    const dateTo = config.WORLD_CUP_DATE_TO || `${season}-07-31`;

    try {
      // Endpoint competition/matches co the mac dinh ve activeSeason cu.
      // Vi vay bat buoc thu season=2026 truoc, sau do thu /matches theo khoang ngay.
      const matchAttempts = [
        // Endpoint nay da tra 104 tran trong test-api.html cua ban.
        { label: `competition season ${season}`, path: `/competitions/${comp}/matches`, params: { season } },
        // Du phong neu football-data.org doi activeSeason.
        { label: `competition active season`, path: `/competitions/${comp}/matches`, params: {} }
      ];

      let matchesRes = null;
      let matchesSource = "";
      let lastMatchError = null;

      for (const attempt of matchAttempts) {
        try {
          const res = await fdGet(attempt.path, attempt.params);
          const count = Array.isArray(res.matches) ? res.matches.length : 0;
          console.log(`football-data matches ${attempt.label}: ${count}`, res);

          // Uu tien endpoint co du lieu. Khong lay ket qua rong de de len fallback.
          if (count > 0) {
            matchesRes = res;
            matchesSource = attempt.label;
            break;
          }

          if (!matchesRes) {
            matchesRes = res;
            matchesSource = `${attempt.label} (empty)`;
          }
        } catch (err) {
          lastMatchError = err;
          console.warn(`Khong lay duoc matches bang ${attempt.label}:`, err);
        }
      }

      if (!matchesRes && lastMatchError) throw lastMatchError;

      // Standings co the loi 404/403 tuy goi API/loai giai dau. Khong de no lam hong ti so.
      let standingsRes = null;
      const standingAttempts = [
        { label: `standings current`, path: `/competitions/${comp}/standings`, params: {} },
        { label: `standings season ${season}`, path: `/competitions/${comp}/standings`, params: { season } }
      ];

      for (const attempt of standingAttempts) {
        try {
          standingsRes = await fdGet(attempt.path, attempt.params);
          console.log(`football-data standings ${attempt.label}:`, standingsRes);
          break;
        } catch (standingErr) {
          console.warn(`Khong lay duoc ${attempt.label}, se tu tinh bang dau tu matches:`, standingErr);
        }
      }

      const normalized = normalizeFootballData(standingsRes || {}, matchesRes || {});

      // Neu API co match thi luon dung API.
      // Ban test duoc count = 104, nen khong duoc de logic "khong co tran sap toi" chan mat du lieu.
      if (!normalized.fixtures.length) {
        console.warn(`API khong tra ve match nao (${matchesSource}). Giu fallback data.js.`, normalized);
        if (config.USE_FALLBACK_DATA) {
          showSoftStatus("API khong co match. Dang hien du lieu fallback trong data.js.");
          return;
        }
      }

      data = normalized;
      teams = buildTeamMap(data);

      console.log(`football-data.org loaded from ${matchesSource}`, data);

      renderTabs();
      renderStandings();
      renderFixtures();
      updateCountdown();
    } catch (err) {
      console.warn("football-data.org load failed:", err);

      if (!config.USE_FALLBACK_DATA) {
        showApiError(err);
      } else {
        showSoftStatus(`Khong lay duoc football-data.org: ${String(err.message || err)}`);
      }
    }
  }

  function hasUsefulFixtures(fixtures) {
    const now = new Date();
    return (fixtures || []).some((m) => {
      const d = new Date(m.kickoff);
      if (!d || Number.isNaN(d.getTime())) return false;
      return isLive(m) || d > now || sameLocalDay(d, now) || hasScore(m);
    });
  }

  function showSoftStatus(message) {
    if (!el.fixtureCount) return;
    el.fixtureCount.textContent = "fallback";
    console.warn(message);
  }

  function normalizeFootballData(standingsRes = {}, matchesRes = {}) {
    const standings = {};
    const groups = [];
    const standingTables = standingsRes.standings || [];

    standingTables.forEach((standing) => {
      const groupName = extractGroup(standing.group || standing.stage || "");
      if (!groupName || !Array.isArray(standing.table)) return;

      const rows = standing.table.map((r) => {
        const team = teamFromApi(r.team || {});
        registerTeam(team);

        return {
          team: team.code,
          played: numberOrZero(r.playedGames),
          goalDiff: numberOrZero(r.goalDifference),
          points: numberOrZero(r.points),
          goalsFor: numberOrZero(r.goalsFor)
        };
      });

      standings[groupName] = rows;
      groups.push({ name: groupName, teams: rows.map((r) => teamByCode(r.team)) });
    });

    const apiFixtures = (matchesRes.matches || []).map((m) => {
      const homeTeam = teamFromApi(m.homeTeam || {});
      const awayTeam = teamFromApi(m.awayTeam || {});
      const score = readScore(m.score);

      registerTeam(homeTeam);
      registerTeam(awayTeam);

      return {
        id: String(m.id || `${homeTeam.code}-${awayTeam.code}-${m.utcDate || ""}`),
        group: extractGroup(m.group || ""),
        home: homeTeam.code,
        away: awayTeam.code,
        venue: m.venue || "TBA",
        kickoff: m.utcDate,
        status: mapFootballDataStatus(m.status),
        minute: m.minute ?? null,
        injuryTime: m.injuryTime ?? null,
        homeGoals: score.home,
        awayGoals: score.away,
        duration: m.score?.duration || "REGULAR",
        lastUpdated: m.lastUpdated,
        homeTeam,
        awayTeam
      };
    }).filter((m) => m.kickoff && m.home && m.away);

    const fixtures = apiFixtures.length ? apiFixtures : data.fixtures;
    const finalGroups = groups.length ? groups : buildGroupsFromFixtures(fixtures, [], data.groups || []);
    const finalStandings = Object.keys(standings).length
      ? standings
      : computeStandingsFromFixtures(fixtures, finalGroups);

    return {
      timezone: tz,
      groups: finalGroups,
      standings: finalStandings,
      fixtures,
      updatedAt: new Date().toISOString()
    };
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

  function readScore(score = {}) {
    const fullTime = score.fullTime || {};
    const regularTime = score.regularTime || {};
    const home = scoreValue(fullTime.home, fullTime.homeTeam, regularTime.home, regularTime.homeTeam);
    const away = scoreValue(fullTime.away, fullTime.awayTeam, regularTime.away, regularTime.awayTeam);
    return { home, away };
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

  function numberOrZero(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function mapFootballDataStatus(status) {
    if (status === "FINISHED") return "FT";
    if (status === "IN_PLAY" || status === "PAUSED" || status === "LIVE") return "LIVE";
    if (status === "TIMED" || status === "SCHEDULED") return "NS";
    if (status === "POSTPONED") return "PP";
    if (status === "SUSPENDED") return "SUSP";
    if (status === "CANCELED" || status === "CANCELLED") return "CANCEL";
    if (status === "AWARDED") return "FT";
    return status || "NS";
  }

  function buildGroupsFromFixtures(fixtures, apiTeams, fallbackGroups) {
    const byGroup = new Map();
    fixtures.forEach((m) => {
      if (!m.group) return;
      const homeTeam = m.homeTeam || teamByCode(m.home);
      const awayTeam = m.awayTeam || teamByCode(m.away);
      if (!homeTeam?.code || !awayTeam?.code) return;
      if (!byGroup.has(m.group)) byGroup.set(m.group, new Map());
      const map = byGroup.get(m.group);
      map.set(String(homeTeam.code), homeTeam);
      map.set(String(awayTeam.code), awayTeam);
    });
    if (byGroup.size) {
      return Array.from(byGroup.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, map]) => ({ name, teams: Array.from(map.values()) }));
    }
    return fallbackGroups.length ? fallbackGroups : [{ name: "A", teams: apiTeams.slice(0, 4) }];
  }

  function computeStandingsFromFixtures(fixtures, groups) {
    const table = {};

    groups.forEach((group) => {
      table[group.name] = group.teams.map((team) => ({
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
      if (!["FT", "AET", "PEN"].includes(m.status)) return;

      const homeGoals = Number(m.homeGoals ?? 0);
      const awayGoals = Number(m.awayGoals ?? 0);

      const home = findRow(m.group, m.home);
      const away = findRow(m.group, m.away);
      if (!home || !away) return;

      home.played++;
      away.played++;

      home.goalDiff += homeGoals - awayGoals;
      away.goalDiff += awayGoals - homeGoals;

      home.goalsFor += homeGoals;
      away.goalsFor += awayGoals;

      if (homeGoals > awayGoals) home.points += 3;
      else if (awayGoals > homeGoals) away.points += 3;
      else {
        home.points += 1;
        away.points += 1;
      }
    });

    Object.keys(table).forEach((group) => {
      table[group].sort(
        (a, b) =>
          b.points - a.points ||
          b.goalDiff - a.goalDiff ||
          b.goalsFor - a.goalsFor
      );
    });

    return table;
  }

  function registerTeam(team) { if (team?.code) seenTeams.set(String(team.code), team); }
  function teamObj(team) {
    const code = String(team.id || team.code || shortCode(team.name));
    return { code, name: team.name || code, logo: team.logo || "", flagCode: team.flagCode || "" };
  }
  function normalizeLocalData(src) { return { ...src, groups: src.groups || [], standings: src.standings || {}, fixtures: src.fixtures || [] }; }
  function buildTeamMap(src) {
    const map = new Map(seenTeams);
    (src.groups || []).forEach((g) => (g.teams || []).forEach((t) => map.set(String(t.code), t)));
    (src.fixtures || []).forEach((m) => { if (m.homeTeam) map.set(String(m.homeTeam.code), m.homeTeam); if (m.awayTeam) map.set(String(m.awayTeam.code), m.awayTeam); });
    return map;
  }
  function shortCode(name = "") { return name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "TBD"; }
  function extractGroup(text = "") {
    const raw = String(text || "").trim();
    if (!raw) return "";

    const normalized = raw.replace(/[\s-]+/g, "_").toUpperCase();
    const groupMatch = normalized.match(/GROUP_?([A-L])$/) || normalized.match(/^([A-L])$/);
    return groupMatch ? groupMatch[1] : "";
  }
  function showApiError(err) { el.fixtures.innerHTML = `<div class="empty-state">Khong lay duoc API: ${String(err.message || err)}</div>`; }

  function fmtDate(date, options) { return new Intl.DateTimeFormat(locale, { timeZone: tz, ...options }).format(date); }
  function fmtKickoff(date) { return fmtDate(date, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  function fixturesWithDates() {
    return (data.fixtures || [])
      .map((m) => ({ ...m, date: new Date(m.kickoff) }))
      .filter((m) => m.date instanceof Date && !Number.isNaN(m.date.getTime()));
  }

  function getUpcomingFixtures(now) {
    const blocked = new Set(["FT", "AET", "PEN", "CANCEL", "PP", "SUSP"]);
    return fixturesWithDates()
      .filter((m) => m.date > now && !blocked.has(m.status))
      .sort((a, b) => a.date - b.date);
  }

  function sameLocalDay(a, b) {
    return fmtDate(a, { year: "numeric", month: "2-digit", day: "2-digit" }) ===
      fmtDate(b, { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function isFinished(m) {
    return ["FT", "AET", "PEN"].includes(m.status);
  }

  function isLive(m) {
    return m.status === "LIVE";
  }

  function hasScore(m) {
    return m.homeGoals !== null && m.homeGoals !== undefined && m.awayGoals !== null && m.awayGoals !== undefined;
  }

  function getRelevantFixtures(now) {
    const recentLimitMs = (config.RECENT_FINISHED_HOURS || 36) * 60 * 60 * 1000;
    return fixturesWithDates()
      .filter((m) =>
        isLive(m) ||
        sameLocalDay(m.date, now) ||
        m.date > now ||
        (isFinished(m) && now - m.date <= recentLimitMs)
      )
      .sort((a, b) => {
        if (isLive(a) !== isLive(b)) return isLive(a) ? -1 : 1;
        if (sameLocalDay(a.date, now) !== sameLocalDay(b.date, now)) return sameLocalDay(a.date, now) ? -1 : 1;
        return a.date - b.date;
      });
  }

  function statusLabel(m) {
    if (isLive(m)) {
      const min = m.minute ? `${m.minute}${m.injuryTime ? `+${m.injuryTime}` : ""}'` : "LIVE";
      return min;
    }
    if (m.status === "FT") return "FT";
    if (m.status === "PP") return "Hoan";
    if (m.status === "CANCEL") return "Huy";
    return "Sap dau";
  }

  function matchCenterText(m) {
    return hasScore(m)
      ? `<span class="score-badge ${isLive(m) ? "is-live" : ""}">${m.homeGoals} - ${m.awayGoals}</span>`
      : `<span class="vs-badge">vs</span>`;
  }
  function teamByCode(code) { return teams.get(String(code)) || { code, name: code, flag: "" }; }
  function shortTeam(code) { const t = teamByCode(code); return String(t.code).length > 4 ? shortCode(t.name) : t.code; }
  function fullTeam(code) { return teamByCode(code).name; }

  function bandRects(colors, vertical = false, weights) { const total = (weights || colors.map(() => 1)).reduce((s, n) => s + n, 0); let offset = 0; return colors.map((color, i) => { const size = ((weights?.[i] || 1) / total) * 100; const rect = vertical ? `<rect x="${offset}%" y="0" width="${size}%" height="100%" fill="${color}"/>` : `<rect x="0" y="${offset}%" width="100%" height="${size}%" fill="${color}"/>`; offset += size; return rect; }).join(""); }
  function flagSvg(s = { type: "solid", color: "#273143" }) { let body = ""; if (s.type === "h") body = bandRects(s.colors, false, s.weights); if (s.type === "v") body = bandRects(s.colors, true, s.weights); if (s.type === "solid") body = `<rect width="120" height="80" fill="${s.color}"/>`; if (s.type === "circle") { body = `<rect width="120" height="80" fill="${s.base}"/><circle cx="60" cy="40" r="20" fill="${s.circle}"/>`; if (s.lower) body += `<path d="M40 40a20 20 0 0 0 40 0z" fill="${s.lower}"/>`; } if (s.type === "diamond") body = `<rect width="120" height="80" fill="${s.base}"/><path d="M60 10 110 40 60 70 10 40z" fill="${s.diamond}"/><circle cx="60" cy="40" r="16" fill="${s.circle}"/>`; if (s.type === "cross") body = `<rect width="120" height="80" fill="${s.base}"/><rect x="50" y="18" width="20" height="44" fill="${s.cross}"/><rect x="38" y="30" width="44" height="20" fill="${s.cross}"/>`; if (s.type === "nordic") body = `<rect width="120" height="80" fill="${s.base}"/><rect x="34" width="14" height="80" fill="${s.cross}"/><rect y="33" width="120" height="14" fill="${s.cross}"/>${s.inner ? `<rect x="38" width="6" height="80" fill="${s.inner}"/><rect y="37" width="120" height="6" fill="${s.inner}"/>` : ""}`; if (s.type === "saltire") body = `<rect width="120" height="80" fill="${s.base}"/><path d="M0 0h18l102 68v12h-18L0 12zM120 0h-18L0 68v12h18L120 12z" fill="${s.cross}"/>`; if (s.type === "england") body = `<rect width="120" height="80" fill="#fff"/><rect x="52" width="16" height="80" fill="#ce1126"/><rect y="32" width="120" height="16" fill="#ce1126"/>`; if (s.type === "chevron") body = `${bandRects(s.colors)}<path d="M0 0 48 40 0 80z" fill="${s.chevron}"/>`; if (s.type === "diag") body = `<rect width="120" height="80" fill="${s.colors[0]}"/><path d="M0 80 120 0v18L18 80z" fill="${s.colors[1]}"/>${s.colors[2] ? `<path d="M0 80 120 0v8L8 80z" fill="${s.colors[2]}"/>` : ""}`; if (s.type === "quarters") body = `<rect width="60" height="40" fill="${s.colors[0]}"/><rect x="60" width="60" height="40" fill="${s.colors[1]}"/><rect y="40" width="60" height="40" fill="${s.colors[2]}"/><rect x="60" y="40" width="60" height="40" fill="${s.colors[3]}"/>`; if (s.type === "serrated") body = `<rect width="120" height="80" fill="${s.colors[1]}"/><path d="M0 0h34l-13 4 13 4-13 4 13 4-13 4 13 4-13 4 13 4-13 4 13 4-13 4 13 4-13 4 13 4-13 4 13 4-13 4 13 4-13 4 13 4H0z" fill="${s.colors[0]}"/>`; if (s.type === "usa") body = `${bandRects(["#b22234", "#fff", "#b22234", "#fff", "#b22234", "#fff", "#b22234", "#fff", "#b22234", "#fff", "#b22234", "#fff", "#b22234"])}<rect width="52" height="43" fill="#3c3b6e"/>`; if (s.canton) body += `<rect width="48" height="34" fill="${s.canton}" opacity="0.92"/>`; if (s.stars) body += `<circle cx="83" cy="24" r="4" fill="${s.stars}"/><circle cx="96" cy="40" r="4" fill="${s.stars}"/><circle cx="79" cy="56" r="4" fill="${s.stars}"/>`; if (s.mark && !["circle", "cross"].includes(s.type)) body += `<circle cx="60" cy="40" r="7" fill="${s.mark}" opacity="0.88"/>`; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">${body}</svg>`; }
  function flagImg(code, className = "flag-img") { const team = teamByCode(code); if (team.logo) return `<img class="${className}" src="${team.logo}" alt="${team.name} logo"/>`; const key = (team.flagCode || "").replace("-", "_"); return `<span class="${className}" role="img" aria-label="${team.name} flag">${flagSvg(flagStyles[key])}</span>`; }
  function defaultRows(group) { return group.teams.map((team) => ({ team: team.code, played: 0, goalDiff: 0, points: 0 })); }

  function renderTabs() { el.groupTabs.innerHTML = groupPages.map((p, i) => `<button class="group-tab ${i === activePage ? "is-active" : ""}" type="button" data-page="${i}">${p.label}</button>`).join(""); el.groupTabs.querySelectorAll(".group-tab").forEach((b) => b.addEventListener("click", () => { activePage = Number(b.dataset.page); renderTabs(); renderStandings(); })); }
  function renderStandings() { const visible = new Set(groupPages[activePage].groups); const groups = data.groups.filter((g) => visible.has(g.name)).map((group) => { const rows = (data.standings[group.name] || defaultRows(group)).slice(0, 4); const teamRows = rows.map((row) => `<div class="team-row"><span class="team">${flagImg(row.team)}<span class="team-name">${teamByCode(row.team).name}</span></span><span>${row.played}</span><span>${row.goalDiff > 0 ? "+" : ""}${row.goalDiff}</span><strong>${row.points}</strong></div>`).join(""); return `<article class="group-card"><div class="group-title">Bang ${group.name}</div><div class="team-head"><span>Doi</span><span>TR</span><span>HS</span><span>D</span></div>${teamRows}</article>`; }).join(""); el.standings.innerHTML = groups || `<div class="empty-state">Dang doi du lieu bang dau...</div>`; }
  // function renderFixtures() {
  //   const now = new Date();
  //   const matches = getRelevantFixtures(now).slice(0, config.MAX_FIXTURES || 8);
  //   const liveCount = matches.filter(isLive).length;
  //   el.fixtureCount.textContent = liveCount ? `${liveCount} LIVE` : `${matches.length} tran`;

  //   el.fixtures.innerHTML = matches.map((m, i) => `
  //     <article class="fixture-card ${isLive(m) ? "is-live" : i === 0 ? "is-next" : ""}">
  //       <div class="fixture-time">
  //         <span>${fmtKickoff(m.date)}</span>
  //         <span class="status-pill ${isLive(m) ? "is-live" : ""}">${statusLabel(m)}</span>
  //       </div>
  //       <div class="fixture-teams">
  //         <strong>${flagImg(m.home, "fixture-flag")}<span>${shortTeam(m.home)}</span></strong>
  //         ${matchCenterText(m)}
  //         <strong>${flagImg(m.away, "fixture-flag")}<span>${shortTeam(m.away)}</span></strong>
  //       </div>
  //       <div class="fixture-names">${fullTeam(m.home)} vs ${fullTeam(m.away)}</div>
  //       <div class="fixture-meta"><span>${m.group ? `Bang ${m.group}` : "World Cup"}</span><span>${m.venue || "TBA"}</span></div>
  //     </article>`).join("") || `<div class="empty-state">Chua co lich / ti so de hien thi</div>`;
  // }

  function isFinishedMatch(m) {
  return ["FT", "FINISHED", "AET", "PEN"].includes(String(m.status).toUpperCase());
}

function isUpcomingMatch(m, now = new Date()) {
  const d = new Date(m.kickoff);
  return d > now && !isFinishedMatch(m);
}

function getSidebarFixtures() {
  const now = new Date();

  const all = (data.fixtures || [])
    .map((m) => ({
      ...m,
      date: new Date(m.kickoff)
    }))
    .filter((m) => !Number.isNaN(m.date.getTime()));

  const finished = all
    .filter((m) => isFinishedMatch(m))
    .sort((a, b) => b.date - a.date)
    .slice(0, 2);

  const upcoming = all
    .filter((m) => isUpcomingMatch(m, now))
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);

  return [...finished, ...upcoming].sort((a, b) => a.date - b.date);
}

function scoreText(m) {
  const hg = m.homeGoals;
  const ag = m.awayGoals;

  if (hg !== null && hg !== undefined && ag !== null && ag !== undefined) {
    return `${hg} - ${ag}`;
  }

  return "VS";
}

function statusLabel(m) {
  if (isFinishedMatch(m)) return "FT";
  if (String(m.status).toUpperCase() === "LIVE") return "LIVE";
  return "SAP DAU";
}

function renderFixtures() {
  const matches = getSidebarFixtures();

  el.fixtureCount.textContent = `${matches.length} tran`;

  el.fixtures.innerHTML = matches.map((m, i) => {
    const isDone = isFinishedMatch(m);
    const score = scoreText(m);

    return `
      <article class="fixture-card ${i === 0 ? "is-next" : ""}">
        <div class="fixture-top">
          <div class="fixture-time">${fmtKickoff(m.date)}</div>
          <div class="fixture-status">${statusLabel(m)}</div>
        </div>

        <div class="fixture-teams">
          <strong>
            ${flagImg(m.home, "fixture-flag")}
            <span>${shortTeam(m.home)}</span>
          </strong>

          <span class="${isDone ? "fixture-score" : "fixture-vs"}">${score}</span>

          <strong>
            ${flagImg(m.away, "fixture-flag")}
            <span>${shortTeam(m.away)}</span>
          </strong>
        </div>

        <div class="fixture-names">${fullTeam(m.home)} vs ${fullTeam(m.away)}</div>

        <div class="fixture-meta">
          <span>${m.group ? `Bang ${m.group}` : "World Cup"}</span>
          <span>${m.venue || "TBA"}</span>
        </div>
      </article>
    `;
  }).join("") || `<div class="empty-state">Chua co du lieu tran dau</div>`;
}
  function updateClock() { const now = new Date(); el.clock.textContent = fmtDate(now, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); el.dateLine.textContent = fmtDate(now, { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); }
  function getFeaturedMatch(now) {
    const dated = fixturesWithDates();
    const live = dated.filter(isLive).sort((a, b) => a.date - b.date)[0];
    if (live) return { match: live, mode: "live" };

    const next = getUpcomingFixtures(now)[0];
    if (next) return { match: next, mode: "next" };

    const finished = dated
      .filter((m) => isFinished(m) || hasScore(m))
      .sort((a, b) => b.date - a.date)[0];
    if (finished) return { match: finished, mode: "recent" };

    return { match: null, mode: "empty" };
  }

  function updateCountdown() {
    const now = new Date();
    const { match, mode } = getFeaturedMatch(now);

    if (!match) {
      el.countdownMatch.textContent = "Dang doi du lieu tran dau";
      el.countdownVenue.textContent = hasApiKey()
        ? `API da ket noi nhung chua co match de hien thi`
        : "Hay dien API_KEY trong config.js";
      ["days", "hours", "minutes", "seconds"].forEach((k) => el[k].textContent = "00");
      return;
    }

    const center = mode === "next"
      ? `<em>vs</em>`
      : `<span class="score-badge ${mode === "live" ? "is-live" : ""}">${hasScore(match) ? `${match.homeGoals} - ${match.awayGoals}` : statusLabel(match)}</span>`;

    el.countdownMatch.innerHTML = `<span>${flagImg(match.home, "countdown-flag")} ${shortTeam(match.home)}</span>${center}<span>${flagImg(match.away, "countdown-flag")} ${shortTeam(match.away)}</span>`;

    const modeText = mode === "live" ? "DANG DA" : mode === "recent" ? "TRAN GAN NHAT" : "TRAN SAP DIEN RA";
    el.countdownVenue.textContent = `${modeText} | ${fmtKickoff(match.date)} | ${match.group ? `Bang ${match.group}` : "World Cup"} | ${match.venue || "TBA"}`;

    if (mode === "next") {
      const diff = Math.max(0, match.date - now);
      const s = Math.floor(diff / 1000);
      el.days.textContent = String(Math.floor(s / 86400)).padStart(2, "0");
      el.hours.textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
      el.minutes.textContent = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      el.seconds.textContent = String(s % 60).padStart(2, "0");
    } else {
      el.days.textContent = "--";
      el.hours.textContent = "--";
      el.minutes.textContent = "--";
      el.seconds.textContent = "--";
    }
  }


  async function loadStaticJsonData() {
    const url = config.DATA_JSON_URL || "./data.json";
    if (!url) return;

    try {
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(`${url}${sep}t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const nextData = await res.json();
      if (!nextData || !Array.isArray(nextData.fixtures)) {
        throw new Error("data.json khong dung dinh dang WC2026_DATA");
      }

      const signature = JSON.stringify({
        updatedAt: nextData.updatedAt,
        groups: (nextData.groups || []).length,
        fixtures: (nextData.fixtures || []).length,
        standings: Object.keys(nextData.standings || {}).length,
        sample: (nextData.fixtures || []).slice(0, 12).map((m) => [
          m.id,
          m.status,
          m.homeGoals,
          m.awayGoals,
          m.lastUpdated
        ])
      });

      if (signature === staticDataLastSignature) return;
      staticDataLastSignature = signature;

      data = normalizeLocalData(nextData);
      teams = buildTeamMap(data);

      console.log("Loaded data.json from GitHub Actions", data.updatedAt, data);
      renderTabs();
      renderStandings();
      renderFixtures();
      updateCountdown();
    } catch (err) {
      console.warn("Khong lay duoc data.json, se dung data.js co san:", err);
    }
  }

  function tick() { updateClock(); updateCountdown(); }
  function renderParticles() { el.particles.innerHTML = Array.from({ length: 42 }, (_, i) => `<span style="--x:${Math.round((i * 37) % 100)}%;--delay:${((i * 0.41) % 8).toFixed(2)}s;--duration:${(7 + (i % 9) * 0.7).toFixed(2)}s;--size:${2 + (i % 3)}px"></span>`).join(""); }

  renderParticles(); renderTabs(); renderStandings(); renderFixtures(); tick();

  if (config.DATA_MODE === "github-actions" || config.DATA_JSON_URL) {
    loadStaticJsonData();
    setInterval(loadStaticJsonData, config.REFRESH_INTERVAL || 300000);
  } else {
    loadApiData();
    setInterval(loadApiData, config.REFRESH_INTERVAL || 900000);
  }

  setInterval(tick, 1000);
  setInterval(renderFixtures, 60000);
})();
