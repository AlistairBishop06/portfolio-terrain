import * as THREE from "three";
import { CONFIG, languageIcon } from "./config.js";

export function createWorldMap(scene, landscape) {
  const group = new THREE.Group();
  group.name = "github-repository-landscape";
  scene.add(group);

  const animated = [];
  const pickables = [];

  group.add(createTerrainMesh(landscape));
  group.add(createWaterPlane(landscape));
  addWaterDetails(group, landscape);
  addBiomeFloorDressing(group, landscape);
  addBiomeProps(group, landscape);
  addRepositoryFlags(group, landscape, pickables, animated);
  addAtmosphere(group, landscape, animated);

  return {
    pickables,
    update(elapsed, camera) {
      animated.forEach((item) => item(elapsed, camera));
      group.rotation.y = Math.sin(elapsed * 0.05) * 0.012;
    },
    dispose() {
      scene.remove(group);
      disposeObject(group);
    }
  };
}

function createTerrainMesh(landscape) {
  const { size, segments } = landscape.world;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = [];

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const sample = landscape.sample(x, z);
    positions.setY(index, sample.height);
    colors.push(sample.color[0], sample.color[1], sample.color[2]);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.02
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "smooth-biome-terrain";
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

function createWaterPlane(landscape) {
  const geometry = new THREE.CircleGeometry(landscape.world.size * 0.56, 128);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x4dbbd9,
    transparent: true,
    opacity: 0.28,
    roughness: 0.18,
    metalness: 0.02,
    transmission: 0.15
  });

  const water = new THREE.Mesh(geometry, material);
  water.name = "soft-water-table";
  water.position.y = landscape.world.waterLevel;
  water.receiveShadow = true;
  return water;
}

function addWaterDetails(group, landscape) {
  landscape.groups.forEach((biomeGroup) => {
    if (!["alpine", "coast", "meadow"].includes(biomeGroup.key)) return;

    const material = new THREE.MeshStandardMaterial({
      color: biomeGroup.key === "alpine" ? 0x8fd9ff : 0x63cddd,
      emissive: 0x123f56,
      emissiveIntensity: 0.12,
      roughness: 0.24,
      transparent: true,
      opacity: 0.72
    });

    const points = [];
    for (let step = 0; step < 6; step += 1) {
      const t = step / 5;
      const x = biomeGroup.x + (t - 0.5) * 16 + Math.sin(t * Math.PI * 2 + biomeGroup.index) * 2.5;
      const z = biomeGroup.z + Math.cos(t * Math.PI + biomeGroup.index) * 4.2;
      points.push(new THREE.Vector3(x, landscape.sample(x, z).height + 0.08, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const river = new THREE.Mesh(new THREE.TubeGeometry(curve, 56, 0.08, 8, false), material);
    river.name = `${biomeGroup.key}-stream`;
    group.add(river);

    const pondX = biomeGroup.x + Math.cos(biomeGroup.angle + 0.9) * 5.2;
    const pondZ = biomeGroup.z + Math.sin(biomeGroup.angle + 0.9) * 5.2;
    const pond = new THREE.Mesh(new THREE.CircleGeometry(1.6 + biomeGroup.importance * 1.2, 36), material.clone());
    pond.geometry.rotateX(-Math.PI / 2);
    pond.position.set(pondX, landscape.sample(pondX, pondZ).height + 0.045, pondZ);
    group.add(pond);
  });
}

function addRepositoryFlags(group, landscape, pickables, animated) {
  landscape.repos.forEach((repo, index) => {
    const landmark = new THREE.Group();
    const baseY = repo.height + 0.1;
    const scale = repo.landmarkScale;

    landmark.position.set(repo.x, baseY, repo.z);
    landmark.userData.repo = repo;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035 * scale, 0.055 * scale, 2.4 * scale, 10),
      new THREE.MeshStandardMaterial({ color: 0xf4ead0, roughness: 0.56, metalness: 0.25 })
    );
    pole.position.y = 1.18 * scale;
    pole.castShadow = true;
    pole.userData.repo = repo;
    landmark.add(pole);
    pickables.push(pole);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25 * scale, 0.82 * scale, 10, 2),
      new THREE.MeshBasicMaterial({
        map: createFlagTexture(repo),
        transparent: true,
        side: THREE.DoubleSide
      })
    );
    flag.name = `flag-${repo.name}`;
    flag.position.set(0.66 * scale, 2.05 * scale, 0);
    flag.userData.repo = repo;
    landmark.add(flag);
    pickables.push(flag);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32 * scale, 0.46 * scale, 0.18 * scale, 18),
      new THREE.MeshStandardMaterial({
        color: repo.biome.accent,
        emissive: repo.biome.accent,
        emissiveIntensity: 0.05,
        roughness: 0.72
      })
    );
    base.position.y = 0.05 * scale;
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData.repo = repo;
    landmark.add(base);
    pickables.push(base);

    group.add(landmark);

    animated.push((elapsed, camera) => {
      landmark.position.y = baseY + Math.sin(elapsed * 1.4 + index) * 0.035;
      if (camera) {
        landmark.lookAt(camera.position.x, landmark.position.y, camera.position.z);
      }
      flag.rotation.z = Math.sin(elapsed * 2.2 + index * 0.7) * 0.035;
    });
  });
}

