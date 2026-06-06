import { BIOMES, CONFIG, getBiomeForLanguage } from "./config.js";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function buildLandscapeModel(portfolio) {
  const repos = normaliseRepos(portfolio.repos);
  const groups = buildBiomeGroups(repos);
  const placedGroups = placeBiomeGroups(groups);
  const placedRepos = placeReposWithinGroups(placedGroups);
  const sampler = createTerrainSampler(placedRepos, placedGroups);

  placedRepos.forEach((repo) => {
    repo.height = sampler(repo.x, repo.z).height;
  });

  const summary = buildSummary(portfolio, placedRepos, placedGroups);

  return {
    owner: portfolio.owner,
    fetchedAt: portfolio.fetchedAt,
    dataSource: portfolio.dataSource,
    repos: placedRepos,
    groups: placedGroups,
    summary,
    sample: sampler,
    world: {
      size: CONFIG.terrain.size,
      segments: CONFIG.terrain.segments,
      waterLevel: CONFIG.terrain.waterLevel
    }
  };
}

function normaliseRepos(repos) {
  const commitLogs = repos.map((repo) => Math.log1p(Math.max(0, repo.commitCount || 0)));
  const minLog = Math.min(...commitLogs, 0);
  const maxLog = Math.max(...commitLogs, 1);

  return repos.map((repo, index) => {
    const commitLog = Math.log1p(Math.max(0, repo.commitCount || 0));
    const normalizedCommit = maxLog === minLog ? 0.5 : (commitLog - minLog) / (maxLog - minLog);
    const biome = getBiomeForLanguage(repo.language);

    return {
      ...repo,
      index,
      language: repo.language || "Unknown",
      biome,
      biomeKey: biome.key,
      normalizedCommit,
      activityScore: commitLog
    };
  });
}

function buildBiomeGroups(repos) {
  const byBiome = new Map();

  repos.forEach((repo) => {
    const existing = byBiome.get(repo.biomeKey) ?? {
      key: repo.biomeKey,
      biome: repo.biome,
      repos: [],
      totalCommits: 0,
      maxNormalizedCommit: 0
    };

    existing.repos.push(repo);
    existing.totalCommits += repo.commitCount || 0;
    existing.maxNormalizedCommit = Math.max(existing.maxNormalizedCommit, repo.normalizedCommit);
    byBiome.set(repo.biomeKey, existing);
  });

  return [...byBiome.values()].sort((a, b) => b.totalCommits - a.totalCommits);
}

function placeBiomeGroups(groups) {
  const maxTotal = Math.max(1, ...groups.map((group) => group.totalCommits));
  const size = CONFIG.terrain.size;

  return groups.map((group, index) => {
    const importance = Math.log1p(group.totalCommits) / Math.log1p(maxTotal);
    const ring = groups.length <= 1 ? 0 : index / (groups.length - 1);
    const angle = -0.55 + index * GOLDEN_ANGLE;

    // High-activity language groups are pulled toward the map's centre; quieter
    // groups sit toward the edge, which makes lower-commit repos read as flatter outskirts.
    const radius = mix(size * 0.08, size * 0.38, ring) * mix(1, 0.45, importance);

    return {
      ...group,
      index,
      importance,
      angle,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: mix(7, 15, Math.min(1, group.repos.length / 9))
    };
  });
}

