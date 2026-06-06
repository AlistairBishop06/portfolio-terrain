export function getDom() {
  return {
    canvas: document.querySelector("#terrain-canvas"),
    loading: document.querySelector("#loading"),
    loadingCopy: document.querySelector("#loading-copy"),
    refresh: document.querySelector("#refresh-data"),
    repoCount: document.querySelector("#repo-count"),
    commitCount: document.querySelector("#commit-count"),
    topLanguage: document.querySelector("#top-language"),
    topBiome: document.querySelector("#top-biome"),
    dataSource: document.querySelector("#data-source"),
    repoName: document.querySelector("#repo-name"),
    repoDescription: document.querySelector("#repo-description"),
    repoLanguage: document.querySelector("#repo-language"),
    repoBiome: document.querySelector("#repo-biome"),
    repoCommits: document.querySelector("#repo-commits"),
    repoStars: document.querySelector("#repo-stars"),
    repoForks: document.querySelector("#repo-forks"),
    repoUpdated: document.querySelector("#repo-updated"),
    repoLink: document.querySelector("#repo-link"),
    githubLink: document.querySelector("#github-link"),
    hoverLabel: document.querySelector("#hover-label")
  };
}

export function setLoading(dom, isLoading, copy = "Loading terrain...") {
  dom.loadingCopy.textContent = copy;
  dom.loading.classList.toggle("is-hidden", !isLoading);
  dom.refresh.disabled = isLoading;
}

export function updateStats(dom, summary) {
  dom.repoCount.textContent = numberFormat(summary.repoCount);
  dom.commitCount.textContent = numberFormat(summary.totalCommits);
  dom.topLanguage.textContent = summary.topLanguage;
  dom.topBiome.textContent = summary.topBiome;
  dom.dataSource.textContent = summary.dataSource;
}

export function showHoverLabel(dom, repo, position) {
  if (!repo || !position) {
    dom.hoverLabel.classList.remove("is-visible");
    return;
  }

  dom.hoverLabel.textContent = repo.name;
  dom.hoverLabel.style.transform = `translate(${position.x + 14}px, ${position.y + 14}px)`;
  dom.hoverLabel.classList.add("is-visible");
}

export function numberFormat(value) {
  return new Intl.NumberFormat("en", {
    notation: value > 9999 ? "compact" : "standard"
  }).format(value ?? 0);
}

export function dateFormat(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
