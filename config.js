window.CONFIG = {
  // Che do khuyen dung cho GitHub Actions:
  // Trinh duyet/Lively chi doc data.json tinh tu GitHub Pages.
  // API token duoc giu trong GitHub Secret, khong nam trong frontend.
  DATA_MODE: "github-actions",
  DATA_JSON_URL: "./data.json",

  // De trong de tranh CORS va tranh lo token trong browser.
  FOOTBALL_DATA_TOKEN: "",
  API_HOST: "",

  COMPETITION: "WC",
  SEASON: "2026",
  WORLD_CUP_DATE_FROM: "2026-06-01",
  WORLD_CUP_DATE_TO: "2026-07-31",
  REFRESH_INTERVAL: 5 * 60 * 1000,
  TIMEZONE: "Asia/Ho_Chi_Minh",
  USE_FALLBACK_DATA: true,
  MAX_FIXTURES: 8,
  RECENT_FINISHED_HOURS: 36
};
