import { CONFIG } from "./scripts/config.js";
import { getDom, setLoading, updateStats } from "./scripts/dom-ui.js";
import { loadGitHubPortfolio } from "./scripts/github-api.js";
import { buildContributionHeightmap } from "./scripts/contribution-heightmap.js";
import { createThreeScene } from "./scripts/three-scene.js";
import { createCameraControls } from "./scripts/camera-controls.js";
import { createVoxelTerrain } from "./scripts/voxel-terrain.js";
import { createTerrainPicker } from "./scripts/terrain-picker.js";
import { showRepoPanel } from "./scripts/repo-panel.js";
import { startRenderLoop } from "./scripts/render-loop.js";

window.__terrainModuleStarted = true;

const dom = getDom();
const sceneKit = createThreeScene(dom.canvas);
const controls = createCameraControls(sceneKit.camera, dom.canvas);
const picker = createTerrainPicker(sceneKit.camera, dom.canvas);

let activeTerrain = null;

async function boot({ forceRefresh = false } = {}) {
  setLoading(dom, true, forceRefresh ? "Refreshing GitHub terrain..." : "Loading public GitHub activity...");

  try {
    const portfolio = await loadGitHubPortfolio(CONFIG.github.owner, { forceRefresh });
    const heightmap = buildContributionHeightmap(portfolio);

    activeTerrain?.dispose();
    activeTerrain = createVoxelTerrain(sceneKit.scene, heightmap);

    updateStats(dom, heightmap.summary);
    picker.setTargets(activeTerrain.pickables);
    showRepoPanel(dom, heightmap.featuredRepo);
    setLoading(dom, false);
  } catch (error) {
    console.error(error);
    setLoading(dom, true, "GitHub data could not be loaded. Check the console for details.");
  }
}

dom.refresh.addEventListener("click", () => boot({ forceRefresh: true }));

picker.onSelect((cell) => {
  if (cell?.repo) {
    showRepoPanel(dom, cell.repo);
  }
});

startRenderLoop({
  ...sceneKit,
  controls,
  picker,
  update: (elapsed) => activeTerrain?.update(elapsed)
});

boot();
