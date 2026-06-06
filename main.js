import { CONFIG } from "./scripts/config.js";
import { getDom, setLoading, showHoverLabel, updateStats } from "./scripts/dom-ui.js";
import { loadGitHubPortfolio } from "./scripts/github-api.js";
import { buildLandscapeModel } from "./scripts/terrain-model.js";
import { createThreeScene } from "./scripts/three-scene.js";
import { createCameraControls } from "./scripts/camera-controls.js";
import { createWorldMap } from "./scripts/world-map.js";
import { createTerrainPicker } from "./scripts/terrain-picker.js";
import { showRepoPanel } from "./scripts/repo-panel.js";
import { startRenderLoop } from "./scripts/render-loop.js";

window.__terrainModuleStarted = true;

const dom = getDom();
const sceneKit = createThreeScene(dom.canvas);
const controls = createCameraControls(sceneKit.camera, dom.canvas);
const picker = createTerrainPicker(sceneKit.camera, dom.canvas);

let activeWorld = null;

async function boot({ forceRefresh = false } = {}) {
  setLoading(dom, true, forceRefresh ? "Refreshing GitHub landscape..." : "Fetching repositories and shaping terrain...");

  try {
    const portfolio = await loadGitHubPortfolio(CONFIG.github.owner, { forceRefresh });
    const landscape = buildLandscapeModel(portfolio);

    activeWorld?.dispose();
    activeWorld = createWorldMap(sceneKit.scene, landscape);

    updateStats(dom, landscape.summary);
    picker.setTargets(activeWorld.pickables);
    showRepoPanel(dom, landscape.summary.featuredRepo);
    setLoading(dom, false);
  } catch (error) {
    console.error(error);
    setLoading(dom, true, "The terrain could not be created. Check the console for details.");
  }
}

dom.refresh.addEventListener("click", () => boot({ forceRefresh: true }));

picker.onHover((repo, position) => {
  showHoverLabel(dom, repo, position);
});

picker.onSelect((repo) => {
  showRepoPanel(dom, repo);
});

startRenderLoop({
  ...sceneKit,
  controls,
  picker,
  update: (elapsed, delta, camera) => activeWorld?.update(elapsed, camera)
});

boot();