function createFlagTexture(repo) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  const accent = repo.biome.accent;
  const base = repo.biome.secondary;

  context.clearRect(0, 0, canvas.width, canvas.height);
  roundedRect(context, 10, 12, 232, 132, 18, base);
  context.fillStyle = accent;
  context.beginPath();
  context.moveTo(10, 12);
  context.lineTo(242, 12);
  context.lineTo(242, 62);
  context.quadraticCurveTo(138, 92, 10, 56);
  context.closePath();
  context.fill();

  context.globalAlpha = 0.22;
  context.fillStyle = "#ffffff";
  for (let x = -10; x < 260; x += 28) {
    context.fillRect(x, 112, 18, 4);
  }
  context.globalAlpha = 1;

  context.fillStyle = "#111714";
  context.font = "800 58px Segoe UI, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(languageIcon(repo.language), 126, 74);

  context.fillStyle = "rgba(255,255,255,0.88)";
  context.font = "700 20px Segoe UI, Arial, sans-serif";
  context.fillText(repo.language || "Unknown", 126, 124);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addBiomeProps(group, landscape) {
  landscape.repos.forEach((repo) => {
    const count = Math.round((10 + repo.normalizedCommit * 24) * CONFIG.terrain.propDensity);
    for (let index = 0; index < count; index += 1) {
      const seed = randomFromString(`${repo.fullName}:prop:${index}`);
      const angle = seed * Math.PI * 2 + index * 1.71;
      const radius = 1.35 + randomFromString(`${repo.name}:radius:${index}`) * (5.8 + repo.normalizedCommit * 7.2);
      const x = repo.x + Math.cos(angle) * radius;
      const z = repo.z + Math.sin(angle) * radius;
      const sample = landscape.sample(x, z);
      if (sample.height < landscape.world.waterLevel + 0.06) continue;

      const prop = createProp(repo.biome.propBias, seed, repo.normalizedCommit);
      prop.position.set(x, sample.height, z);
      prop.rotation.y = angle;
      prop.scale.setScalar(0.56 + seed * 0.54 + repo.normalizedCommit * 0.42);
      group.add(prop);
    }

    if (repo.index % 4 === 0) {
      const fauna = createFauna(repo.biome.accent);
      const x = repo.x + 2.4;
      const z = repo.z - 1.6;
      fauna.position.set(x, landscape.sample(x, z).height + 0.08, z);
      fauna.rotation.y = randomFromString(`${repo.name}:fauna`) * Math.PI * 2;
      group.add(fauna);
    }
  });
}

