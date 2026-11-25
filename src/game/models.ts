import * as THREE from 'three';
import { CLASS_DEFINITIONS } from './rules';
import { EnemyType, PlayerClassId } from './types';

export interface HeroRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  weaponPivot: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  cloak: THREE.Mesh;
  materialsToFlash: THREE.MeshStandardMaterial[];
  updateClassVisuals: (classId: PlayerClassId) => void;
}

export interface EnemyRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  telegraphRing: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  limbs: THREE.Object3D[];
  materialsToFlash: THREE.MeshStandardMaterial[];
  baseEmissives: THREE.Color[];
}

export function createHeroRig(
  classId: PlayerClassId,
  shadowTex: THREE.Texture,
  isSoftwareGl: boolean,
): HeroRig {
  const cls = CLASS_DEFINITIONS[classId];
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Contact shadow disc
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.05, 16), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  root.add(shadow);

  const armorMat = new THREE.MeshStandardMaterial({
    color: cls.primaryColor,
    roughness: 0.42,
    metalness: 0.55,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: cls.accentColor,
    emissive: cls.accentColor,
    emissiveIntensity: 0.4,
    roughness: 0.22,
    metalness: 0.8,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0x1b1528,
    roughness: 0.85,
    metalness: 0.05,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xd9dee8,
    roughness: 0.2,
    metalness: 0.9,
  });

  // Boots & legs (bottom-center grounded)
  const legGeo = new THREE.BoxGeometry(0.28, 0.72, 0.3);
  const leftLeg = new THREE.Mesh(legGeo, clothMat);
  leftLeg.position.set(-0.2, 0.36, 0);
  const rightLeg = new THREE.Mesh(legGeo, clothMat);
  rightLeg.position.set(0.2, 0.36, 0);
  bodyPivot.add(leftLeg, rightLeg);

  // Armored cuirass torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.88, 0.46), armorMat);
  torso.position.y = 1.12;
  torso.castShadow = !isSoftwareGl;
  bodyPivot.add(torso);

  // Chest crest
  const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), accentMat);
  crest.position.set(0, 1.24, 0.25);
  crest.scale.set(0.9, 1.3, 0.5);
  bodyPivot.add(crest);

  // Pauldrons
  const pauldronGeo = new THREE.SphereGeometry(0.26, 8, 6);
  const leftPauldron = new THREE.Mesh(pauldronGeo, accentMat);
  leftPauldron.position.set(-0.48, 1.46, 0);
  leftPauldron.scale.set(1.1, 0.85, 1.0);
  const rightPauldron = new THREE.Mesh(pauldronGeo, accentMat);
  rightPauldron.position.set(0.48, 1.46, 0);
  rightPauldron.scale.set(1.1, 0.85, 1.0);
  bodyPivot.add(leftPauldron, rightPauldron);

  // Helm + glowing visor
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.48), armorMat);
  helm.position.y = 1.82;
  helm.castShadow = !isSoftwareGl;
  bodyPivot.add(helm);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.1), accentMat);
  visor.position.set(0, 1.84, 0.23);
  bodyPivot.add(visor);

  // Flowing dark cloak behind back (-Z is forward in model? Wait: +Z is forward for Three.js lookAt/sin(yaw), so cloak sits on -Z)
  const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.1, 0.08), clothMat);
  cloak.position.set(0, 1.02, -0.32);
  cloak.rotation.x = 0.16;
  bodyPivot.add(cloak);

  // Weapon arm pivot (right side)
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.52, 1.28, 0.1);
  bodyPivot.add(weaponPivot);

  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6), accentMat);
  hilt.position.set(0, -0.05, 0.2);
  hilt.rotation.x = Math.PI / 2.2;
  weaponPivot.add(hilt);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.09), accentMat);
  guard.position.set(0, 0.06, 0.36);
  weaponPivot.add(guard);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 1.55), steelMat);
  blade.position.set(0, 0.18, 1.1);
  blade.rotation.x = -0.15;
  blade.castShadow = !isSoftwareGl;
  weaponPivot.add(blade);

  const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 1.48), accentMat);
  bladeEdge.position.set(0, 0.18, 1.1);
  bladeEdge.rotation.x = -0.15;
  weaponPivot.add(bladeEdge);

  const materialsToFlash = [armorMat, accentMat, clothMat];

  const updateClassVisuals = (newClassId: PlayerClassId) => {
    const def = CLASS_DEFINITIONS[newClassId];
    armorMat.color.setHex(def.primaryColor);
    accentMat.color.setHex(def.accentColor);
    accentMat.emissive.setHex(def.accentColor);
  };

  return {
    root,
    bodyPivot,
    weaponPivot,
    leftLeg,
    rightLeg,
    cloak,
    materialsToFlash,
    updateClassVisuals,
  };
}

