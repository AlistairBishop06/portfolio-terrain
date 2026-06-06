import * as THREE from "three";
import { CONFIG } from "./config.js";

export function createThreeScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09120f);
  scene.fog = new THREE.FogExp2(0x9ab6a2, 0.018);

  const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.position.set(CONFIG.camera.start.x, CONFIG.camera.start.y, CONFIG.camera.start.z);
  camera.lookAt(CONFIG.camera.target.x, CONFIG.camera.target.y, CONFIG.camera.target.z);

  const hemi = new THREE.HemisphereLight(0xeef6ff, 0x152416, 2.25);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd39b, 3.7);
  sun.position.set(-28, 36, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -58;
  sun.shadow.camera.right = 58;
  sun.shadow.camera.top = 58;
  sun.shadow.camera.bottom = -58;
  scene.add(sun);

  const rim = new THREE.PointLight(0x68f0c3, 18, 88);
  rim.position.set(32, 14, -28);
  scene.add(rim);

  const dusk = new THREE.PointLight(0xff8f68, 9, 70);
  dusk.position.set(-26, 10, -34);
  scene.add(dusk);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}
