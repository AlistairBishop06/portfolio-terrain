export const CONFIG = {
  github: {
    owner: "AlistairBishop06",
    api: "https://api.github.com",
    cacheKey: "terrainportfolio:github:v2",
    cacheMs: 1000 * 60 * 45,
    lookbackDays: 365,
    maxReposForCommits: 24
  },
  terrain: {
    weeks: 53,
    days: 7,
    cellSize: 1.05,
    minHeight: 0.18,
    maxHeight: 8.5,
    repoPeakBoost: 1.7,
    quietValleyDepth: 0.22
  },
  camera: {
    start: { x: 18, y: 14, z: 18 },
    target: { x: 0, y: 1.2, z: 0 }
  },
  languages: {
    JavaScript: "#f2d74c",
    TypeScript: "#5aa7ff",
    HTML: "#ff7c4f",
    CSS: "#45d69a",
    Python: "#7aa7ff",
    Java: "#ff9f5a",
    "C++": "#9b9fff",
    C: "#a4a9ff",
    "C#": "#b084ff",
    PHP: "#a9aadf",
    Ruby: "#ff5c78",
    Go: "#62d9ec",
    Rust: "#d39160",
    Shell: "#a7df70",
    Svelte: "#ff6f4a",
    Vue: "#55d999",
    Astro: "#ff8bd1",
    Dart: "#64c7ff",
    Kotlin: "#c58cff",
    Swift: "#ff9264",
    Unknown: "#7f8c74"
  }
};

export function languageColor(language) {
  return CONFIG.languages[language] ?? CONFIG.languages.Unknown;
}