function placeReposWithinGroups(groups) {
  const placed = [];
  const maxCommit = Math.max(1, ...groups.flatMap((group) => group.repos.map((repo) => repo.commitCount || 0)));

  groups.forEach((group) => {
    const sorted = [...group.repos].sort((a, b) => {
      if (b.commitCount !== a.commitCount) return b.commitCount - a.commitCount;
      return a.name.localeCompare(b.name);
    });

    sorted.forEach((repo, rank) => {
      const rankT = sorted.length <= 1 ? 0 : rank / (sorted.length - 1);
      const hash = randomFromString(`${repo.fullName}:${repo.commitCount}`);
      const commitSimilarityBand = 1 - repo.normalizedCommit;

      // Repos are first grouped by biome/language. Within that group, commit count
      // controls distance from the cluster centre: similar commit counts share a
      // similar radius, so high-activity repos form tight inner clusters and low
      // activity repos drift naturally toward the biome edge.
      const localRadius = mix(1.15, group.radius, commitSimilarityBand) + (hash - 0.5) * 2.2;
      const localAngle = group.angle + (rankT - 0.5) * Math.PI * 1.35 + (hash - 0.5) * 0.42;
      const outward = Math.max(0, 1 - repo.normalizedCommit) * 0.14;

      let x = group.x + Math.cos(localAngle) * localRadius;
      let z = group.z + Math.sin(localAngle) * localRadius;
      x += x * outward;
      z += z * outward;

      placed.push({
        ...repo,
        groupKey: group.key,
        groupLabel: group.biome.label,
        x: clamp(x, -CONFIG.terrain.size * 0.45, CONFIG.terrain.size * 0.45),
        z: clamp(z, -CONFIG.terrain.size * 0.45, CONFIG.terrain.size * 0.45),
        landmarkScale: mix(0.82, 2.2, repo.normalizedCommit),
        influence: mix(3.7, CONFIG.terrain.repoInfluence, repo.normalizedCommit),
        mountainPower: mix(0.55, CONFIG.terrain.maxHeight * 0.52, repo.normalizedCommit),
        maxCommit
      });
    });
  });

  return placed;
}

function createTerrainSampler(repos, groups) {
  const size = CONFIG.terrain.size;
  const half = size / 2;

  return function sampleTerrain(x, z) {
    const radial = Math.sqrt(x * x + z * z) / half;
    const islandMask = 1 - smoothstep(0.72, 1.02, radial);
    const base =
      0.72 +
      fbm(x * 0.047, z * 0.047, 4) * CONFIG.terrain.baseNoise +
      fbm((x + 41) * 0.018, (z - 19) * 0.018, 3) * 1.3;

    let height = base * islandMask;

    groups.forEach((group) => {
      const d = distance(x, z, group.x, group.z);
      const influence = gaussian(d, CONFIG.terrain.biomeInfluence + group.radius * 0.65);
      const biomeLift = mix(0.28, 1.65, group.importance);
      height += influence * biomeLift * islandMask;
    });

    repos.forEach((repo) => {
      const d = distance(x, z, repo.x, repo.z);
      const influence = gaussian(d, repo.influence);
      const shoulder = gaussian(d, repo.influence * 1.8) * repo.normalizedCommit;

      // Each repository adds a smooth radial feature rather than an isolated block.
      // Commit count controls both height and breadth, so active neighbouring repos
      // merge into plateaus while quieter repos become small foothills.
      height += influence * repo.mountainPower * islandMask;
      height += shoulder * 1.05 * islandMask;

      if (repo.biomeKey === "canyon") {
        height += Math.sin((x + z) * 0.34) * influence * 0.7;
      }

      if (repo.biomeKey === "volcanic") {
        height += influence * repo.normalizedCommit * 1.4;
      }
    });

    height -= smoothstep(0.82, 1, radial) * 1.8;
    if (height > 0) {
      height = CONFIG.terrain.maxHeight * (1 - Math.exp(-height / (CONFIG.terrain.maxHeight * 0.72)));
    }
    height = clamp(height, -0.12, CONFIG.terrain.maxHeight);

    return {
      height,
      color: sampleBiomeColor(x, z, height, repos, groups),
      dominantBiome: sampleDominantBiome(x, z, repos, groups)
    };
  };
}