export function createEnemyRig(
  type: EnemyType,
  shadowTex: THREE.Texture,
  isSoftwareGl: boolean,
): EnemyRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const shadowRadius = type === 'boss' ? 2.4 : type === 'wolf' ? 1.05 : 0.95;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(shadowRadius, 16),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  root.add(shadow);

  // Ground telegraph ring (visible during windup before heavy attacks)
  const telegraphRadius = type === 'boss' ? 4.8 : type === 'shade' ? 1.8 : 2.2;
  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(telegraphRadius * 0.72, telegraphRadius, 24),
    new THREE.MeshBasicMaterial({
      color: type === 'shade' ? 0x22d3ee : 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.08;
  telegraphRing.visible = false;
  root.add(telegraphRing);

  const limbs: THREE.Object3D[] = [];
  const materialsToFlash: THREE.MeshStandardMaterial[] = [];

  if (type === 'wolf') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0x3b3648, roughness: 0.88, metalness: 0.05 });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1d1828, roughness: 0.75, metalness: 0.1 });
    materialsToFlash.push(furMat, maneMat);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.54, 1.35), furMat);
    body.position.set(0, 0.68, 0);
    body.castShadow = !isSoftwareGl;
    bodyPivot.add(body);

    const mane = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.65, 6), maneMat);
    mane.position.set(0, 0.82, 0.45);
    mane.rotation.x = Math.PI / 2;
    bodyPivot.add(mane);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.58), furMat);
    head.position.set(0, 0.92, 0.82);
    bodyPivot.add(head);

    const earGeo = new THREE.ConeGeometry(0.09, 0.24, 4);
    const e1 = new THREE.Mesh(earGeo, maneMat);
    e1.position.set(-0.14, 1.18, 0.7);
    const e2 = new THREE.Mesh(earGeo, maneMat);
    e2.position.set(0.14, 1.18, 0.7);
    bodyPivot.add(e1, e2);

    const eyeGeo = new THREE.BoxGeometry(0.08, 0.06, 0.06);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.12, 0.96, 1.1);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.12, 0.96, 1.1);
    bodyPivot.add(eyeL, eyeR);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.62, 5), maneMat);
    tail.position.set(0, 0.85, -0.82);
    tail.rotation.x = -0.9;
    bodyPivot.add(tail);

    const legGeo = new THREE.BoxGeometry(0.16, 0.52, 0.16);
    const legOffsets: Array<[number, number]> = [
      [-0.22, 0.45],
      [0.22, 0.45],
      [-0.22, -0.45],
      [0.22, -0.45],
    ];
    for (const [lx, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, furMat);
      leg.position.set(lx, 0.26, lz);
      bodyPivot.add(leg);
      limbs.push(leg);
    }
  } else if (type === 'goblin') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x3b6e3c, roughness: 0.78, metalness: 0.05 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x573724, roughness: 0.88, metalness: 0.08 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.25, metalness: 0.85 });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 1.4,
    });
    materialsToFlash.push(skinMat, leatherMat);

    const legGeo = new THREE.BoxGeometry(0.22, 0.52, 0.22);
    const legL = new THREE.Mesh(legGeo, leatherMat);
    legL.position.set(-0.18, 0.26, 0);
    const legR = new THREE.Mesh(legGeo, leatherMat);
    legR.position.set(0.18, 0.26, 0);
    bodyPivot.add(legL, legR);
    limbs.push(legL, legR);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.68, 0.42), leatherMat);
    torso.position.set(0, 0.82, 0);
    torso.castShadow = !isSoftwareGl;
    bodyPivot.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.44), skinMat);
    head.position.set(0, 1.38, 0.08);
    bodyPivot.add(head);

    const earGeo = new THREE.ConeGeometry(0.08, 0.32, 4);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.34, 1.44, 0.05);
    earL.rotation.z = 1.1;
    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.34, 1.44, 0.05);
    earR.rotation.z = -1.1;
    bodyPivot.add(earL, earR);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), eyeMat);
    eyeL.position.set(-0.11, 1.42, 0.3);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), eyeMat);
    eyeR.position.set(0.11, 1.42, 0.3);
    bodyPivot.add(eyeL, eyeR);

    const cleaver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.95), bladeMat);
    cleaver.position.set(0.45, 0.92, 0.42);
    bodyPivot.add(cleaver);
    limbs.push(cleaver);
  } else if (type === 'shade') {
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x1e1638, roughness: 0.75, metalness: 0.2 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    materialsToFlash.push(robeMat, glowMat);

    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.45, 7), robeMat);
    skirt.position.set(0, 0.88, 0);
    skirt.castShadow = !isSoftwareGl;
    bodyPivot.add(skirt);

    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.62, 6), robeMat);
    cowl.position.set(0, 1.82, 0.02);
    bodyPivot.add(cowl);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.08), glowMat);
    eyeL.position.set(-0.1, 1.72, 0.24);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.08), glowMat);
    eyeR.position.set(0.1, 1.72, 0.24);
    bodyPivot.add(eyeL, eyeR);

    // Arcane bow arc
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.055, 6, 12, Math.PI), glowMat);
    bow.position.set(0.44, 1.25, 0.32);
    bow.rotation.y = Math.PI / 2;
    bodyPivot.add(bow);
    limbs.push(bow);
  } else {
    // Shadow King Boss — towering obsidian & crimson juggernaut
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x1a1426,
      roughness: 0.35,
      metalness: 0.72,
    });
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      emissive: 0xbe123c,
      emissiveIntensity: 1.4,
      roughness: 0.22,
      metalness: 0.4,
    });
    const crownGold = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      roughness: 0.22,
      metalness: 0.88,
    });
    materialsToFlash.push(obsidianMat, crimsonMat);

    const legGeo = new THREE.BoxGeometry(0.56, 1.25, 0.56);
    const legL = new THREE.Mesh(legGeo, obsidianMat);
    legL.position.set(-0.48, 0.62, 0);
    const legR = new THREE.Mesh(legGeo, obsidianMat);
    legR.position.set(0.48, 0.62, 0);
    bodyPivot.add(legL, legR);
    limbs.push(legL, legR);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.75, 1.05), obsidianMat);
    chest.position.set(0, 2.05, 0);
    chest.castShadow = !isSoftwareGl;
    bodyPivot.add(chest);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), crimsonMat);
    core.position.set(0, 2.15, 0.58);
    bodyPivot.add(core);

    const shoulderGeo = new THREE.ConeGeometry(0.55, 1.05, 5);
    const sL = new THREE.Mesh(shoulderGeo, obsidianMat);
    sL.position.set(-1.15, 2.85, 0);
    sL.rotation.z = 0.55;
    const sR = new THREE.Mesh(shoulderGeo, obsidianMat);
    sR.position.set(1.15, 2.85, 0);
    sR.rotation.z = -0.55;
    bodyPivot.add(sL, sR);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.82, 0.78), obsidianMat);
    head.position.set(0, 3.3, 0.06);
    bodyPivot.add(head);

    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 8), crownGold);
    crown.position.set(0, 3.82, 0.06);
    crown.rotation.x = Math.PI / 2;
    bodyPivot.add(crown);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.12), crimsonMat);
    visor.position.set(0, 3.32, 0.45);
    bodyPivot.add(visor);

    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 3.4), crimsonMat);
    sword.position.set(1.25, 2.0, 1.55);
    bodyPivot.add(sword);
    limbs.push(sword);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.06, 6, 20), crownGold);
    halo.position.set(0, 3.3, -0.55);
    bodyPivot.add(halo);
    limbs.push(halo);
  }

  // World-space mini health bar above enemy
  const barY = type === 'boss' ? 4.7 : type === 'wolf' ? 1.65 : 2.35;
  const barW = type === 'boss' ? 2.6 : 1.15;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW, 0.15),
    new THREE.MeshBasicMaterial({ color: 0x0b0714, side: THREE.DoubleSide }),
  );
  hpBarBg.position.set(0, barY, 0);
  root.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barW - 0.06, 0.09),
    new THREE.MeshBasicMaterial({
      color: type === 'boss' ? 0xf43f5e : type === 'shade' ? 0x22d3ee : 0xef4444,
      side: THREE.DoubleSide,
    }),
  );
  hpBarFill.position.set(0, barY, 0.01);
  root.add(hpBarFill);

  const baseEmissives = materialsToFlash.map((m) => m.emissive.clone());

  return {
    root,
    bodyPivot,
    telegraphRing,
    hpBarBg,
    hpBarFill,
    limbs,
    materialsToFlash,
    baseEmissives,
  };
}
