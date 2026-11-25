import * as THREE from 'three';

export const PLAYABLE_RADIUS = 82;
export const WORLD_RADIUS = 112;

// Smooth deterministic terrain height with a flat clearing around spawn (0, 14) and the Shadow Spire (0, -18)
export function groundHeightAt(x: number, z: number): number {
  const distOrigin = Math.hypot(x, z);
  const distSpawn = Math.hypot(x, z - 14);
  const distSpire = Math.hypot(x, z + 18);

  // Base multi-frequency trigonometric noise
  const n1 = Math.sin(x * 0.055) * Math.cos(z * 0.055) * 2.1;
  const n2 = Math.sin(x * 0.13 + 1.4) * Math.sin(z * 0.11 - 0.7) * 0.85;
  const n3 = Math.cos((x + z) * 0.032) * 1.4;
  let h = n1 + n2 + n3;

  // Gentle mountain lift in the Obsidian Mountains ring (54..76)
  if (distOrigin > 48) {
    const t = Math.min(1, (distOrigin - 48) / 26);
    h += t * t * (2.6 + Math.sin(Math.atan2(z, x) * 5) * 1.3);
  }

  // Natural perimeter cliff wall beyond PLAYABLE_RADIUS
  if (distOrigin > PLAYABLE_RADIUS) {
    const rim = (distOrigin - PLAYABLE_RADIUS) / (WORLD_RADIUS - PLAYABLE_RADIUS);
    const crag = 0.7 + 0.3 * Math.sin(Math.atan2(z, x) * 11);
    h += rim * rim * 24 * crag;
  }

  // Flatten spawn clearing & stone trail between spawn (0,14) and Spire (0,-18)
  const spawnFlat = Math.max(0, 1 - distSpawn / 13);
  const spireFlat = Math.max(0, 1 - distSpire / 14);
  const onTrail =
    z >= -20 && z <= 18 ? Math.max(0, 1 - Math.abs(x - Math.sin(z * 0.12) * 2.2) / 5.5) : 0;
  const flatten = Math.max(spawnFlat, spireFlat, onTrail * 0.85);

  return h * (1 - flatten * 0.88);
}

