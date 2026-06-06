import { dateFormat, numberFormat } from "./dom-ui.js";

export function showRepoPanel(dom, repo) {
  if (!repo) return;

  dom.repoName.textContent = repo.name;
  dom.repoDescription.textContent = repo.description || "Public repository activity contributes to this terrain cell.";
  dom.repoLanguage.textContent = repo.language || "Unknown";
  dom.repoStars.textContent = numberFormat(repo.stars);
  dom.repoUpdated.textContent = dateFormat(repo.pushedAt || repo.updatedAt);
  dom.repoLink.href = repo.htmlUrl;
  dom.repoLink.textContent = "View repository";
}
