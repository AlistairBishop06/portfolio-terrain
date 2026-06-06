export const CONFIG = {
  github: {
    owner: "AlistairBishop06",
    api: "https://api.github.com",
    cacheKey: "portfolio-terrain:github:v5",
    cacheMs: 1000 * 60 * 45,
    commitConcurrency: 5
  },
  terrain: {
    size: 86,
    segments: 154,
    maxHeight: 13,
    waterLevel: 0.34,
    baseNoise: 1.2,
    repoInfluence: 6.8,
    biomeInfluence: 16
  },
  camera: {
    start: { x: 35, y: 26, z: 38 },
    target: { x: 0, y: 3.8, z: 0 },
    minDistance: 15,
    maxDistance: 82
  }
};

export const BIOMES = {
  techForest: {
    key: "techForest",
    label: "Tech Forest",
    languages: ["JavaScript", "TypeScript"],
    terrain: "lush forest with glowing tech flora",
    color: "#2f8f55",
    accent: "#f4d44d",
    secondary: "#45e0a8",
    fog: "#10291c",
    propBias: "forest"
  },
  alpine: {
    key: "alpine",
    label: "Alpine Range",
    languages: ["Python"],
    terrain: "alpine mountains with pine forests and streams",
    color: "#557b9f",
    accent: "#dfefff",
    secondary: "#1f5d73",
    fog: "#c9e7ff",
    propBias: "alpine"
  },
  meadow: {
    key: "meadow",
    label: "Web Meadow",
    languages: ["HTML", "CSS"],
    terrain: "colourful meadow with soft hills and flowers",
    color: "#68aa55",
    accent: "#ff8d5e",
    secondary: "#f7d66b",
    fog: "#e9f6c6",
    propBias: "meadow"
  },
  volcanic: {
    key: "volcanic",
    label: "Volcanic Highlands",
    languages: ["Java"],
    terrain: "volcanic highlands with basalt and ember light",
    color: "#5b4b43",
    accent: "#ff6d3f",
    secondary: "#2e2522",
    fog: "#4b2419",
    propBias: "volcanic"
  },
  canyon: {
    key: "canyon",
    label: "Canyon Lab",
    languages: ["C", "C++"],
    terrain: "desert canyon with layered stone formations",
    color: "#a56f43",
    accent: "#e8c184",
    secondary: "#6e3e28",
    fog: "#d6b17c",
    propBias: "canyon"
  },
  autumn: {
    key: "autumn",
    label: "Autumn Grove",
    languages: ["Rust", "Ruby"],
    terrain: "autumn forest and red rock shelves",
    color: "#9b5d38",
    accent: "#f29a4b",
    secondary: "#743b2d",
    fog: "#c67f4f",
    propBias: "autumn"
  },
  coast: {
    key: "coast",
    label: "Coastal Plains",
    languages: ["Go", "Kotlin", "Lua"],
    terrain: "coastal grassland and clean open plains",
    color: "#5fae8e",
    accent: "#75d7f2",
    secondary: "#d8e8a3",
    fog: "#bdeaf0",
    propBias: "coast"
  },
  tundra: {
    key: "tundra",
    label: "Utility Tundra",
    languages: ["Shell", "PowerShell"],
    terrain: "icy utility biome with sparse shrubs",
    color: "#a7bfd2",
    accent: "#f4fbff",
    secondary: "#6b8799",
    fog: "#e5f7ff",
    propBias: "tundra"
  },
  neutral: {
    key: "neutral",
    label: "Neutral Grassland",
    languages: ["Unknown", "PHP", "ASP.NET", "C#"],
    terrain: "neutral grassland with rocks and low shrubs",
    color: "#6f8f55",
    accent: "#ddd6a1",
    secondary: "#485d3f",
    fog: "#c8d5ae",
    propBias: "neutral"
  }
};

const LANGUAGE_TO_BIOME = Object.values(BIOMES).reduce((map, biome) => {
  biome.languages.forEach((language) => map.set(language, biome.key));
  return map;
}, new Map());

export function getBiomeForLanguage(language) {
  return BIOMES[LANGUAGE_TO_BIOME.get(language || "Unknown")] ?? BIOMES.neutral;
}

export function languageColor(language) {
  return getBiomeForLanguage(language).accent;
}

export function languageIcon(language) {
  const icons = {
    JavaScript: "JS",
    TypeScript: "TS",
    Python: "Py",
    HTML: "HTML",
    CSS: "CSS",
    Java: "J",
    C: "C",
    "C++": "C++",
    Rust: "Rs",
    Go: "Go",
    Shell: "$",
    PowerShell: "PS",
    Ruby: "Rb",
    Kotlin: "Kt",
    Lua: "Lua",
    PHP: "PHP",
    "C#": "C#",
    "ASP.NET": ".NET",
    Unknown: "?"
  };

  return icons[language || "Unknown"] ?? (language || "?").slice(0, 3);
}
