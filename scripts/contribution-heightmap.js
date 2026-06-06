import { CONFIG } from "./config.js";

export function buildContributionHeightmap(portfolio) {
  const cells = createBaseCells(portfolio);
  const commitsByDay = new Map();
  const languageWeights = new Map();

  portfolio.repos.forEach((repo, repoIndex) => {
    addLanguageWeight(languageWeights, repo.language, repo.stars + repo.size / 200 + 1);

    repo.commits.forEach((commit) => {
      const cellIndex = getCellIndex(commit.date);
      if (cellIndex < 0 || cellIndex >= cells.length) return;

      const existing = commitsByDay.get(cellIndex) ?? {
        count: 0,
        repos: new Map(),
        languages: new Map()
      };

      existing.count += 1;
      existing.repos.set(repo.name, (existing.repos.get(repo.name) ?? 0) + 1);
      existing.languages.set(repo.language, (existing.languages.get(repo.language) ?? 0) + 1);
      commitsByDay.set(cellIndex, existing);
      cells[cellIndex].repo = repo;
      cells[cellIndex].repoIndex = repoIndex;
    });
  });

  commitsByDay.forEach((activity, index) => {
    const cell = cells[index];
    cell.commits = activity.count;
    cell.language = strongestKey(activity.languages) ?? cell.language;
    cell.repo = pickRepo(portfolio.repos, activity.repos) ?? cell.repo;
  });

  placeRepoPeaks(cells, portfolio.repos);
  smoothStreaks(cells);

  const maxCommits = Math.max(1, ...cells.map((cell) => cell.commits));
  cells.forEach((cell) => {
    const commitHeight = Math.log1p(cell.commits) / Math.log1p(maxCommits);
    const streakLift = Math.min(1, cell.streak / 8);
    const repoLift = cell.isRepoPeak ? CONFIG.terrain.repoPeakBoost : 0;
    const valley = cell.commits === 0 ? CONFIG.terrain.quietValleyDepth : 0;
    cell.height = clamp(
      CONFIG.terrain.minHeight + commitHeight * 5.2 + streakLift * 2.1 + repoLift - valley,
      CONFIG.terrain.minHeight,
      CONFIG.terrain.maxHeight
    );
  });

  return {
    owner: portfolio.owner,
    fetchedAt: portfolio.fetchedAt,
    cells,
    repos: portfolio.repos,
    featuredRepo: portfolio.repos[0],
    summary: {
      repoCount: portfolio.repos.length,
      totalCommits: cells.reduce((total, cell) => total + cell.commits, 0),
      topLanguage: strongestKey(languageWeights) ?? "Unknown"
    }
  };
}

function createBaseCells(portfolio) {
  const cells = [];
  const languageByRecentRepo = portfolio.repos.map((repo) => repo.language || "Unknown");

  for (let week = 0; week < CONFIG.terrain.weeks; week += 1) {
    for (let day = 0; day < CONFIG.terrain.days; day += 1) {
      const index = week * CONFIG.terrain.days + day;
      cells.push({
        index,
        week,
        day,
        commits: 0,
        height: CONFIG.terrain.minHeight,
        streak: 0,
        language: languageByRecentRepo[index % Math.max(1, languageByRecentRepo.length)] || "Unknown",
        repo: null,
        isRepoPeak: false
      });
    }
  }

  return cells;
}

function getCellIndex(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return -1;

  const now = new Date();
  const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysAgo = Math.floor((utcNow - utcDate) / 86400000);
  if (daysAgo < 0 || daysAgo >= CONFIG.github.lookbackDays) return -1;

  const newestIndex = CONFIG.terrain.weeks * CONFIG.terrain.days - 1;
  return newestIndex - daysAgo;
}

function placeRepoPeaks(cells, repos) {
  repos.forEach((repo, index) => {
    const pushedCell = getCellIndex(repo.pushedAt || repo.updatedAt);
    const cellIndex = pushedCell >= 0 ? pushedCell : index % cells.length;
    const cell = cells[cellIndex];
    cell.repo = cell.repo || repo;
    cell.language = repo.language || cell.language;
    cell.isRepoPeak = true;
    cell.commits += repo.commits.length ? 0 : Math.min(3, Math.ceil((repo.stars + 1) / 2));
  });
}

function smoothStreaks(cells) {
  let streak = 0;
  cells.forEach((cell) => {
    streak = cell.commits > 0 ? streak + 1 : 0;
    cell.streak = streak;
  });
}

function pickRepo(repos, repoCounts) {
  const name = strongestKey(repoCounts);
  return repos.find((repo) => repo.name === name) ?? null;
}

function addLanguageWeight(weights, language, amount) {
  const key = language || "Unknown";
  weights.set(key, (weights.get(key) ?? 0) + amount);
}

function strongestKey(map) {
  let winner = null;
  let winnerValue = -Infinity;
  map.forEach((value, key) => {
    if (value > winnerValue) {
      winner = key;
      winnerValue = value;
    }
  });
  return winner;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
