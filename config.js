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
  RECENT_FINISHED_HOURS: 36,

  MATCH_LIVE_WINDOW_MINUTES: 130,
MAX_FIXTURES: 6,

  BACKGROUND_INTERVAL: 1 * 60 * 1000,
  BACKGROUND_IMAGES: [
    "./assets/1.jpg",
    "./assets/2.jpg",
    "./assets/3.jpg",
    "./assets/4.jpg",
    "./assets/5.jpg",
    "./assets/6.jpg",
    "./assets/7.jpg",
    "./assets/8.jpg",
    "./assets/9.jpg",
    "./assets/10.jpg",
    "./assets/11.jpg",
    "./assets/12.jpg",
    "./assets/13.jpg",
    "./assets/14.jpg",
    "./assets/15.jpg",
    "./assets/16.png",
    
  ]
};
