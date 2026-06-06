import * as THREE from "three";
import { CONFIG } from "./config.js";

export function createCameraControls(camera, canvas) {
  const target = new THREE.Vector3(CONFIG.camera.target.x, CONFIG.camera.target.y, CONFIG.camera.target.z);
  const desiredTarget = target.clone();
  const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
  const keys = new Set();
  const pointer = { active: false, x: 0, y: 0 };
  const bounds = CONFIG.terrain.size * 0.42;

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

    spherical.theta -= dx * 0.0052;
    spherical.phi = clamp(spherical.phi - dy * 0.0048, 0.28, Math.PI / 2.12);
  });

  function stopPointer(event) {
    pointer.active = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  canvas.addEventListener("pointerup", stopPointer);
  canvas.addEventListener("pointercancel", stopPointer);

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    spherical.radius = clamp(
      spherical.radius + event.deltaY * 0.022,
      CONFIG.camera.minDistance,
      CONFIG.camera.maxDistance
    );
  }, { passive: false });

  return {
    update(delta) {
      const speed = delta * (11 + spherical.radius * 0.1);
      const forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
      const side = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));

      const angle = spherical.theta;
      const forwardVector = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const sideVector = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));

      desiredTarget.addScaledVector(forwardVector, -forward * speed);
      desiredTarget.addScaledVector(sideVector, side * speed);
      desiredTarget.x = clamp(desiredTarget.x, -bounds, bounds);
      desiredTarget.z = clamp(desiredTarget.z, -bounds, bounds);

      target.lerp(desiredTarget, 0.12);
      const desiredPosition = new THREE.Vector3().setFromSpherical(spherical).add(target);
      camera.position.lerp(desiredPosition, 0.14);
      camera.lookAt(target);
    }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
