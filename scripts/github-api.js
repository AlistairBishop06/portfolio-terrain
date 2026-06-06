import { CONFIG } from "./config.js";
import { FALLBACK_REPOS } from "./fallback-data.js";

export async function loadGitHubPortfolio(owner, { forceRefresh = false } = {}) {
  const cached = readCache();
  if (!forceRefresh && cached) {
    return cached;
  }

  try {
    const repos = await fetchRepos(owner);
    if (!repos.length) {
      return fallbackPortfolio(owner, "fallback: no public repositories returned");
    }

    const enrichedRepos = await enrichWithCommitCounts(repos);
    const exactCounts = enrichedRepos.filter((repo) => repo.commitCountSource === "github").length;
    const portfolio = {
      owner,
      fetchedAt: new Date().toISOString(),
      dataSource: exactCounts
        ? `live GitHub API (${exactCounts} exact commit counts, rest estimated)`
        : "live GitHub API (commit counts estimated)",
      repos: enrichedRepos
    };

    writeCache(portfolio);
    return portfolio;
  } catch (error) {
    console.warn("Using fallback GitHub data:", error);
    const stale = readCache({ allowExpired: true });
    if (stale) {
      return {
        ...stale,
        dataSource: `${stale.dataSource}; stale cache because GitHub is rate limited`
      };
    }

    return fallbackPortfolio(owner, describeFallbackSource(error));
  }
}

async function fetchRepos(owner) {
  const repos = [];
  let page = 1;

  while (page <= 4) {
    const url = `${CONFIG.github.api}/users/${owner}/repos?type=owner&sort=pushed&direction=desc&per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" }
    });

    if (response.status === 403 || response.status === 429) {
      const reset = response.headers.get("x-ratelimit-reset");
      throw new Error(`GitHub repository rate limit reached${reset ? ` reset:${reset}` : ""}`);
    }

    if (!response.ok) {
      throw new Error(`GitHub repositories request failed: ${response.status}`);
    }

    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos.map(normalizeRepo);
}

async function enrichWithCommitCounts(repos) {
  if (!CONFIG.github.fetchExactCommitCounts) {
    return repos.map((repo) => ({
      ...repo,
      commitCount: estimateCommitCount(repo),
      commitCountSource: "estimated"
    }));
  }

  const exactNames = new Set(
    [...repos]
      .sort((a, b) => estimateCommitCount(b) - estimateCommitCount(a))
      .slice(0, CONFIG.github.exactCommitRepoLimit)
      .map((repo) => repo.fullName)
  );

  const tasks = repos.map((repo) => async () => {
    if (!exactNames.has(repo.fullName)) {
      return {
        ...repo,
        commitCount: estimateCommitCount(repo),
        commitCountSource: "estimated"
      };
    }

    try {
      return {
        ...repo,
        commitCount: await fetchCommitCount(repo),
        commitCountSource: "github"
      };
    } catch (error) {
      console.warn(`Using estimated commit count for ${repo.name}:`, error);
      return {
        ...repo,
        commitCount: estimateCommitCount(repo),
        commitCountSource: "estimated"
      };
    }
  });

  return runWithConcurrency(tasks, CONFIG.github.commitConcurrency);
}

async function fetchCommitCount(repo) {
  const [repoOwner, repoName] = repo.fullName.split("/");
  const url = `${CONFIG.github.api}/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/commits?sha=${encodeURIComponent(repo.defaultBranch)}&per_page=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" }
  });

  if (response.status === 409 || response.status === 404) return 0;
  if (response.status === 403 || response.status === 429) {
    const reset = response.headers.get("x-ratelimit-reset");
    throw new Error(`GitHub commit rate limit reached${reset ? ` reset:${reset}` : ""}`);
  }
  if (!response.ok) {
    throw new Error(`Commit count request failed: ${response.status}`);
  }

  const link = response.headers.get("Link") || "";
  const lastPage = link.match(/[?&]page=(\d+)>; rel="last"/);
  if (lastPage) return Number(lastPage[1]);

  const body = await response.json();
  return Array.isArray(body) ? body.length : 0;
}

function normalizeRepo(repo) {
  return {
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    language: repo.language || "Unknown",
    htmlUrl: repo.html_url,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    fork: Boolean(repo.fork),
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    size: repo.size || 0,
    defaultBranch: repo.default_branch || "main",
    commitCount: 0,
    commitCountSource: "pending"
  };
}

function fallbackPortfolio(owner, dataSource) {
  return {
    owner,
    fetchedAt: new Date().toISOString(),
    dataSource,
    repos: FALLBACK_REPOS.map((repo) => ({
      ...repo,
      commitCountSource: "fallback"
    }))
  };
}

function estimateCommitCount(repo) {
  const daysSincePush = Math.max(1, (Date.now() - new Date(repo.pushedAt || repo.updatedAt).getTime()) / 86400000);
  const recency = Math.max(0, 10 - Math.log1p(daysSincePush));
  const sizeSignal = Math.log1p(repo.size || 0) * 2.2;
  const socialSignal = (repo.stars || 0) * 2 + (repo.forks || 0) * 1.4;
  return Math.max(1, Math.round(sizeSignal + recency + socialSignal));
}

async function runWithConcurrency(tasks, limit) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function describeFallbackSource(error) {
  const message = String(error?.message || error || "");
  const reset = message.match(/reset:([0-9]+)/)?.[1];
  if (reset) {
    const resetDate = new Date(Number(reset) * 1000);
    const resetLabel = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(resetDate);
    return `fallback: GitHub API rate limit exhausted until ${resetLabel}`;
  }
  if (message.includes("rate limit")) return "fallback: GitHub API rate limit exhausted";
  return "fallback: GitHub API unavailable";
}

function readCache({ allowExpired = false } = {}) {
  try {
    const raw = localStorage.getItem(CONFIG.github.cacheKey);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!allowExpired && Date.now() - cached.timestamp > CONFIG.github.cacheMs) return null;
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
    // Caching is only an optimization for GitHub rate limits.
  }
}
