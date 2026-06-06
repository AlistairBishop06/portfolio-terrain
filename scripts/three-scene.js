import * as THREE from "three";
import { CONFIG } from "./config.js";

export function createThreeScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08130f, 0.03);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 240);
  camera.position.set(CONFIG.camera.start.x, CONFIG.camera.start.y, CONFIG.camera.start.z);
  camera.lookAt(CONFIG.camera.target.x, CONFIG.camera.target.y, CONFIG.camera.target.z);

  scene.add(new THREE.HemisphereLight(0xf7f1df, 0x12241d, 2.7));

  const sun = new THREE.DirectionalLight(0xffd19a, 3.4);
  sun.position.set(-18, 26, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 38;
  sun.shadow.camera.bottom = -38;
  scene.add(sun);

  const rim = new THREE.PointLight(0x81d7a8, 26, 60);
  rim.position.set(20, 12, -18);
  scene.add(rim);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}
