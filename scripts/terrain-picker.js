import * as THREE from "three";

export function createTerrainPicker(camera, canvas) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let targets = [];
  let selected = null;
  let callback = () => {};

  canvas.addEventListener("pointermove", (event) => {
    updatePointer(event, canvas, pointer);
    selected = pick(raycaster, camera, pointer, targets);
    canvas.style.cursor = selected ? "pointer" : "grab";
  });

  canvas.addEventListener("click", (event) => {
    updatePointer(event, canvas, pointer);
    selected = pick(raycaster, camera, pointer, targets);
    if (selected) callback(selected.userData.cell);
  });

  return {
    setTargets(nextTargets) {
      targets = nextTargets;
    },
    onSelect(nextCallback) {
      callback = nextCallback;
    },
    update() {
      const nextSelected = pick(raycaster, camera, pointer, targets);
      if (selected?.userData?.baseScale && selected !== nextSelected) {
        selected.scale.set(
          selected.userData.baseScale.x,
          selected.userData.baseScale.y,
          selected.userData.baseScale.z
        );
      }
      selected = nextSelected;
      if (selected?.userData?.baseScale) {
        selected.scale.set(
          selected.userData.baseScale.x * 1.12,
          selected.userData.baseScale.y,
          selected.userData.baseScale.z * 1.12
        );
      }
    }
  };
}

function updatePointer(event, canvas, pointer) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
}

function pick(raycaster, camera, pointer, targets) {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(targets, false)[0]?.object ?? null;
}