function addBiomeFloorDressing(group, landscape) {
  landscape.groups.forEach((biomeGroup) => {
    const count = Math.round((34 + biomeGroup.repos.length * 12) * CONFIG.terrain.propDensity);

    for (let index = 0; index < count; index += 1) {
      const seed = randomFromString(`${biomeGroup.key}:floor:${index}`);
      const radiusSeed = randomFromString(`${biomeGroup.key}:floor-radius:${index}`);
      const angle = biomeGroup.angle + seed * Math.PI * 2 + index * 0.77;
      const radius = Math.sqrt(radiusSeed) * (biomeGroup.radius * 1.75 + 5);
      const x = biomeGroup.x + Math.cos(angle) * radius;
      const z = biomeGroup.z + Math.sin(angle) * radius;
      const sample = landscape.sample(x, z);
      if (sample.height < landscape.world.waterLevel + 0.04) continue;
      if (sample.dominantBiome.key !== biomeGroup.key && seed > 0.3) continue;

      const detail = createFloorDetail(biomeGroup.biome, seed, index);
      detail.position.set(x, sample.height + 0.025, z);
      detail.rotation.y = angle;
      detail.scale.setScalar(0.45 + seed * 0.72);
      group.add(detail);
    }
  });
}

function createFloorDetail(biome, seed, index) {
  if (biome.key === "techForest") {
    return seed > 0.72 ? createGlowFlora() : createGrassTuft(0x34b86c);
  }
  if (biome.key === "alpine") {
    if (seed > 0.72) return createSnowPatch();
    return seed > 0.42 ? createRock(0xbecbd2) : createGrassTuft(0x3f6955);
  }
  if (biome.key === "meadow") {
    return seed > 0.2 ? createFlower((seed + index * 0.13) % 1) : createGrassTuft(0xb7d95a);
  }
  if (biome.key === "volcanic") {
    return seed > 0.58 ? createLavaCrack() : createRock(0x2b2623, seed > 0.82 ? 0xff6d3f : null);
  }
  if (biome.key === "canyon") {
    return seed > 0.55 ? createSandRipple() : createRock(0xb67645);
  }
  if (biome.key === "autumn") {
    return seed > 0.45 ? createLeafPatch() : createShrub(0x9d5934);
  }
  if (biome.key === "coast") {
    return seed > 0.5 ? createGrassTuft(0x8dcf7a) : createShellStone();
  }
  if (biome.key === "tundra") {
    return seed > 0.55 ? createCrystal() : createSnowPatch();
  }
  return seed > 0.5 ? createShrub(0x6f8f55) : createGrassTuft(0x9fb66a);
}

function createProp(bias, seed, activity) {
  if (bias === "alpine") return seed > 0.32 ? createPine(0x1f5d48, 0x6b4a2d) : createRock(0xb9c6c8);
  if (bias === "meadow") return seed > 0.55 ? createFlower(seed) : createShrub(0x75b85b);
  if (bias === "volcanic") return seed > 0.34 ? createRock(0x2a2523, 0xff6d3f) : createShrub(0x403831);
  if (bias === "canyon") return seed > 0.42 ? createRock(0xb47a4c) : createCactus();
  if (bias === "autumn") return seed > 0.24 ? createTree(0x8f452b, 0xe58a3b) : createRock(0x9f5940);
  if (bias === "coast") return seed > 0.5 ? createShrub(0x78bf79) : createGrassTuft(0xc9df7a);
  if (bias === "tundra") return seed > 0.56 ? createCrystal() : createRock(0xc8d9e7);
  if (bias === "forest") return seed > 0.22 ? createTree(0x3d8d52, 0x4ed996, activity) : createGlowFlora();
  return seed > 0.45 ? createShrub(0x6f8f55) : createRock(0x8a8f72);
}

function createTree(leafColor, accentColor, activity = 0.4) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.72, 8),
    new THREE.MeshStandardMaterial({ color: 0x69452c, roughness: 0.82 })
  );
  trunk.position.y = 0.36;
  trunk.castShadow = true;
  tree.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 12, 10),
    new THREE.MeshStandardMaterial({
      color: leafColor,
      roughness: 0.78,
      emissive: accentColor,
      emissiveIntensity: 0.04 + activity * 0.05
    })
  );
  crown.position.y = 0.92;
  crown.castShadow = true;
  tree.add(crown);
  return tree;
}

