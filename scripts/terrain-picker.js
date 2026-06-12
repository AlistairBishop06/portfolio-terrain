import * as THREE from "three";

export function createTerrainPicker(camera, canvas) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(10, 10);
  let targets = [];
  let hovered = null;
  let onSelectCallback = () => {};
  let onHoverCallback = () => {};
  let pointerInside = false;
  let pointerDirty = false;
  let pointerPosition = null;
  let lastPickAt = 0;

  canvas.addEventListener("pointermove", (event) => {
    updatePointer(event, canvas, pointer);
    pointerInside = true;
    pointerDirty = true;
    pointerPosition = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener("pointerleave", () => {
    pointerInside = false;
    pointerDirty = false;
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
    update(now = performance.now()) {
      if (!pointerInside) return;
      if (!pointerDirty && now - lastPickAt < 50) return;

      hovered = pick(raycaster, camera, pointer, targets);
      pointerDirty = false;
      lastPickAt = now;
      canvas.style.cursor = hovered ? "pointer" : "grab";
      onHoverCallback(hovered?.repo ?? null, pointerPosition);
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
  const hit = raycaster.intersectObjects(targets, false)[0] ?? null;
  if (!hit) return null;
  const object = hit.object;
  const instanceRepo = Number.isInteger(hit.instanceId)
    ? object.userData.repos?.[hit.instanceId]
    : null;
  return {
    object,
    repo: instanceRepo ?? object.userData.repo ?? resolveRepo(object)
  };
}

function resolveRepo(object) {
  let cursor = object.parent;
  while (cursor) {
    if (cursor.userData.repo) return cursor.userData.repo;
    cursor = cursor.parent;
  }
  return null;
}
