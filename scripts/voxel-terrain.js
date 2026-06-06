import * as THREE from "three";
import { CONFIG, languageColor } from "./config.js";

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

export function createVoxelTerrain(scene, heightmap) {
  const group = new THREE.Group();
  group.name = "github-contribution-heightmap";
  scene.add(group);

  const pickables = [];
  const materials = new Map();
  const { weeks, days, cellSize } = CONFIG.terrain;
  const offsetX = ((weeks - 1) * cellSize) / -2;
  const offsetZ = ((days - 1) * cellSize) / -2;

  heightmap.cells.forEach((cell) => {
    const material = getMaterial(materials, cell.language, cell.isRepoPeak);
    const voxel = new THREE.Mesh(cubeGeometry, material);
    voxel.scale.set(0.94, cell.height, 0.94);
    voxel.userData.baseScale = { x: 0.94, y: cell.height, z: 0.94 };
    voxel.position.set(offsetX + cell.week * cellSize, cell.height / 2, offsetZ + cell.day * cellSize);
    voxel.castShadow = cell.height > 0.7;
    voxel.receiveShadow = true;
    voxel.userData.cell = cell;
    group.add(voxel);
    if (cell.repo) pickables.push(voxel);
  });

  addBase(group, weeks, days, cellSize);
  addWeekMarkers(group, weeks, days, cellSize, offsetX, offsetZ);

  return {
    pickables,
    update(elapsed) {
      group.rotation.y = Math.sin(elapsed * 0.08) * 0.015;
    },
    dispose() {
      scene.remove(group);
      materials.forEach((material) => material.dispose());
    }
  };
}

function getMaterial(materials, language, isRepoPeak) {
  const key = `${language}:${isRepoPeak}`;
  if (materials.has(key)) return materials.get(key);

  const color = new THREE.Color(languageColor(language));
  color.offsetHSL(0, isRepoPeak ? 0.08 : -0.03, isRepoPeak ? 0.08 : -0.04);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.74,
    metalness: 0.08,
    emissive: color,
    emissiveIntensity: isRepoPeak ? 0.08 : 0.025
  });

  materials.set(key, material);
  return material;
}

function addBase(group, weeks, days, cellSize) {
  const geometry = new THREE.BoxGeometry(weeks * cellSize + 2.4, 0.22, days * cellSize + 2.4);
  const material = new THREE.MeshStandardMaterial({
    color: 0x12241d,
    roughness: 0.92,
    metalness: 0.02
  });
  const base = new THREE.Mesh(geometry, material);
  base.position.y = -0.13;
  base.receiveShadow = true;
  group.add(base);
}

function addWeekMarkers(group, weeks, days, cellSize, offsetX, offsetZ) {
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf7f1df, transparent: true, opacity: 0.16 });
  const markerGeometry = new THREE.BoxGeometry(0.04, 0.05, days * cellSize + 1.3);

  for (let week = 0; week < weeks; week += 13) {
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(offsetX + week * cellSize, 0.04, offsetZ + ((days - 1) * cellSize) / 2);
    group.add(marker);
  }
}
