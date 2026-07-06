(function () {
  const fallbackData = window.WC2026_DATA || { groups: [], standings: {}, fixtures: [] };
  const config = window.CONFIG || {};
  const locale = "vi-VN";
  const tz = config.TIMEZONE || fallbackData.timezone || "Asia/Saigon";

  //bg
  const backgroundImages = Array.isArray(config.BACKGROUND_IMAGES)
    ? config.BACKGROUND_IMAGES.filter(Boolean)
    : [];

  const backgroundInterval = config.BACKGROUND_INTERVAL || 30 * 60 * 1000;

  function applyRotatingBackground() {
    if (!backgroundImages.length) return;

    const slot = Math.floor(Date.now() / backgroundInterval);
    const index = slot % backgroundImages.length;
    const image = backgroundImages[index];

    document.documentElement.style.setProperty(
      "--stadium-bg",
      `url("${image}")`
    );

    preloadNextBackground(index);
  }

  function preloadNextBackground(currentIndex) {
    if (backgroundImages.length < 2) return;

    const nextIndex = (currentIndex + 1) % backgroundImages.length;
    const img = new Image();
    img.src = backgroundImages[nextIndex];
  }

  const el = {
    clock: document.querySelector("#clock"),
    dateLine: document.querySelector("#dateLine"),
    groupTabs: document.querySelector("#groupTabs"),
    standings: document.querySelector("#standings"),
    particles: document.querySelector("#particles"),
    knockout: document.querySelector("#knockoutView"),
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
  let openKnockoutCardId = "";

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

      data = withLiveStandings(normalized);
      teams = buildTeamMap(data);

      console.log(`football-data.org loaded from ${matchesSource}`, data);

      renderTabs();
      renderStandings();
      renderFixtures();
      renderKnockout();
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
    const finalStandings = computeStandingsFromFixtures(fixtures, finalGroups);
    // const finalStandings = Object.keys(standings).length
    //   ? standings
    //   : computeStandingsFromFixtures(fixtures, finalGroups);

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

  // function computeStandingsFromFixtures(fixtures, groups) {
  //   const table = {};

  //   groups.forEach((group) => {
  //     table[group.name] = group.teams.map((team) => ({
  //       team: team.code,
  //       played: 0,
  //       goalDiff: 0,
  //       points: 0,
  //       goalsFor: 0
  //     }));
  //   });

  //   const findRow = (group, teamCode) =>
  //     table[group]?.find((row) => String(row.team) === String(teamCode));

  //   fixtures.forEach((m) => {
  //     if (!["FT", "AET", "PEN"].includes(m.status)) return;

  //     const homeGoals = Number(m.homeGoals ?? 0);
  //     const awayGoals = Number(m.awayGoals ?? 0);

  //     const home = findRow(m.group, m.home);
  //     const away = findRow(m.group, m.away);
  //     if (!home || !away) return;

  //     home.played++;
  //     away.played++;

  //     home.goalDiff += homeGoals - awayGoals;
  //     away.goalDiff += awayGoals - homeGoals;

  //     home.goalsFor += homeGoals;
  //     away.goalsFor += awayGoals;

  //     if (homeGoals > awayGoals) home.points += 3;
  //     else if (awayGoals > homeGoals) away.points += 3;
  //     else {
  //       home.points += 1;
  //       away.points += 1;
  //     }
  //   });

  //   Object.keys(table).forEach((group) => {
  //     table[group].sort(
  //       (a, b) =>
  //         b.points - a.points ||
  //         b.goalDiff - a.goalDiff ||
  //         b.goalsFor - a.goalsFor
  //     );
  //   });

  //   return table;
  // }

  function computeStandingsFromFixtures(fixtures, groups) {
    const now = new Date();
    const table = {};

    groups.forEach((group) => {
      table[group.name] = (group.teams || []).map((team) => {
        const code = typeof team === "string" ? team : team.code;

        return {
          team: code,
          played: 0,
          goalDiff: 0,
          points: 0,
          goalsFor: 0
        };
      });
    });

    const findRow = (group, teamCode) =>
      table[group]?.find((row) => String(row.team) === String(teamCode));

    fixtures.forEach((m) => {
      const shouldCount =
        isFinishedMatch(m) ||
        isLive(m, now) ||
        isWaitingResult(m, now);

      if (!shouldCount) return;
      if (!hasScore(m)) return;

      const homeGoals = Number(m.homeGoals);
      const awayGoals = Number(m.awayGoals);

      if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;

      const home = findRow(m.group, m.home);
      const away = findRow(m.group, m.away);

      if (!home || !away) return;

      home.played++;
      away.played++;

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

  function withLiveStandings(src) {
    const fixtures = src.fixtures || [];

    const groups = (src.groups || []).length
      ? src.groups
      : buildGroupsFromFixtures(fixtures, [], []);

    return {
      ...src,
      groups,
      standings: computeStandingsFromFixtures(fixtures, groups)
    };
  }

  function compareStandingRows(a, b) {
    return (
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      String(a.team).localeCompare(String(b.team))
    );
  }

  function getThirdPlaceRace(src = data) {
    const thirds = [];

    (src.groups || []).forEach((group) => {
      const rows = (src.standings[group.name] || defaultRows(group))
        .slice()
        .sort(compareStandingRows);

      const third = rows[2];

      if (third) {
        thirds.push({
          ...third,
          group: group.name
        });
      }
    });

    return thirds.sort(compareStandingRows);
  }

  function getBestThirdPlaceSet(src = data) {
    return new Set(
      getThirdPlaceRace(src)
        .slice(0, 8)
        .map((row) => `${row.group}:${row.team}`)
    );
  }

  function qualificationClass(groupName, row, index, bestThirdSet) {
    const key = `${groupName}:${row.team}`;

    if (index < 2) return "is-qualified";
    if (index === 2 && bestThirdSet.has(key)) return "is-third-qualified";
    if (index === 2) return "is-third-waiting";

    return "is-eliminated";
  }

  function qualificationLabel(groupName, row, index, bestThirdSet) {
    const key = `${groupName}:${row.team}`;

    if (index < 2) return "V32";
    if (index === 2 && bestThirdSet.has(key)) return "3RD";
    if (index === 2) return "3?";
    return "OUT";
  }

  function qualificationTitle(className) {
    if (className === "is-qualified") return "Vào vòng 32: top 2 bảng";
    if (className === "is-third-qualified") return "Tạm vào vòng 32: thuộc 8 đội hạng 3 tốt nhất";
    if (className === "is-third-waiting") return "Hạng 3 nhưng chưa thuộc nhóm 8 đội tốt nhất";
    return "Tạm bị loại";
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


  function teamByCode(code) {
    return teams.get(String(code)) || {
      code: String(code || "TBD"),
      name: String(code || "TBD"),
      logo: "",
      flagCode: ""
    };
  }

  function shortTeam(code) {
    const t = teamByCode(code);
    return String(t.code).length > 4 ? shortCode(t.name) : t.code;
  }

  function fullTeam(code) {
    return teamByCode(code).name;
  }

  function defaultRows(group) {
    return (group.teams || []).map((team) => ({
      team: team.code,
      played: 0,
      goalDiff: 0,
      points: 0,
      goalsFor: 0
    }));
  }

  function flagImg(code, className = "flag-img") {
    const team = teamByCode(code);

    if (team.logo) {
      return `<img class="${className}" src="${team.logo}" alt="${team.name} logo" />`;
    }

    return `
    <span class="${className} flag-fallback" title="${team.name}">
      ${String(team.code || "").slice(0, 3)}
    </span>
  `;
  }

  function renderTabs() { el.groupTabs.innerHTML = groupPages.map((p, i) => `<button class="group-tab ${i === activePage ? "is-active" : ""}" type="button" data-page="${i}">${p.label}</button>`).join(""); el.groupTabs.querySelectorAll(".group-tab").forEach((b) => b.addEventListener("click", () => { activePage = Number(b.dataset.page); renderTabs(); renderStandings(); })); }
  function renderStandings() {
    const visible = new Set(groupPages[activePage].groups);
    const bestThirdSet = getBestThirdPlaceSet(data);

    const groups = data.groups
      .filter((g) => visible.has(g.name))
      .map((group) => {
        const rows = (data.standings[group.name] || defaultRows(group))
          .slice()
          .sort(compareStandingRows)
          .slice(0, 4);

        const teamRows = rows.map((row, index) => {
          const qClass = qualificationClass(group.name, row, index, bestThirdSet);
          const qLabel = qualificationLabel(group.name, row, index, bestThirdSet);
          const qTitle = qualificationTitle(qClass);

          return `
          <div class="team-row ${qClass}" title="${qTitle}">
            <span class="team">
              ${flagImg(row.team)}
              <span class="team-name">${teamByCode(row.team).name}</span>
              <span class="qual-chip ${qClass}">${qLabel}</span>
            </span>
            <span>${row.played}</span>
            <span>${row.goalDiff > 0 ? "+" : ""}${row.goalDiff}</span>
            <strong>${row.points}</strong>
          </div>
        `;
        }).join("");

        return `
        <article class="group-card">
          <div class="group-title">Bảng ${group.name}</div>
          <div class="team-head">
            <span>Đội</span>
            <span>TR</span>
            <span>HS</span>
            <span>D</span>
          </div>
          ${teamRows}
        </article>
      `;
      }).join("");

    el.standings.innerHTML = groups || `<div class="empty-state">Đang đợi dữ liệu bảng đấu...</div>`;
  }

  function getMatchDate(m) {
    return m.date instanceof Date ? m.date : new Date(m.kickoff);
  }

  function matchStatus(m) {
    return String(m.status || "").toUpperCase();
  }

  function isBlockedStatus(m) {
    return ["PP", "POSTPONED", "CANCEL", "CANCELED", "CANCELLED", "SUSP", "SUSPENDED"].includes(matchStatus(m));
  }

  function isFinishedMatch(m) {
    return ["FT", "FINISHED", "AET", "PEN", "AWARDED"].includes(matchStatus(m));
  }

  function isFinished(m) {
    return isFinishedMatch(m);
  }

  function isApiLiveStatus(m) {
    return ["LIVE", "IN_PLAY", "PAUSED", "HALF_TIME", "HT"].includes(matchStatus(m));
  }

  function elapsedSinceKickoffMs(m, now = new Date()) {
    const d = getMatchDate(m);
    if (!d || Number.isNaN(d.getTime())) return null;
    return now - d;
  }

  function isLive(m, now = new Date()) {
    if (isFinishedMatch(m) || isBlockedStatus(m)) return false;
    if (isApiLiveStatus(m)) return true;

    const elapsed = elapsedSinceKickoffMs(m, now);
    if (elapsed === null || elapsed < 0) return false;

    const maxLiveMs = (config.MATCH_INFERRED_LIVE_MINUTES || 115) * 60 * 1000;

    return elapsed <= maxLiveMs;
  }

  function isUpcomingMatch(m, now = new Date()) {
    const d = getMatchDate(m);
    if (!d || Number.isNaN(d.getTime())) return false;

    return d > now && !isFinishedMatch(m) && !isBlockedStatus(m);
  }

  function isWaitingResult(m, now = new Date()) {
    if (isFinishedMatch(m) || isBlockedStatus(m)) return false;
    if (isLive(m, now)) return false;
    if (isUpcomingMatch(m, now)) return false;

    const elapsed = elapsedSinceKickoffMs(m, now);
    if (elapsed === null || elapsed < 0) return false;

    const pendingMs = (config.RESULT_PENDING_HOURS || 4) * 60 * 60 * 1000;

    return elapsed <= pendingMs;
  }

  function hasScore(m) {
    return (
      m.homeGoals !== null &&
      m.homeGoals !== undefined &&
      m.awayGoals !== null &&
      m.awayGoals !== undefined
    );
  }

  function liveMinuteLabel(m) {
    const minute = Number(m.minute);
    const injuryTime = Number(m.injuryTime);

    if (Number.isFinite(minute) && minute > 0) {
      return `${minute}${Number.isFinite(injuryTime) && injuryTime > 0 ? `+${injuryTime}` : ""}'`;
    }

    return "LIVE";
  }

  function statusLabel(m) {
    const now = new Date();
    const status = matchStatus(m);

    if (status === "PP" || status === "POSTPONED") return "Hoãn";
    if (status === "CANCEL" || status === "CANCELED" || status === "CANCELLED") return "Hủy";
    if (isFinishedMatch(m)) return "FT";

    if (isLive(m, now)) return liveMinuteLabel(m);

    if (isWaitingResult(m, now)) return "Chờ KQ";

    return "..."; //Sắp diễn ra
  }

  function scoreText(m) {
    if (hasScore(m)) return `${m.homeGoals} - ${m.awayGoals}`;
    if (isLive(m)) return "LIVE";
    if (isWaitingResult(m)) return "...";
    return "VS";
  }

  function matchCenterText(m) {
    const now = new Date();

    if (hasScore(m)) {
      return `<span class="score-badge ${isLive(m, now) ? "is-live" : ""}">${m.homeGoals} - ${m.awayGoals}</span>`;
    }

    if (isLive(m, now)) {
      return `<span class="score-badge is-live">${liveMinuteLabel(m)}</span>`;
    }

    return `<span class="vs-badge">vs</span>`;
  }

  function uniqueMatches(matches) {
    const map = new Map();

    matches.forEach((m) => {
      const key = String(m.id || `${m.home}-${m.away}-${m.kickoff}`);
      if (!map.has(key)) map.set(key, m);
    });

    return Array.from(map.values());
  }

  // function getSidebarFixtures() {
  //   const now = new Date();
  //   const max = config.MAX_FIXTURES || 6;

  //   const all = fixturesWithDates()
  //     .map((m) => ({
  //       ...m,
  //       date: getMatchDate(m)
  //     }))
  //     .filter((m) => !Number.isNaN(m.date.getTime()));

  //   const live = all
  //     .filter((m) => isLive(m, now))
  //     .sort((a, b) => a.date - b.date);

  //   const finished = all
  //     .filter((m) => isFinishedMatch(m))
  //     .sort((a, b) => b.date - a.date)
  //     .slice(0, 2);

  //   const upcoming = all
  //     .filter((m) => isUpcomingMatch(m, now))
  //     .sort((a, b) => a.date - b.date)
  //     .slice(0, 3);

  //   return uniqueMatches([...finished, ...live, ...upcoming])
  // .sort((a, b) => a.date - b.date)
  // .slice(0, max);
  // }

  function getSidebarFixtures() {
    const now = new Date();
    const max = config.MAX_FIXTURES || 6;

    const all = fixturesWithDates()
      .map((m) => ({
        ...m,
        date: getMatchDate(m)
      }))
      .filter((m) => !Number.isNaN(m.date.getTime()));

    const live = all
      .filter((m) => isLive(m, now))
      .sort((a, b) => a.date - b.date);

    const waiting = all
      .filter((m) => isWaitingResult(m, now))
      .sort((a, b) => a.date - b.date);

    const finished = all
      .filter((m) => isFinishedMatch(m))
      .sort((a, b) => b.date - a.date)
      .slice(0, 2);

    const upcoming = all
      .filter((m) => isUpcomingMatch(m, now))
      .sort((a, b) => a.date - b.date)
      .slice(0, 3);

    return uniqueMatches([...finished, ...live, ...waiting, ...upcoming])
      .sort((a, b) => a.date - b.date)
      .slice(0, max);
  }

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function goalEventParts(goal = {}) {
  const minute = goal.minute ? `${escapeHtml(goal.minute)}'` : "";
  const suffix = goal.penalty ? " (P)" : goal.ownGoal ? " (OG)" : "";
  const name = `${escapeHtml(goal.name || "")}${suffix}`.trim();

  return { minute, name };
}
function renderFixtureFullNames(m) {
  return `
    <div class="fixture-names-grid">
      <div class="fixture-name-col is-home">${escapeHtml(fullTeam(m.home))}</div>
      <div class="fixture-name-vs">vs</div>
      <div class="fixture-name-col is-away">${escapeHtml(fullTeam(m.away))}</div>
    </div>
  `;
}

function renderGoalColumn(goals = [], side = "home") {
  if (!goals.length) {
    return `<div class="fixture-goals-col is-${side}"></div>`;
  }

  return `
    <div class="fixture-goals-col is-${side}">
      ${goals.map((goal) => {
        const { minute, name } = goalEventParts(goal);
        return `
          <div class="goal-line">
            <span class="goal-minute">${minute}</span>
            <span class="goal-player">${name}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderFixtureGoals(m) {
  const goals = Array.isArray(m.goals) ? m.goals : [];
  if (!goals.length) return "";

  const homeGoals = goals.filter(
    (g) => g.side === "home" || String(g.team) === String(m.home)
  );

  const awayGoals = goals.filter(
    (g) => g.side === "away" || String(g.team) === String(m.away)
  );

  if (!homeGoals.length && !awayGoals.length) return "";

  return `
    <div class="fixture-goals-grid">
      ${renderGoalColumn(homeGoals, "home")}
      <div class="fixture-goals-spacer"></div>
      ${renderGoalColumn(awayGoals, "away")}
    </div>
  `;
}


  function renderFixtures() {
    const now = new Date();
    const matches = getSidebarFixtures();

    const liveMatches = matches.filter((m) => isLive(m, now));
    const liveCount = liveMatches.length;

    el.fixtureCount.textContent = liveCount
      ? `${liveCount} LIVE`
      : `${matches.length} trận`;

    const nextUpcoming = matches
      .filter((m) => isUpcomingMatch(m, now))
      .sort((a, b) => a.date - b.date)[0];

    el.fixtures.innerHTML = matches.map((m) => {
      const live = isLive(m, now);
      const done = isFinishedMatch(m);
      const waiting = isWaitingResult(m, now);
      const score = scoreText(m);

      const isNextUpcoming =
        !liveCount &&
        nextUpcoming &&
        String(m.id || m.kickoff) === String(nextUpcoming.id || nextUpcoming.kickoff);

      const stateClass = live
        ? "is-live"
        : isNextUpcoming
          ? "is-next"
          : done
            ? "is-finished"
            : "";

      const centerClass =
        live || done || waiting || hasScore(m)
          ? "fixture-score"
          : "fixture-vs";

      return `
      <article class="fixture-card ${stateClass}">
        <div class="fixture-top">
          <div class="fixture-time">${fmtKickoff(m.date)}</div>
          <div class="fixture-status ${stateClass}">${statusLabel(m)}</div>
        </div>

        <div class="fixture-teams">
          <strong>
            ${flagImg(m.home, "fixture-flag")}
            <span>${shortTeam(m.home)}</span>
          </strong>

          <span class="${centerClass} ${stateClass}">${score}</span>

          <strong>
            ${flagImg(m.away, "fixture-flag")}
            <span>${shortTeam(m.away)}</span>
          </strong>
        </div>

        ${renderFixtureFullNames(m)}
        ${renderFixtureGoals(m)}

        <div class="fixture-meta">
          <span>${m.group ? `Bảng ${m.group}` : "World Cup"}</span>
          <span>${m.ground || m.venue || "TBA"}</span>
        </div>
      </article>
    `;
    }).join("") || `<div class="empty-state">Chưa có dữ liệu trận đấu</div>`;
  }
  const knockoutRounds = [
    { key: "LAST_32", label: "1/16 Final", compact: "1/16", count: 16, visible: false },
    { key: "LAST_16", label: "1/8", compact: "1/8", count: 8, previous: "LAST_32", visible: true },
    { key: "QUARTER_FINALS", label: "Tứ kết", compact: "Tứ kết", count: 4, previous: "LAST_16", visible: true },
    { key: "SEMI_FINALS", label: "Bán kết", compact: "Bán kết", count: 2, previous: "QUARTER_FINALS", visible: true },
    { key: "FINAL", label: "Chung kết", compact: "Chung kết", count: 1, previous: "SEMI_FINALS", visible: true },
    { key: "THIRD_PLACE", label: "Tranh hạng ba", compact: "Tranh hạng ba", count: 1, previous: "SEMI_FINALS", visible: true }
  ];

  const knockoutRoundMeta = new Map(knockoutRounds.map((round) => [round.key, round]));
  const bracketSideRounds = ["LAST_16", "QUARTER_FINALS", "SEMI_FINALS"];
  const visibleFeaturedRoundKeys = new Set([...bracketSideRounds, "FINAL", "THIRD_PLACE"]);

  function normalizeKnockoutRound(value = "") {
    const normalized = String(value || "")
      .trim()
      .replace(/[\s-]+/g, "_")
      .toUpperCase();

    const aliases = {
      LAST_32: "LAST_32",
      ROUND_OF_32: "LAST_32",
      ROUND_32: "LAST_32",
      R32: "LAST_32",
      LAST32: "LAST_32",
      LAST_16: "LAST_16",
      ROUND_OF_16: "LAST_16",
      ROUND_16: "LAST_16",
      R16: "LAST_16",
      LAST16: "LAST_16",
      QUARTER_FINALS: "QUARTER_FINALS",
      QUARTER_FINAL: "QUARTER_FINALS",
      QUARTERS: "QUARTER_FINALS",
      QF: "QUARTER_FINALS",
      SEMI_FINALS: "SEMI_FINALS",
      SEMI_FINAL: "SEMI_FINALS",
      SEMIFINALS: "SEMI_FINALS",
      SF: "SEMI_FINALS",
      THIRD_PLACE: "THIRD_PLACE",
      THIRD_PLACE_PLAYOFF: "THIRD_PLACE",
      THIRD_PLACE_PLAY_OFF: "THIRD_PLACE",
      THIRD: "THIRD_PLACE",
      FINAL: "FINAL"
    };

    return aliases[normalized] || "";
  }

  function makePlaceholderMatch(round, index) {
    return {
      id: `placeholder-${round.key}-${index + 1}`,
      group: "",
      round: round.key,
      home: "TBD",
      away: "TBD",
      venue: "TBA",
      ground: "",
      kickoff: "",
      status: "NS",
      minute: null,
      injuryTime: null,
      homeGoals: null,
      awayGoals: null,
      duration: "REGULAR",
      goals: []
    };
  }

  function asKnockoutMatch(match, round, index) {
    const fallback = makePlaceholderMatch(round, index);
    return {
      ...fallback,
      ...(match || {}),
      round: normalizeKnockoutRound(match?.round || match?.stage || round.key) || round.key,
      date: match ? getMatchDate(match) : null
    };
  }


  function previousWinnerIndexForCode(previousSlots, code) {
    const value = String(code || "");
    if (!isKnownTeamCode(value)) return -1;

    return previousSlots.findIndex((slot) => String(getMatchWinner(slot?.match)) === value);
  }

  function matchSlotFromPreviousRound(match, round, rounds) {
    if (!round?.previous || round.key === "FINAL" || round.key === "THIRD_PLACE") return -1;

    const previousSlots = rounds[round.previous] || [];
    if (!previousSlots.length) return -1;

    const sourceIndexes = [match?.home, match?.away]
      .filter(isKnownTeamCode)
      .map((code) => previousWinnerIndexForCode(previousSlots, code))
      .filter((sourceIndex) => sourceIndex >= 0);

    if (!sourceIndexes.length) return -1;

    const targetIndexes = Array.from(new Set(sourceIndexes.map((sourceIndex) => Math.floor(sourceIndex / 2))));
    if (targetIndexes.length !== 1) return -1;

    const targetIndex = targetIndexes[0];
    return targetIndex >= 0 && targetIndex < round.count ? targetIndex : -1;
  }

  function orderKnockoutMatchesForRound(round, ordered, rounds) {
    const slots = Array.from({ length: round.count }, () => null);
    const used = new Set();

    ordered.forEach((match, orderIndex) => {
      const slotIndex = matchSlotFromPreviousRound(match, round, rounds);
      if (slotIndex < 0 || slots[slotIndex]) return;

      slots[slotIndex] = match;
      used.add(orderIndex);
    });

    ordered.forEach((match, orderIndex) => {
      if (used.has(orderIndex)) return;

      const slotIndex = slots.findIndex((slot) => !slot);
      if (slotIndex < 0) return;

      slots[slotIndex] = match;
    });

    return slots;
  }
  function buildKnockoutBracket(matches) {
    const byRound = new Map();

    (matches || []).forEach((match) => {
      const roundKey = normalizeKnockoutRound(match.round || match.stage || "");
      if (!roundKey) return;
      if (!byRound.has(roundKey)) byRound.set(roundKey, []);
      byRound.get(roundKey).push(match);
    });

    const rounds = {};

    knockoutRounds.forEach((round) => {
      const ordered = (byRound.get(round.key) || [])
        .slice()
        .sort((a, b) => {
          const dateA = getMatchDate(a);
          const dateB = getMatchDate(b);
          const timeA = dateA && !Number.isNaN(dateA.getTime()) ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
          const timeB = dateB && !Number.isNaN(dateB.getTime()) ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
          return timeA - timeB || String(a.id || "").localeCompare(String(b.id || ""));
        });

      const slotted = orderKnockoutMatchesForRound(round, ordered, rounds);

      rounds[round.key] = Array.from({ length: round.count }, (_, index) => ({
        roundKey: round.key,
        index,
        match: asKnockoutMatch(slotted[index], round, index)
      }));
    });

    const nextId = getKnockoutNextId(rounds);
    return { rounds, nextId };
  }

  function isKnownTeamCode(code) {
    const value = String(code || "").trim().toUpperCase();
    return Boolean(value && value !== "TBD" && value !== "TBA" && value !== "BYE" && value !== "-");
  }

  function firstNumber(...values) {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  function getPenaltyScore(match) {
    const home = penaltyScore(match, "home");
    const away = penaltyScore(match, "away");
    return { home, away, has: home !== null && away !== null };
  }

  function penaltyScore(match, side) {
    if (!match) return null;
    return side === "home"
      ? firstNumber(match.homePenalties, match.penaltiesHome, match.penaltyHome, match.score?.penalties?.home, match.score?.penaltyShootout?.home)
      : firstNumber(match.awayPenalties, match.penaltiesAway, match.penaltyAway, match.score?.penalties?.away, match.score?.penaltyShootout?.away);
  }

  function hasPenaltyScore(match) {
    return getPenaltyScore(match).has;
  }

  function hasExtraTime(match) {
    const duration = String(match?.duration || match?.score?.duration || match?.status || "").toUpperCase();
    return duration.includes("EXTRA") || duration.includes("AET");
  }
  function getMatchWinner(match) {
    if (!match) return "";
    if (isKnownTeamCode(match.winner)) return match.winner;
    if (isKnownTeamCode(match.winnerCode)) return match.winnerCode;
    if (!isFinishedMatch(match)) return "";
    if (!hasScore(match)) return "";

    const homeGoals = Number(match.homeGoals);
    const awayGoals = Number(match.awayGoals);
    if (homeGoals > awayGoals) return match.home;
    if (awayGoals > homeGoals) return match.away;

    const homePens = penaltyScore(match, "home");
    const awayPens = penaltyScore(match, "away");
    if (homePens !== null && awayPens !== null) {
      if (homePens > awayPens) return match.home;
      if (awayPens > homePens) return match.away;
    }

    return "";
  }

  function getMatchLoser(match) {
    if (!match) return "";
    const winner = getMatchWinner(match);
    if (!winner) return "";
    if (String(winner) === String(match.home)) return match.away;
    if (String(winner) === String(match.away)) return match.home;
    return "";
  }

  function getRoundLabel(roundKey) {
    return knockoutRoundMeta.get(roundKey)?.compact || "World Cup";
  }

  function getWinnerPlaceholder(roundKey, index, side = "home") {
    if (roundKey === "LAST_32") {
      return `Seed 1/16 #${index * 2 + (side === "home" ? 1 : 2)}`;
    }

    if (roundKey === "FINAL") {
      return `SF Winner ${side === "home" ? 1 : 2}`;
    }

    if (roundKey === "THIRD_PLACE") {
      return `SF Loser ${side === "home" ? 1 : 2}`;
    }

    const round = knockoutRoundMeta.get(roundKey);
    const previous = knockoutRoundMeta.get(round?.previous || "");
    const sourceIndex = index * 2 + (side === "home" ? 0 : 1);
    return `Winner ${previous?.compact || "round"} #${sourceIndex + 1}`;
  }
  function sourceTeamFromPreviousRound(roundKey, index, side, bracket) {
    if (roundKey === "LAST_32") return "";

    if (roundKey === "FINAL") {
      const sourceIndex = side === "home" ? 0 : 1;
      return getMatchWinner(bracket.rounds.SEMI_FINALS[sourceIndex]?.match);
    }

    if (roundKey === "THIRD_PLACE") {
      const sourceIndex = side === "home" ? 0 : 1;
      return getMatchLoser(bracket.rounds.SEMI_FINALS[sourceIndex]?.match);
    }

    const round = knockoutRoundMeta.get(roundKey);
    const previousSlots = bracket.rounds[round?.previous || ""] || [];
    const sourceIndex = index * 2 + (side === "home" ? 0 : 1);
    return getMatchWinner(previousSlots[sourceIndex]?.match);
  }

  function resolveKnockoutEntrant(slot, side, bracket) {
    const match = slot.match;
    const directCode = side === "home" ? match.home : match.away;

    if (isKnownTeamCode(directCode)) {
      return {
        code: directCode,
        codeLabel: shortTeam(directCode),
        name: fullTeam(directCode),
        known: true
      };
    }

    const sourceCode = sourceTeamFromPreviousRound(slot.roundKey, slot.index, side, bracket);
    if (isKnownTeamCode(sourceCode)) {
      return {
        code: sourceCode,
        codeLabel: shortTeam(sourceCode),
        name: fullTeam(sourceCode),
        known: true
      };
    }

    return {
      code: "TBD",
      codeLabel: "TBD",
      name: getWinnerPlaceholder(slot.roundKey, slot.index, side),
      known: false
    };
  }

  function knockoutMatchId(match) {
    return String(match?.id || `${match?.round || "round"}-${match?.kickoff || "tba"}-${match?.home || "home"}-${match?.away || "away"}`);
  }

  function getKnockoutNextId(rounds) {
    const now = new Date();
    const all = knockoutRounds.filter((round) => visibleFeaturedRoundKeys.has(round.key)).flatMap((round) => rounds[round.key].map((slot) => slot.match));
    const allIds = new Set(all.map(knockoutMatchId));
    const featured = getFeaturedMatch(now).match;
    const featuredRound = normalizeKnockoutRound(featured?.round || featured?.stage || "");

    if (featuredRound && allIds.has(knockoutMatchId(featured))) {
      return knockoutMatchId(featured);
    }

    const live = all
      .filter((match) => isLive(match, now))
      .sort((a, b) => getMatchDate(a) - getMatchDate(b))[0];

    if (live) return knockoutMatchId(live);

    const next = all
      .filter((match) => isUpcomingMatch(match, now))
      .sort((a, b) => getMatchDate(a) - getMatchDate(b))[0];

    return next ? knockoutMatchId(next) : "";
  }

  function getMatchStatus(match, isNext = false) {
    const penalty = hasPenaltyScore(match);

    if (isLive(match)) return "LIVE";
    if (isBlockedStatus(match)) return statusLabel(match);

    if (isFinishedMatch(match)) {
      if (penalty) return `${hasExtraTime(match) ? "AET" : "FT"} PEN`;
      if (hasExtraTime(match)) return "AET";
      return "FT";
    }

    if (isWaitingResult(match)) return "Chờ KQ";
    if (isNext) return "NEXT";
    return "..."; //sắp diễn ra
  }
  function bracketScoreText(match) {
    if (hasScore(match)) return `${match.homeGoals} - ${match.awayGoals}`;
    return "VS";
  }

  function bracketTeamScoreText(match, side) {
    if (!hasScore(match)) return "-";
    return String(side === "home" ? match.homeGoals : match.awayGoals);
  }

  function bracketPenaltyText(match) {
    const pens = getPenaltyScore(match);
    if (!pens.has) return "";
    return `<span class="bracket-pens">PEN ${pens.home} - ${pens.away}</span>`;
  }
  function getScorersByTeam(match) {
    const goals = Array.isArray(match?.goals) ? match.goals : [];
    return {
      home: goals.filter((goal) => goal.side === "home" || String(goal.team) === String(match.home)),
      away: goals.filter((goal) => goal.side === "away" || String(goal.team) === String(match.away))
    };
  }

  function fmtKnockoutKickoff(match) {
    const date = getMatchDate(match || {});
    if (!date || Number.isNaN(date.getTime())) return "TBA";

    const time = fmtDate(date, { hour: "2-digit", minute: "2-digit", hour12: false });
    const weekday = fmtDate(date, { weekday: "short" });
    const dayMonth = fmtDate(date, { day: "2-digit", month: "2-digit" });
    return `${time} ${weekday}, ${dayMonth}`;
  }
  function knockoutStateClass(match, isNext) {
    if (isLive(match)) return "is-live";
    if (isNext) return "is-next";
    if (isFinishedMatch(match)) return "is-finished";
    return "";
  }

  function sideSlots(rounds, roundKey, side) {
    const slots = rounds[roundKey] || [];
    const half = Math.ceil(slots.length / 2);
    return side === "left" ? slots.slice(0, half) : slots.slice(half);
  }

  function sideSlotY(count, index) {
    const base = Array.from({ length: 8 }, (_, i) => 8 + i * (84 / 7));
    if (count >= 8) return base[index] ?? 50;
    if (count === 4) return (base[index * 2] + base[index * 2 + 1]) / 2;
    if (count === 2) return (base[index * 4] + base[index * 4 + 1] + base[index * 4 + 2] + base[index * 4 + 3]) / 4;
    return 50;
  }

  function renderBracketLines(side) {
    const x = side === "left"
      ? { LAST_16: 13, QUARTER_FINALS: 50, SEMI_FINALS: 87 }
      : { LAST_16: 87, QUARTER_FINALS: 50, SEMI_FINALS: 13 };

    const links = [
      ["LAST_16", "QUARTER_FINALS", 4, 2],
      ["QUARTER_FINALS", "SEMI_FINALS", 2, 1]
    ];

    const paths = links.flatMap(([source, target, sourceCount, targetCount]) => {
      return Array.from({ length: targetCount }, (_, index) => {
        const y1 = sideSlotY(sourceCount, index * 2);
        const y2 = sideSlotY(sourceCount, index * 2 + 1);
        const yMid = sideSlotY(targetCount, index);
        const xSource = x[source];
        const xTarget = x[target];
        const xMid = (xSource + xTarget) / 2;

        return `
          <path class="bracket-line" d="M ${xSource} ${y1} H ${xMid} V ${y2} H ${xSource}" />
          <path class="bracket-line" d="M ${xMid} ${yMid} H ${xTarget}" />
        `;
      });
    }).join("");

    return `
      <svg class="bracket-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${paths}
      </svg>
    `;
  }
  function renderKnockoutFlag(entrant, side, outcomeClass = "") {
    const flag = entrant.known
      ? flagImg(entrant.code, "bracket-flag")
      : `<span class="bracket-flag bracket-flag-placeholder" aria-hidden="true"></span>`;

    return `
      <div class="bracket-flag-slot is-${side} ${entrant.known ? "" : "is-placeholder"} ${outcomeClass}">
        ${flag}
      </div>
    `;
  }

  function renderKnockoutName(entrant, side, outcomeClass = "") {
    return `
      <div class="bracket-name is-${side} ${entrant.known ? "" : "is-placeholder"} ${outcomeClass}" title="${escapeHtml(entrant.name)}">
        ${escapeHtml(entrant.name)}
      </div>
    `;
  }

  function renderKnockoutTeamRow(entrant, side, scoreText, outcomeClass = "") {
    const flag = entrant.known
      ? flagImg(entrant.code, "bracket-flag")
      : `<span class="bracket-flag bracket-flag-placeholder" aria-hidden="true"></span>`;

    return `
      <div class="bracket-team-row is-${side} ${entrant.known ? "" : "is-placeholder"} ${outcomeClass}">
        <div class="bracket-team-info">
          ${flag}
          <span class="bracket-team-row-name" title="${escapeHtml(entrant.name)}">${escapeHtml(entrant.name)}</span>
        </div>
        <strong class="bracket-team-score">${escapeHtml(scoreText)}</strong>
      </div>
    `;
  }
  function renderKnockoutScorerLines(goals = []) {
    return goals.map((goal) => {
      const { minute, name } = goalEventParts(goal);
      return `
        <div class="bracket-scorer-line">
          <span>${minute || "--"}</span>
          <strong title="${name || "TBD"}">${name || "TBD"}</strong>
        </div>
      `;
    }).join("");
  }

  function renderKnockoutScorerSection(label, goals = [], side = "home") {
    if (!goals.length) return "";

    return `
      <div class="bracket-scorer-section is-${side}">
        <div class="bracket-scorer-team-label">${escapeHtml(label)}</div>
        ${renderKnockoutScorerLines(goals)}
      </div>
    `;
  }

  function renderKnockoutScorersList(match, home, away) {
    const { home: homeGoals, away: awayGoals } = getScorersByTeam(match);

    return `
      <div class="bracket-scorers-list">
        ${renderKnockoutScorerSection(home.name, homeGoals, "home")}
        ${renderKnockoutScorerSection(away.name, awayGoals, "away")}
      </div>
    `;
  }

  function renderKnockoutBack(match, home, away) {
    const goals = Array.isArray(match?.goals) ? match.goals : [];
    const score = bracketScoreText(match);

    return `
      <div class="bracket-back-head">
        <span class="bracket-back-summary">${escapeHtml(home.name)} ${escapeHtml(score)} ${escapeHtml(away.name)}</span>
      </div>
      ${goals.length
        ? renderKnockoutScorersList(match, home, away)
        : `<div class="bracket-no-goals">Chưa có dữ liệu bàn thắng</div>`}
    `;
  }
  function renderKnockoutCard(slot, bracket, options = {}) {
    const match = slot.match;
    const round = knockoutRoundMeta.get(slot.roundKey);
    const top = options.top ?? 50;
    const cardId = knockoutMatchId(match);
    const isOpen = openKnockoutCardId === cardId;
    const isNext = cardId === bracket.nextId;
    const stateClass = knockoutStateClass(match, isNext);
    const home = resolveKnockoutEntrant(slot, "home", bracket);
    const away = resolveKnockoutEntrant(slot, "away", bracket);
    const status = getMatchStatus(match, isNext);
    const homeScore = bracketTeamScoreText(match, "home");
    const awayScore = bracketTeamScoreText(match, "away");
    const venue = match.ground || match.venue || "TBA";
    const roundLabel = getRoundLabel(slot.roundKey);
    const penalty = getPenaltyScore(match);
    const winnerCode = getMatchWinner(match);
    const goalCount = Array.isArray(match?.goals)
      ? match.goals.length
      : (hasScore(match) ? Number(match.homeGoals || 0) + Number(match.awayGoals || 0) : 0);
    const compactBackClass = goalCount < 5 ? "is-compact-back" : "";
    const homeOutcomeClass = penalty.has && home.known && String(home.code) === String(winnerCode) ? "is-pen-winner" : "";
    const awayOutcomeClass = penalty.has && away.known && String(away.code) === String(winnerCode) ? "is-pen-winner" : "";

    return `
      <article
        class="bracket-card ${options.center ? "is-center" : ""} ${stateClass} ${penalty.has ? "has-penalty" : ""} ${compactBackClass} ${isOpen ? "is-flipped" : ""}"
        role="button"
        tabindex="0"
        aria-expanded="${isOpen ? "true" : "false"}"
        aria-label="${escapeHtml(round?.label || "Knockout")} ${slot.index + 1}"
        data-card-id="${escapeHtml(cardId)}"
        style="--top:${top.toFixed(3)}%;"
      >
        <div class="bracket-card-inner">
          <div class="bracket-card-face bracket-card-front">
            <div class="bracket-card-top">
              <span>${fmtKnockoutKickoff(match)}</span>
              <strong class="bracket-status ${stateClass}">${escapeHtml(status)}</strong>
            </div>
            <div class="bracket-card-body">
              ${renderKnockoutTeamRow(home, "home", homeScore, homeOutcomeClass)}
              ${renderKnockoutTeamRow(away, "away", awayScore, awayOutcomeClass)}
              ${bracketPenaltyText(match)}
            </div>
            <div class="bracket-card-meta">
              <span>${escapeHtml(roundLabel)}</span>
              <span>${escapeHtml(venue)}</span>
            </div>
          </div>
          <div class="bracket-card-face bracket-card-back">
            ${renderKnockoutBack(match, home, away)}
          </div>
        </div>
      </article>
    `;
  }
  function renderBracketRound(rounds, roundKey, side, bracket) {
    const slots = sideSlots(rounds, roundKey, side);
    const count = slots.length;

    return `
      <div class="bracket-round bracket-round--${roundKey.toLowerCase()}">
        ${slots.map((slot, index) => renderKnockoutCard(slot, bracket, {
          side,
          top: sideSlotY(count, index)
        })).join("")}
      </div>
    `;
  }
  function renderBracketHalf(bracket, side) {
    const roundOrder = side === "left" ? bracketSideRounds : bracketSideRounds.slice().reverse();

    return `
      <div class="bracket-half is-${side}">
        ${renderBracketLines(side)}
        ${roundOrder.map((roundKey) => renderBracketRound(bracket.rounds, roundKey, side, bracket)).join("")}
      </div>
    `;
  }

  function renderBracketFinals(bracket) {
    return `
      <div class="bracket-finals" aria-label="Final and third-place">
        <div class="bracket-finals-line" aria-hidden="true"></div>
        ${renderKnockoutCard(bracket.rounds.FINAL[0], bracket, { center: true, top: 15 })}
        ${renderKnockoutCard(bracket.rounds.THIRD_PLACE[0], bracket, { center: true, top: 85 })}
      </div>
    `;
  }

  function renderKnockout() {
    if (!el.knockout) return;

    const bracket = buildKnockoutBracket(data.fixtures || []);

    el.knockout.innerHTML = `
      ${renderBracketHalf(bracket, "left")}
      ${renderBracketFinals(bracket)}
      ${renderBracketHalf(bracket, "right")}
    `;
  }

  function toggleKnockoutCard(cardId) {
    openKnockoutCardId = openKnockoutCardId === cardId ? "" : cardId;
    renderKnockout();
  }

  function setupKnockoutInteractions() {
    if (!el.knockout) return;

    el.knockout.addEventListener("click", (event) => {
      const card = event.target.closest(".bracket-card");
      if (!card || !el.knockout.contains(card)) return;

      if (event.target.closest(".bracket-card-close")) {
        event.stopPropagation();
        openKnockoutCardId = "";
        renderKnockout();
        return;
      }

      toggleKnockoutCard(card.dataset.cardId || "");
    });

    el.knockout.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest(".bracket-card");
      if (!card || !el.knockout.contains(card)) return;

      event.preventDefault();
      toggleKnockoutCard(card.dataset.cardId || "");
    });
  }

  function updateClock() { const now = new Date(); el.clock.textContent = fmtDate(now, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); el.dateLine.textContent = fmtDate(now, { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); }
  // function getFeaturedMatch(now) {
  //   const dated = fixturesWithDates();

  //   const live = dated
  //     .filter((m) => isLive(m, now))
  //     .sort((a, b) => a.date - b.date)[0];

  //   if (live) return { match: live, mode: "live" };

  //   const next = dated
  //     .filter((m) => isUpcomingMatch(m, now))
  //     .sort((a, b) => a.date - b.date)[0];

  //   if (next) return { match: next, mode: "next" };

  //   const finished = dated
  //     .filter((m) => isFinishedMatch(m) || hasScore(m))
  //     .sort((a, b) => b.date - a.date)[0];

  //   if (finished) return { match: finished, mode: "recent" };

  //   return { match: null, mode: "empty" };
  // }

  function getFeaturedMatch(now) {
    let dated = fixturesWithDates();

    if (el.knockout?.closest(".wallpaper--knockout")) {
      const visibleDated = dated.filter((m) => visibleFeaturedRoundKeys.has(normalizeKnockoutRound(m.round || m.stage || "")));
      if (visibleDated.length) dated = visibleDated;
    }

    // Panel giữa luôn ưu tiên trận SẮP DIỄN RA tiếp theo
    const next = dated
      .filter((m) => isUpcomingMatch(m, now))
      .sort((a, b) => a.date - b.date)[0];

    if (next) return { match: next, mode: "next" };

    // Nếu không còn trận sắp diễn ra, mới hiện trận đang đá
    const live = dated
      .filter((m) => isLive(m, now))
      .sort((a, b) => a.date - b.date)[0];

    if (live) return { match: live, mode: "live" };

    // Nếu hết live và hết lịch, hiện trận gần nhất
    const finished = dated
      .filter((m) => isFinishedMatch(m) || hasScore(m))
      .sort((a, b) => b.date - a.date)[0];

    if (finished) return { match: finished, mode: "recent" };

    return { match: null, mode: "empty" };
  }

  function isKnockoutViewActive() {
    return Boolean(el.knockout?.closest(".wallpaper--knockout"));
  }

  function updateCountdown() {
    const now = new Date();
    const { match, mode } = getFeaturedMatch(now);
    const compactCountdown = isKnockoutViewActive();

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

    const modeText = mode === "live" ? "Đang Đá" : mode === "recent" ? "Trận Gần Nhất" : "Trận Sắp Diễn Ra";
    const stageText = match.group ? `Bảng ${match.group}` : getRoundLabel(normalizeKnockoutRound(match.round || match.stage || ""));
    el.countdownVenue.textContent = `${modeText} | ${fmtKickoff(match.date)} | ${stageText} | ${match.venue || "TBA"}`;

    if (mode === "next") {
      const diff = Math.max(0, match.date - now);
      const s = Math.floor(diff / 1000);
      const days = Math.floor(s / 86400);
      const hours = Math.floor((s % 86400) / 3600);
      const totalHours = Math.floor(s / 3600);

      el.days.textContent = String(days).padStart(2, "0");
      el.hours.textContent = String(compactCountdown ? totalHours : hours).padStart(2, "0");
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
        matches: (nextData.fixtures || []).map((m) => [
          m.id,
          m.status,
          m.homeGoals,
          m.awayGoals,
          m.minute,
          m.injuryTime,
          m.venue,
          m.ground,
          JSON.stringify(m.goals || []),
          m.lastUpdated
        ])
      });

      if (signature === staticDataLastSignature) return;
      staticDataLastSignature = signature;

      data = normalizeLocalData(nextData);
      teams = buildTeamMap(data);

      data = withLiveStandings(data);
      teams = buildTeamMap(data);

      console.log("Loaded data.json from GitHub Actions", data.updatedAt, data);
      renderTabs();
      renderStandings();
      renderFixtures();
      renderKnockout();
      updateCountdown();
    } catch (err) {
      console.warn("Khong lay duoc data.json, se dung data.js co san:", err);
    }
  }

  function tick() { updateClock(); updateCountdown(); }
  function renderParticles() { el.particles.innerHTML = Array.from({ length: 42 }, (_, i) => `<span style="--x:${Math.round((i * 37) % 100)}%;--delay:${((i * 0.41) % 8).toFixed(2)}s;--duration:${(7 + (i % 9) * 0.7).toFixed(2)}s;--size:${2 + (i % 3)}px"></span>`).join(""); }

  applyRotatingBackground();

  setupKnockoutInteractions(); renderParticles(); renderTabs(); renderStandings(); renderFixtures(); renderKnockout(); tick();

  if (config.DATA_MODE === "github-actions" || config.DATA_JSON_URL) {
    loadStaticJsonData();
    setInterval(loadStaticJsonData, config.REFRESH_INTERVAL || 300000);
  } else {
    loadApiData();
    setInterval(loadApiData, config.REFRESH_INTERVAL || 900000);
  }

  setInterval(tick, 1000);
  setInterval(renderFixtures, 60000);
  setInterval(renderKnockout, 60000);
  setInterval(applyRotatingBackground, 60 * 1000);
})();
