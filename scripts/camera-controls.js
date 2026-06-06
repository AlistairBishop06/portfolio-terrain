import * as THREE from "three";
import { CONFIG } from "./config.js";

export function createCameraControls(camera, canvas) {
  const target = new THREE.Vector3(CONFIG.camera.target.x, CONFIG.camera.target.y, CONFIG.camera.target.z);
  const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
  const keys = new Set();
  const pointer = { active: false, x: 0, y: 0 };

  window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

  canvas.addEventListener("pointerdown", (event) => {
    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointer.active) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    spherical.theta -= dx * 0.006;
    spherical.phi = clamp(spherical.phi - dy * 0.006, 0.24, Math.PI / 2.05);
  });

  canvas.addEventListener("pointerup", (event) => {
    pointer.active = false;
    canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    spherical.radius = clamp(spherical.radius + event.deltaY * 0.018, 7, 48);
  }, { passive: false });

  return {
    update(delta) {
      const speed = delta * 9.5;
      const forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
      const side = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));

      target.x = clamp(target.x + side * speed, -28, 28);
      target.z = clamp(target.z - forward * speed, -10, 10);

      const desired = new THREE.Vector3().setFromSpherical(spherical).add(target);
      camera.position.lerp(desired, 0.12);
      camera.lookAt(target);
    }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