export function createGroundTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  ctx.fillStyle = '#cfcac2';
  ctx.fillRect(0, 0, size, size);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Deterministic pebble/soil grain
  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 2400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 3.5;
    const shade = 182 + Math.floor(rand() * 52);
    ctx.fillStyle = `rgb(${shade},${shade - 2},${shade - 5})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    const bShade = 95 + Math.floor(rand() * 85);
    bCtx.fillStyle = `rgb(${bShade},${bShade},${bShade})`;
    bCtx.fillRect(x, y, r * 1.3, r * 1.3);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(22, 22);
  map.anisotropy = Math.min(8, maxAnisotropy);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(22, 22);
  bumpMap.anisotropy = Math.min(8, maxAnisotropy);

  return { map, bumpMap };
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.62)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTerrainMesh(maxAnisotropy: number): {
  mesh: THREE.Mesh;
  disposables: Array<{ dispose: () => void }>;
} {
  const segs = 96;
  const size = WORLD_RADIUS * 2;
  const geom = new THREE.PlaneGeometry(size, size, segs, segs);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cForest = new THREE.Color(0x2d4537);
  const cTrail = new THREE.Color(0x524c58);
  const cDesert = new THREE.Color(0x6e563b);
  const cMount = new THREE.Color(0x3f3c4e);
  const cCursed = new THREE.Color(0x3b1f38);
  const cCliff = new THREE.Color(0x221d2b);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeightAt(x, z);
    pos.setY(i, y);

    const dist = Math.hypot(x, z);
    if (dist < 32) {
      tmp.copy(cForest);
      const t = Math.max(0, (dist - 24) / 8);
      tmp.lerp(cDesert, t);
    } else if (dist < 54) {
      tmp.copy(cDesert);
      const t = Math.max(0, (dist - 46) / 8);
      tmp.lerp(cMount, t);
    } else if (dist < 76) {
      tmp.copy(cMount);
      const t = Math.max(0, (dist - 68) / 8);
      tmp.lerp(cCursed, t);
    } else {
      tmp.copy(cCursed);
      const t = Math.min(1, (dist - 78) / 14);
      tmp.lerp(cCliff, t);
    }

    // Highlight curved flagstone trail between spawn and Shadow Spire
    if (z >= -20 && z <= 18) {
      const trailDist = Math.abs(x - Math.sin(z * 0.12) * 2.2);
      if (trailDist < 3.6) {
        tmp.lerp(cTrail, 1 - trailDist / 3.6);
      }
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const { map, bumpMap } = createGroundTextures(maxAnisotropy);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    map,
    bumpMap,
    bumpScale: 0.25,
    roughness: 0.88,
    metalness: 0.06,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  return { mesh, disposables: [geom, mat, map, bumpMap] };
}

export interface WorldPropsResult {
  group: THREE.Group;
  spireCrystal: THREE.Mesh;
  disposables: Array<{ dispose: () => void }>;
}

export function buildWorldProps(isSoftwareGl: boolean): WorldPropsResult {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  // Deterministic RNG for scenery placement
  let seed = 9001;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // --- 1. Monumental Shadow Spire Citadel Landmark at (0, -18) ---
  const spireGroup = new THREE.Group();
  const spireY = groundHeightAt(0, -18);
  spireGroup.position.set(0, spireY, -18);

  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x262134,
    roughness: 0.42,
    metalness: 0.55,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xc99642,
    roughness: 0.25,
    metalness: 0.85,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7c3aed,
    emissiveIntensity: 1.6,
    roughness: 0.14,
    metalness: 0.3,
  });
  disposables.push(obsidianMat, goldTrimMat, crystalMat);

  // Stepped dais base
  const dais1Geo = new THREE.CylinderGeometry(7.2, 8.2, 0.7, 8);
  const dais1 = new THREE.Mesh(dais1Geo, obsidianMat);
  dais1.position.y = 0.35;
  dais1.receiveShadow = true;
  spireGroup.add(dais1);

  const dais2Geo = new THREE.CylinderGeometry(5.4, 6.2, 0.55, 8);
  const dais2 = new THREE.Mesh(dais2Geo, obsidianMat);
  dais2.position.y = 0.95;
  dais2.receiveShadow = true;
  spireGroup.add(dais2);

  // Twin obsidian monolith pillars framing the spire gate
  const pillarGeo = new THREE.CylinderGeometry(0.95, 1.35, 13.6, 8);
  const capGeo = new THREE.ConeGeometry(1.1, 2.8, 8);
  const ringGeo = new THREE.TorusGeometry(1.18, 0.14, 8, 16);
  disposables.push(dais1Geo, dais2Geo, pillarGeo, capGeo, ringGeo);

  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(pillarGeo, obsidianMat);
    p.position.set(side * 4.5, 7.6, 0);
    p.castShadow = !isSoftwareGl;
    p.receiveShadow = true;
    spireGroup.add(p);

    const cap = new THREE.Mesh(capGeo, goldTrimMat);
    cap.position.set(side * 4.5, 15.8, 0);
    spireGroup.add(cap);

    const collar = new THREE.Mesh(ringGeo, goldTrimMat);
    collar.position.set(side * 4.5, 14.1, 0);
    collar.rotation.x = Math.PI / 2;
    spireGroup.add(collar);
  }

  // Upper arch crown locked cleanly onto pillar capitals
  const archGeo = new THREE.TorusGeometry(4.5, 0.48, 8, 24, Math.PI);
  const arch = new THREE.Mesh(archGeo, obsidianMat);
  arch.position.set(0, 14.1, 0);
  spireGroup.add(arch);

  // Floating Ascendant Void Crystal at center of Spire
  const crystalGeo = new THREE.OctahedronGeometry(1.75, 0);
  const spireCrystal = new THREE.Mesh(crystalGeo, crystalMat);
  spireCrystal.position.set(0, 8.2, 0);
  spireCrystal.scale.set(0.85, 1.65, 0.85);
  spireGroup.add(spireCrystal);

  // Subtle gold rune ring on dais
  const runeRingGeo = new THREE.RingGeometry(4.2, 4.75, 24);
  const runeRingMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.55,
  });
  const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
  runeRing.rotation.x = -Math.PI / 2;
  runeRing.position.y = 1.26;
  spireGroup.add(runeRing);
  disposables.push(archGeo, crystalGeo, runeRingGeo, runeRingMat);

  group.add(spireGroup);

  // --- 2. Instanced Pine/Shadow Trees (2-part: trunks + layered canopies) ---
  const treeCoords: Array<{ x: number; y: number; z: number; scale: number; rot: number }> = [];
  for (let i = 0; i < 110; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 12 + rand() * 58;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Keep spawn clearing, trail, and Spire plaza clear
    if (Math.hypot(x, z - 14) < 10) continue;
    if (Math.hypot(x, z + 18) < 12) continue;
    if (z >= -20 && z <= 18 && Math.abs(x - Math.sin(z * 0.12) * 2.2) < 5.5) continue;
    // Fewer trees in Ashen Desert (east/south ring 34..52)
    if (radius > 35 && radius < 52 && rand() > 0.32) continue;
    treeCoords.push({
      x,
      y: groundHeightAt(x, z),
      z,
      scale: 0.85 + rand() * 0.6,
      rot: rand() * Math.PI * 2,
    });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 3.0, 6);
  trunkGeo.translate(0, 1.5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2c26, roughness: 0.92, metalness: 0.04 });

  const foliage1Geo = new THREE.ConeGeometry(1.9, 3.8, 7);
  foliage1Geo.translate(0, 3.9, 0);
  const foliage2Geo = new THREE.ConeGeometry(1.35, 3.1, 7);
  foliage2Geo.translate(0, 5.7, 0);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.05 });

  disposables.push(trunkGeo, trunkMat, foliage1Geo, foliage2Geo, foliageMat);

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
  const fol1Inst = new THREE.InstancedMesh(foliage1Geo, foliageMat, treeCoords.length);
  const fol2Inst = new THREE.InstancedMesh(foliage2Geo, foliageMat, treeCoords.length);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  treeCoords.forEach((t, idx) => {
    dummy.position.set(t.x, t.y - 0.15, t.z);
    dummy.rotation.set(0, t.rot, 0);
    dummy.scale.setScalar(t.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    fol1Inst.setMatrixAt(idx, dummy.matrix);
    fol2Inst.setMatrixAt(idx, dummy.matrix);

    const dist = Math.hypot(t.x, t.z);
    if (dist > 54) {
      color.setHex(0x4b2f5e).offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    } else if (dist > 34) {
      color.setHex(0x5d4c2f).offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    } else {
      color.setHex(0x21483b).offsetHSL(0, 0, (rand() - 0.5) * 0.09);
    }
    fol1Inst.setColorAt(idx, color);
    color.offsetHSL(0, 0, 0.05);
    fol2Inst.setColorAt(idx, color);
  });
  trunkInst.computeBoundingSphere();
  fol1Inst.computeBoundingSphere();
  fol2Inst.computeBoundingSphere();
  if (!isSoftwareGl) {
    trunkInst.castShadow = true;
    fol1Inst.castShadow = true;
  }
  group.add(trunkInst, fol1Inst, fol2Inst);

  // --- 3. Instanced Giant Bioluminescent Mushrooms (4th World Object Type from v3.0!) ---
  const mushCoords: Array<{ x: number; y: number; z: number; scale: number; rot: number }> = [];
  for (let i = 0; i < 48; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 8 + rand() * 68;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.hypot(x, z - 14) < 6) continue;
    if (Math.hypot(x, z + 18) < 9) continue;
    mushCoords.push({
      x,
      y: groundHeightAt(x, z),
      z,
      scale: 0.75 + rand() * 0.85,
      rot: rand() * Math.PI * 2,
    });
  }

  const stemGeo = new THREE.CylinderGeometry(0.14, 0.24, 1.0, 7);
  stemGeo.translate(0, 0.5, 0);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c8, roughness: 0.82, metalness: 0.02 });
  const capMushGeo = new THREE.ConeGeometry(0.82, 0.55, 8);
  capMushGeo.translate(0, 1.15, 0);
  const capMushMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x3b1764,
    emissiveIntensity: 0.6,
    roughness: 0.35,
    metalness: 0.1,
  });
  disposables.push(stemGeo, stemMat, capMushGeo, capMushMat);

  const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, mushCoords.length);
  const capMushInst = new THREE.InstancedMesh(capMushGeo, capMushMat, mushCoords.length);
  mushCoords.forEach((m, idx) => {
    dummy.position.set(m.x, m.y - 0.08, m.z);
    dummy.rotation.set((rand() - 0.5) * 0.15, m.rot, (rand() - 0.5) * 0.15);
    dummy.scale.setScalar(m.scale);
    dummy.updateMatrix();
    stemInst.setMatrixAt(idx, dummy.matrix);
    capMushInst.setMatrixAt(idx, dummy.matrix);
    const palette = [0x9333ea, 0x22d3ee, 0xe879f9, 0xf59e0b];
    color.setHex(palette[idx % palette.length]);
    capMushInst.setColorAt(idx, color);
  });
  stemInst.computeBoundingSphere();
  capMushInst.computeBoundingSphere();
  group.add(stemInst, capMushInst);

  // --- 4. Instanced Obsidian Rocks & Perimeter Monoliths ---
  const rockCoords: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number }> = [];
  for (let i = 0; i < 64; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 14 + rand() * 64;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.hypot(x, z - 14) < 9 || Math.hypot(x, z + 18) < 11) continue;
    rockCoords.push({
      x,
      y: groundHeightAt(x, z),
      z,
      sx: 0.9 + rand() * 1.9,
      sy: 0.7 + rand() * 1.8,
      sz: 0.9 + rand() * 1.9,
      rot: rand() * Math.PI * 2,
    });
  }
  // Natural ring of perimeter crags around PLAYABLE_RADIUS + 4
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2 + (rand() - 0.5) * 0.1;
    const radius = PLAYABLE_RADIUS + 3 + rand() * 5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    rockCoords.push({
      x,
      y: groundHeightAt(x, z),
      z,
      sx: 3.5 + rand() * 3.0,
      sy: 6.5 + rand() * 8.0,
      sz: 3.5 + rand() * 3.0,
      rot: rand() * Math.PI * 2,
    });
  }

  const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
  rockGeo.translate(0, 0.55, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.14 });
  disposables.push(rockGeo, rockMat);

  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCoords.length);
  rockCoords.forEach((r, idx) => {
    dummy.position.set(r.x, r.y - 0.3, r.z);
    dummy.rotation.set(0, r.rot, 0);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    rockInst.setMatrixAt(idx, dummy.matrix);
    color.setHex(0x413c4f).offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    rockInst.setColorAt(idx, color);
  });
  rockInst.computeBoundingSphere();
  group.add(rockInst);

  // --- 5. Trail Lantern Obelisks leading from Spawn to Shadow Spire ---
  const obeliskBaseGeo = new THREE.BoxGeometry(0.85, 2.2, 0.85);
  const obeliskOrbGeo = new THREE.OctahedronGeometry(0.36, 0);
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xf5a623,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.3,
  });
  disposables.push(obeliskBaseGeo, obeliskOrbGeo, orbMat);

  const trailZPositions = [9, 1, -7];
  for (const tz of trailZPositions) {
    const centerX = Math.sin(tz * 0.12) * 2.2;
    for (const side of [-1, 1]) {
      const ox = centerX + side * 4.2;
      const oy = groundHeightAt(ox, tz);
      const col = new THREE.Mesh(obeliskBaseGeo, obsidianMat);
      col.position.set(ox, oy + 1.1, tz);
      group.add(col);
      const orb = new THREE.Mesh(obeliskOrbGeo, orbMat);
      orb.position.set(ox, oy + 2.65, tz);
      group.add(orb);
    }
  }

  return { group, spireCrystal, disposables };
}
