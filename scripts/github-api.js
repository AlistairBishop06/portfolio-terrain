import { CONFIG } from "./config.js";

export async function loadGitHubPortfolio(owner, { forceRefresh = false } = {}) {
  const cached = readCache();
  if (!forceRefresh && cached) {
    return cached;
  }

  const repos = await fetchRepos(owner);
  const reposForCommits = repos.slice(0, CONFIG.github.maxReposForCommits);

  const commitResults = await Promise.allSettled(
    reposForCommits.map((repo) => fetchRepoCommits(owner, repo))
  );

  const commitsByRepo = new Map();
  commitResults.forEach((result) => {
    if (result.status === "fulfilled") {
      commitsByRepo.set(result.value.repoName, result.value.commits);
    }
  });

  const enrichedRepos = repos.map((repo) => ({
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    language: repo.language || "Unknown",
    htmlUrl: repo.html_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    fork: repo.fork,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    size: repo.size,
    commits: commitsByRepo.get(repo.name) ?? []
  }));

  const portfolio = {
    owner,
    fetchedAt: new Date().toISOString(),
    repos: enrichedRepos
  };

  writeCache(portfolio);
  return portfolio;
}

async function fetchRepos(owner) {
  const repos = [];
  let page = 1;

  while (page <= 4) {
    const url = `${CONFIG.github.api}/users/${owner}/repos?type=owner&sort=pushed&direction=desc&per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) {
      throw new Error(`GitHub repos request failed: ${response.status}`);
    }

    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos;
}

async function fetchRepoCommits(owner, repo) {
  const since = new Date();
  since.setDate(since.getDate() - CONFIG.github.lookbackDays);

  const url = `${CONFIG.github.api}/repos/${owner}/${repo.name}/commits?author=${owner}&since=${since.toISOString()}&per_page=100`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" }
  });

  if (response.status === 409 || response.status === 404) {
    return { repoName: repo.name, commits: [] };
  }

  if (!response.ok) {
    throw new Error(`GitHub commits request failed for ${repo.name}: ${response.status}`);
  }

  const commits = await response.json();
  return {
    repoName: repo.name,
    commits: commits.map((item) => ({
      sha: item.sha,
      date: item.commit?.author?.date || item.commit?.committer?.date,
      message: item.commit?.message || ""
    }))
  };
}

function readCache() {
  try {
    const raw = localStorage.getItem(CONFIG.github.cacheKey);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CONFIG.github.cacheMs) return null;
    return cached.portfolio;
  } catch {
    return null;
  }
}

function writeCache(portfolio) {
  try {
    localStorage.setItem(CONFIG.github.cacheKey, JSON.stringify({
      timestamp: Date.now(),
      portfolio
    }));
  } catch {
    // Cache is an optimization only.
  }
}
