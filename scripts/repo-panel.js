import { dateFormat, numberFormat } from "./dom-ui.js";

export function showRepoPanel(dom, repo) {
  if (!repo) return;

  dom.repoName.textContent = repo.name;
  dom.repoDescription.textContent = repo.description || "Public repository activity shapes this part of the terrain.";
  dom.repoLanguage.textContent = repo.language || "Unknown";
  dom.repoBiome.textContent = repo.groupLabel || repo.biome?.label || "Neutral Grassland";
  dom.repoCommits.textContent = numberFormat(repo.commitCount);
  dom.repoStars.textContent = numberFormat(repo.stars);
  dom.repoForks.textContent = numberFormat(repo.forks);
  dom.repoUpdated.textContent = dateFormat(repo.pushedAt || repo.updatedAt);
  dom.repoLink.href = repo.htmlUrl;
  dom.repoLink.textContent = "Open on GitHub";
}