function sampleBiomeColor(x, z, height, repos, groups) {
  const color = [0, 0, 0];
  let total = 0;

  groups.forEach((group) => {
    const weight = gaussian(distance(x, z, group.x, group.z), CONFIG.terrain.biomeInfluence + group.radius) * 0.8;
    addWeightedColor(color, group.biome.color, weight);
    total += weight;
  });

  repos.forEach((repo) => {
    const weight = gaussian(distance(x, z, repo.x, repo.z), repo.influence * 1.8) * (0.6 + repo.normalizedCommit);
    addWeightedColor(color, repo.biome.color, weight);
    total += weight;
  });

  if (total <= 0.0001) {
    addWeightedColor(color, BIOMES.neutral.color, 1);
    total = 1;
  }

  color[0] /= total;
  color[1] /= total;
  color[2] /= total;

  const light = clamp(height / CONFIG.terrain.maxHeight, 0, 1);
  const snow = smoothstep(0.73, 0.94, light);
  const shadow = mix(0.72, 1.18, light);

  color[0] = mix(color[0] * shadow, 0.92, snow * 0.48);
  color[1] = mix(color[1] * shadow, 0.96, snow * 0.48);
  color[2] = mix(color[2] * shadow, 1, snow * 0.48);

  return color.map((channel) => clamp(channel, 0, 1));
}

function sampleDominantBiome(x, z, repos, groups) {
  let winner = groups[0]?.biome ?? BIOMES.neutral;
  let best = -Infinity;

  groups.forEach((group) => {
    const weight = gaussian(distance(x, z, group.x, group.z), CONFIG.terrain.biomeInfluence + group.radius);
    if (weight > best) {
      best = weight;
      winner = group.biome;
    }
  });

  repos.forEach((repo) => {
    const weight = gaussian(distance(x, z, repo.x, repo.z), repo.influence * 1.35) * (0.7 + repo.normalizedCommit);
    if (weight > best) {
      best = weight;
      winner = repo.biome;
    }
  });

  return winner;
}

function buildSummary(portfolio, repos, groups) {
  const languageWeights = new Map();
  repos.forEach((repo) => {
    const key = repo.language || "Unknown";
    languageWeights.set(key, (languageWeights.get(key) || 0) + (repo.commitCount || 0) + 1);
  });

  const topRepo = repos.reduce((winner, repo) => {
    if (!winner) return repo;
    return (repo.commitCount || 0) > (winner.commitCount || 0) ? repo : winner;
  }, null);

  return {
    repoCount: repos.length,
    totalCommits: repos.reduce((total, repo) => total + (repo.commitCount || 0), 0),
    topLanguage: strongestKey(languageWeights) || "Unknown",
    topBiome: groups[0]?.biome.label || "Neutral Grassland",
    dataSource: portfolio.dataSource,
    featuredRepo: topRepo,
    fetchedAt: portfolio.fetchedAt
  };
}

function addWeightedColor(target, hex, weight) {
  const [r, g, b] = hexToRgb01(hex);
  target[0] += r * weight;
  target[1] += g * weight;
  target[2] += b * weight;
}

function hexToRgb01(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255
  ];
}

function fbm(x, z, octaves) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(x * frequency, z * frequency) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / total;
}

function valueNoise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const sx = smoothstep(0, 1, x - x0);
  const sz = smoothstep(0, 1, z - z0);
  const a = random2(x0, z0);
  const b = random2(x0 + 1, z0);
  const c = random2(x0, z0 + 1);
  const d = random2(x0 + 1, z0 + 1);

  return mix(mix(a, b, sx), mix(c, d, sx), sz);
}

function random2(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function randomFromString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function strongestKey(map) {
  let winner = null;
  let best = -Infinity;
  map.forEach((value, key) => {
    if (value > best) {
      best = value;
      winner = key;
    }
  });
  return winner;
}

function gaussian(distanceValue, sigma) {
  return Math.exp(-(distanceValue * distanceValue) / (2 * sigma * sigma));
}

function distance(x1, z1, x2, z2) {
  return Math.hypot(x1 - x2, z1 - z2);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
