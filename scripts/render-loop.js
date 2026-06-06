import * as THREE from "three";

export function startRenderLoop({ renderer, scene, camera, controls, picker, update }) {
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    controls.update(delta);
    picker.update();
    update?.(elapsed, delta, camera);
    renderer.render(scene, camera);
  });
}