function createPine(leafColor, trunkColor) {
  const pine = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.085, 0.78, 7),
    new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.84 })
  );
  trunk.position.y = 0.38;
  trunk.castShadow = true;
  pine.add(trunk);

  for (let level = 0; level < 3; level += 1) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42 - level * 0.08, 0.72, 10),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.8 })
    );
    cone.position.y = 0.78 + level * 0.34;
    cone.castShadow = true;
    pine.add(cone);
  }
  return pine;
}

function createRock(color, glowColor = null) {
  const rock = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: glowColor || 0x000000,
    emissiveIntensity: glowColor ? 0.18 : 0,
    roughness: 0.92
  });
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), material);
  mesh.scale.set(1.2, 0.62, 0.86);
  mesh.position.y = 0.22;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  rock.add(mesh);
  return rock;
}

function createFlower(seed) {
  const flower = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.35, 5),
    new THREE.MeshStandardMaterial({ color: 0x3b7f41, roughness: 0.72 })
  );
  stem.position.y = 0.18;
  flower.add(stem);

  const petals = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(seed, 0.72, 0.62),
      emissive: 0x201000,
      emissiveIntensity: 0.08,
      roughness: 0.6
    })
  );
  petals.scale.set(1.25, 0.55, 1.25);
  petals.position.y = 0.38;
  flower.add(petals);
  return flower;
}

function createShrub(color) {
  const shrub = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
  for (let index = 0; index < 3; index += 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), material);
    mesh.position.set((index - 1) * 0.16, 0.13 + index * 0.035, Math.sin(index) * 0.08);
    mesh.castShadow = true;
    shrub.add(mesh);
  }
  return shrub;
}

function createGrassTuft(color) {
  const tuft = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  for (let index = 0; index < 5; index += 1) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.34, 5), material);
    blade.position.set((index - 2) * 0.055, 0.17, Math.sin(index * 2) * 0.04);
    blade.rotation.z = (index - 2) * 0.14;
    tuft.add(blade);
  }
  return tuft;
}

function createSnowPatch() {
  const patch = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xeaf7ff,
    roughness: 0.64,
    metalness: 0.02
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 14), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(1.35, 0.82, 1);
  patch.add(mesh);
  return patch;
}

function createLavaCrack() {
  const crack = new THREE.Group();
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.025, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xff6d3f,
      emissive: 0xff3b17,
      emissiveIntensity: 1.15,
      roughness: 0.38
    })
  );
  glow.position.y = 0.015;
  crack.add(glow);

  const crust = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.03, 0.025),
    new THREE.MeshStandardMaterial({ color: 0x1d1716, roughness: 0.92 })
  );
  crust.position.set(0, 0.038, 0.07);
  crack.add(crust);
  return crack;
}

function createSandRipple() {
  const ripple = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xd69a5b, roughness: 0.88 });
  for (let index = 0; index < 3; index += 1) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.72 - index * 0.08, 0.035, 0.055), material);
    ridge.position.set(0, 0.02, (index - 1) * 0.18);
    ridge.rotation.y = (index - 1) * 0.12;
    ridge.castShadow = true;
    ripple.add(ridge);
  }
  return ripple;
}

function createLeafPatch() {
  const leaves = new THREE.Group();
  const colors = [0xc95f2e, 0xe59438, 0x9f3f2f, 0xd6a24c];
  for (let index = 0; index < 5; index += 1) {
    const leaf = new THREE.Mesh(
      new THREE.CircleGeometry(0.08 + index * 0.006, 8),
      new THREE.MeshStandardMaterial({ color: colors[index % colors.length], roughness: 0.82 })
    );
    leaf.rotation.x = -Math.PI / 2;
    leaf.rotation.z = index * 0.9;
    leaf.position.set(Math.cos(index * 1.7) * 0.22, 0.01 + index * 0.003, Math.sin(index * 1.7) * 0.16);
    leaf.scale.set(1.5, 0.62, 1);
    leaves.add(leaf);
  }
  return leaves;
}

