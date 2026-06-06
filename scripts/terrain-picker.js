import * as THREE from "three";

export function createTerrainPicker(camera, canvas) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(10, 10);
  let targets = [];
  let hovered = null;
  let onSelectCallback = () => {};
  let onHoverCallback = () => {};

  canvas.addEventListener("pointermove", (event) => {
    updatePointer(event, canvas, pointer);
    hovered = pick(raycaster, camera, pointer, targets);
    canvas.style.cursor = hovered ? "pointer" : "grab";
    onHoverCallback(hovered?.repo ?? null, { x: event.clientX, y: event.clientY });
  });

  canvas.addEventListener("pointerleave", () => {
    hovered = null;
    canvas.style.cursor = "grab";
    onHoverCallback(null);
  });

  canvas.addEventListener("click", (event) => {
    updatePointer(event, canvas, pointer);
    const selected = pick(raycaster, camera, pointer, targets);
    if (selected?.repo) onSelectCallback(selected.repo);
  });

  return {
    setTargets(nextTargets) {
      targets = nextTargets;
    },
    onSelect(nextCallback) {
      onSelectCallback = nextCallback;
    },
    onHover(nextCallback) {
      onHoverCallback = nextCallback;
    },
    update() {
      hovered = pick(raycaster, camera, pointer, targets);
    }
  };
}

function updatePointer(event, canvas, pointer) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
}

function pick(raycaster, camera, pointer, targets) {
  if (!targets.length) return null;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(targets, false)[0]?.object ?? null;
  if (!hit) return null;
  return { object: hit, repo: hit.userData.repo ?? resolveRepo(hit) };
}

function resolveRepo(object) {
  let cursor = object.parent;
  while (cursor) {
    if (cursor.userData.repo) return cursor.userData.repo;
    cursor = cursor.parent;
  }
  return null;
}
