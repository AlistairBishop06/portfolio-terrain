import * as THREE from "three";

export function startRenderLoop({ renderer, scene, camera, controls, picker, update, maxPixelRatio = 1.4 }) {
  const clock = new THREE.Clock();
  let lastShadowUpdate = -Infinity;
  let qualityWindowTime = 0;
  let qualityWindowFrames = 0;
  let qualityCooldown = 0;
  let frameCount = 0;
  let lastShadowFrame = -Infinity;

  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    controls.update(delta);
    picker.update(performance.now());
    update?.(elapsed, delta, camera);

    // The landscape moves very slowly, so a 12 Hz shadow refresh looks continuous
    // while avoiding a full shadow-map render on every display frame.
    frameCount += 1;
    if (elapsed - lastShadowUpdate >= 1 / 12 && frameCount - lastShadowFrame >= 4) {
      renderer.shadowMap.needsUpdate = true;
      lastShadowUpdate = elapsed;
      lastShadowFrame = frameCount;
    }

    renderer.render(scene, camera);
    renderer.shadowMap.needsUpdate = false;

    qualityWindowTime += Math.min(delta, 0.1);
    qualityWindowFrames += 1;
    qualityCooldown = Math.max(0, qualityCooldown - delta);

    if (qualityWindowTime >= 2 && qualityCooldown === 0) {
      const fps = qualityWindowFrames / qualityWindowTime;
      const currentRatio = renderer.getPixelRatio();
      const targetRatio = Math.min(window.devicePixelRatio, maxPixelRatio);

      if (fps < 48 && currentRatio > 0.85) {
        renderer.setPixelRatio(Math.max(0.85, currentRatio - 0.15));
        qualityCooldown = 3;
      } else if (fps > 58 && currentRatio < targetRatio) {
        renderer.setPixelRatio(Math.min(targetRatio, currentRatio + 0.1));
        qualityCooldown = 4;
      }

      qualityWindowTime = 0;
      qualityWindowFrames = 0;
    }
  });
}