function createShellStone() {
  const shell = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 6),
    new THREE.MeshStandardMaterial({ color: 0xe7ddbd, roughness: 0.72 })
  );
  mesh.scale.set(1.45, 0.36, 0.78);
  mesh.position.y = 0.08;
  shell.add(mesh);
  return shell;
}

function createCactus() {
  const cactus = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x5f8b54, roughness: 0.84 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.8, 8), material);
  body.position.y = 0.4;
  body.castShadow = true;
  cactus.add(body);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.38, 7), material);
  arm.position.set(0.16, 0.52, 0);
  arm.rotation.z = Math.PI / 2.6;
  cactus.add(arm);
  return cactus;
}

function createCrystal() {
  const crystal = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.62, 5),
    new THREE.MeshStandardMaterial({
      color: 0xdff6ff,
      emissive: 0x8cdfff,
      emissiveIntensity: 0.18,
      roughness: 0.28,
      metalness: 0.08
    })
  );
  mesh.position.y = 0.31;
  mesh.castShadow = true;
  crystal.add(mesh);
  return crystal;
}

function createGlowFlora() {
  const flora = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.34, 6),
    new THREE.MeshStandardMaterial({ color: 0x204d36, roughness: 0.72 })
  );
  stem.position.y = 0.17;
  flora.add(stem);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0x7dffd0,
      emissive: 0x45e0a8,
      emissiveIntensity: 0.85,
      roughness: 0.34
    })
  );
  orb.position.y = 0.38;
  flora.add(orb);
  return flora;
}

function createFauna(color) {
  const fauna = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), material);
  body.scale.set(1.45, 0.72, 0.85);
  body.position.y = 0.22;
  fauna.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), material);
  head.position.set(0.24, 0.28, 0.04);
  fauna.add(head);
  return fauna;
}

function addAtmosphere(group, landscape, animated) {
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7f1df,
    transparent: true,
    opacity: 0.52,
    roughness: 0.95
  });

  const clouds = new THREE.Group();
  clouds.name = "moving-clouds";
  for (let index = 0; index < 8; index += 1) {
    const cloud = new THREE.Group();
    const seed = randomFromString(`cloud:${index}`);
    for (let puff = 0; puff < 4; puff += 1) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.9 + puff * 0.12, 10, 8), cloudMaterial);
      mesh.position.set((puff - 1.5) * 0.9, Math.sin(puff) * 0.12, Math.cos(puff) * 0.28);
      cloud.add(mesh);
    }
    cloud.position.set((seed - 0.5) * landscape.world.size, 18 + seed * 7, (randomFromString(`cloud-z:${index}`) - 0.5) * landscape.world.size);
    cloud.scale.setScalar(1.3 + seed * 1.6);
    clouds.add(cloud);
  }
  group.add(clouds);

  const particleGeometry = new THREE.BufferGeometry();
  const positions = [];
  for (let index = 0; index < 260; index += 1) {
    positions.push(
      (randomFromString(`particle-x:${index}`) - 0.5) * landscape.world.size,
      1.5 + randomFromString(`particle-y:${index}`) * 14,
      (randomFromString(`particle-z:${index}`) - 0.5) * landscape.world.size
    );
  }
  particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xf7f1df,
      size: 0.045,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    })
  );
  particles.name = "ambient-particles";
  group.add(particles);

  animated.push((elapsed) => {
    clouds.children.forEach((cloud, index) => {
      cloud.position.x += Math.sin(elapsed * 0.08 + index) * 0.006;
      cloud.position.z += Math.cos(elapsed * 0.06 + index) * 0.005;
    });
    particles.rotation.y = elapsed * 0.015;
  });
}

function roundedRect(context, x, y, width, height, radius, fillStyle) {
  context.fillStyle = fillStyle;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.fill();
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }
  });
}

function randomFromString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}
