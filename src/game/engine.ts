import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import { CausalityEngine } from './causality';
import { createEnemyRig, createHeroRig, EnemyRig, HeroRig } from './models';
import {
  applyDamageToPlayer,
  calculateAttackDamage,
  CLASS_DEFINITIONS,
  COMBO_WINDOW_SECONDS,
  computeEffectiveStats,
  createEnemy,
  createInitialPlayer,
  DAY_CYCLE_SECONDS,
  equipNftInList,
  evaluateEnemyAIState,
  generateNftItem,
  getDomainCooldown,
  getDomainRange,
  getDropChanceForEnemy,
  getStreakTitle,
  getZoneAt,
  grantPlayerXp,
  isNightTime,
  MAX_ATTACK_TOKENS,
  NUKE_COOLDOWN_SECONDS,
  purchaseShopItem,
  RARITY_NAMES,
  ZONE_NAMES,
} from './rules';
import {
  CombatLogEntry,
  EnemyState,
  EnemyType,
  GamePhase,
  HudSnapshot,
  NftItem,
  PlayerClassId,
  PlayerState,
  STATUS_BURN,
  STATUS_FREEZE,
  STATUS_POISON,
  STATUS_STUN,
} from './types';
import {
  buildTerrainMesh,
  buildWorldProps,
  createContactShadowTexture,
  groundHeightAt,
  PLAYABLE_RADIUS,
} from './world';

const MAX_PARTICLES = 240;
const MAX_PROJECTILES = 24;
const GRAVITY = -26;
const JUMP_VELOCITY = 11.4;

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

interface ProjectileSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  life: number;
  mesh: THREE.Mesh;
}

// Module-scoped scratch vectors/matrices (zero GC inside animation loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _color = new THREE.Color();
const _skyDay = new THREE.Color(0x526b96);
const _skySunset = new THREE.Color(0x8a4b52);
const _skyNight = new THREE.Color(0x0b091a);
const _fogColor = new THREE.Color();
const _dummy = new THREE.Object3D();

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onFastBars?: (hpPct: number, trailingPct: number, stamPct: number) => void;
  onPhaseChange?: (phase: GamePhase) => void;
  onToggleMenu?: () => void;
}

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class ShadowRealmEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private domainGroup: THREE.Group;
  private nukeMesh: THREE.Mesh;
  private spireCrystal: THREE.Mesh;
  private shadowTex: THREE.CanvasTexture;
  private heroRig: HeroRig;
  private enemyRigs = new Map<number, EnemyRig>();
  private particleInst: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;
  private projectiles: ProjectileSlot[] = [];
  private disposables: Array<{ dispose: () => void }> = [];

  private sound = new SoundEngine();
  private causality = new CausalityEngine();

  private phase: GamePhase = 'title';
  private player: PlayerState;
  private enemies: EnemyState[] = [];
  private nfts: NftItem[] = [];
  private combatLog: CombatLogEntry[] = [];
  private nextEnemyId = 1;
  private nextLogId = 1;
  private nextNftId = 1;

  private dayTime = 18; // Start in crisp late-morning golden light
  private elapsedTime = 0;
  private hitstopTimer = 0;
  private trauma = 0;
  private nukeWaveTimer = 0;
  private bannerText = '';
  private bannerTone: 'gold' | 'violet' | 'red' | 'cyan' = 'gold';
  private bannerTimer = 0;
  private defeatDelayTimer = 0;
  private hudEmitAcc = 0;
  private titleTourAngle = 0;

  // Camera rig state (camYaw = 0 places camera at +Z looking toward -Z at the Shadow Spire)
  private camYaw = 0;
  private camPitch = 0.23;
  private camDist = 9.5;
  private camPosCurrent = new THREE.Vector3(0, 5.5, 24);
  private camLookCurrent = new THREE.Vector3(0, 2.5, 8);
  private rmbDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Input state
  private heldKeys = new Set<string>();
  private joystickX = 0;
  private joystickY = 0;
  private jumpBufferTimer = 0;
  private attackBufferTimer = 0;

  private frameId = 0;
  private lastFrameTs = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, callbacks: EngineCallbacks, initialClass: PlayerClassId = 'knight') {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    this.player = createInitialPlayer('Ascendant', initialClass);
    this.player.y = groundHeightAt(this.player.x, this.player.z);

    // WebGL Renderer with software-WebGL guard
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'game-canvas');
    container.appendChild(this.renderer.domElement);

    // Scene, Environment Map, Lighting & Fog
    this.scene = new THREE.Scene();
    this.scene.background = _skyDay.clone();
    this.scene.fog = new THREE.FogExp2(0x4b5c82, 0.0085);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = envRT.texture;
    pmrem.dispose();
    this.disposables.push(envRT);

    this.hemiLight = new THREE.HemisphereLight(0x9ab4e8, 0x2d2438, 0.9);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe6c2, 1.9);
    this.sunLight.position.set(28, 42, 22);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 120;
    const d = 34;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight, this.sunLight.target);

    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.25, 260);

    // Terrain & Props
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const terrain = buildTerrainMesh(maxAniso);
    this.scene.add(terrain.mesh);
    this.disposables.push(...terrain.disposables);

    const props = buildWorldProps(this.isSoftwareGl);
    this.scene.add(props.group);
    this.spireCrystal = props.spireCrystal;
    this.disposables.push(...props.disposables);

    // Contact shadow texture & Hero rig
    this.shadowTex = createContactShadowTexture();
    this.disposables.push(this.shadowTex);
    this.heroRig = createHeroRig(initialClass, this.shadowTex, this.isSoftwareGl);
    this.heroRig.root.position.set(this.player.x, this.player.y, this.player.z);
    this.heroRig.root.rotation.y = this.player.yaw;
    this.scene.add(this.heroRig.root);

    // Infinite Devouring Domain multi-ring vortex visual
    this.domainGroup = new THREE.Group();
    const outerRingGeo = new THREE.RingGeometry(0.92, 1.0, 48);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const innerRingGeo = new THREE.RingGeometry(0.32, 0.38, 36);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const auraDiscGeo = new THREE.CircleGeometry(0.95, 40);
    const auraDiscMat = new THREE.MeshBasicMaterial({
      color: 0x6d28d9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.04;
    const auraDisc = new THREE.Mesh(auraDiscGeo, auraDiscMat);
    auraDisc.rotation.x = -Math.PI / 2;
    auraDisc.position.y = -0.02;
    this.domainGroup.add(outerRing, innerRing, auraDisc);
    this.domainGroup.visible = false;
    this.scene.add(this.domainGroup);
    this.disposables.push(
      outerRingGeo,
      outerRingMat,
      innerRingGeo,
      innerRingMat,
      auraDiscGeo,
      auraDiscMat,
    );

    // Teraton Bomb shockwave sphere
    const nukeGeo = new THREE.SphereGeometry(1, 18, 12);
    const nukeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
      depthWrite: false,
    });
    this.nukeMesh = new THREE.Mesh(nukeGeo, nukeMat);
    this.nukeMesh.visible = false;
    this.scene.add(this.nukeMesh);
    this.disposables.push(nukeGeo, nukeMat);

    // Pooled InstancedMesh Particle Ring Buffer
    const pGeo = new THREE.OctahedronGeometry(0.18, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInst = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleInst.frustumCulled = false;
    this.scene.add(this.particleInst);
    this.disposables.push(pGeo, pMat);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
        color: new THREE.Color(0xffffff),
      });
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleInst.setMatrixAt(i, _dummy.matrix);
      this.particleInst.setColorAt(i, _color.setHex(0xffffff));
    }

    // Pooled Enemy Projectile Bolts (Void Shade)
    const projGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const projMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    this.disposables.push(projGeo, projMat);
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const mesh = new THREE.Mesh(projGeo, projMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        damage: 12,
        life: 0,
        mesh,
      });
    }

    // Starter NFT relic so vault feels alive immediately
    this.nfts = [generateNftItem(`nft_${this.nextNftId++}`, 1, 0.42, 0.12)];

    // Spawn initial wave of enemies across the realm
    this.topUpEnemies(10, false);

    // ResizeObserver & Event Listeners
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.handleResize();

    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.pushLog('Welcome to ShadowRealm 3D v3.0 — Ascendant.', 'gold');
    this.pushLog('Causality Engine v2 active: 10 priority rules online.', 'violet');
    this.emitHudSnapshot();

    this.lastFrameTs = performance.now();
    this.scheduleNextFrame();
  }

  private handleResize = () => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: true });
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private unbindEvents(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }

  private onContextMenu = (e: MouseEvent) => e.preventDefault();

  private onWindowBlur = () => {
    this.heldKeys.clear();
    this.joystickX = 0;
    this.joystickY = 0;
    this.rmbDragging = false;
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.heldKeys.clear();
      this.joystickX = 0;
      this.joystickY = 0;
      this.rmbDragging = false;
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;
    if (e.button === 2) {
      this.rmbDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    } else if (e.button === 0) {
      this.attackBufferTimer = 0.14;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.rmbDragging || this.phase !== 'playing') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.camYaw -= dx * 0.0065;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.005, 0.12, 1.15);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.button === 2) this.rmbDragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (this.phase !== 'playing') return;
    this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.008, 6.0, 20.0);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // Do not intercept typing inside name input
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const code = e.code;
    const isRepeat = e.repeat;

    if (code === 'Tab' || code === 'F1') {
      if (this.phase === 'playing' || this.phase === 'paused') {
        e.preventDefault();
        this.callbacks.onToggleMenu?.();
      }
      return;
    }

    if (code === 'KeyM' && !isRepeat) {
      this.toggleMute();
      return;
    }

    if ((code === 'Escape' || code === 'KeyP') && !isRepeat) {
      if (this.phase === 'playing') {
        this.setPhase('paused');
      } else if (this.phase === 'paused') {
        this.setPhase('playing');
      }
      return;
    }

    if (this.phase !== 'playing') return;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }

    this.heldKeys.add(code);

    if (!isRepeat) {
      if (code === 'Space') this.jumpBufferTimer = 0.14;
      if (code === 'KeyZ') this.attackBufferTimer = 0.14;
      if (code === 'KeyX') this.triggerPowerAbility();
      if (code === 'KeyC') this.triggerHeal();
      if (code === 'KeyQ' || code === 'ControlLeft' || code === 'ControlRight') this.triggerDash();
      if (code === 'KeyG') this.triggerDomain();
      if (code === 'KeyN') this.triggerNuke();
      if (code === 'KeyF') {
        this.player.flyMode = !this.player.flyMode;
        this.pushLog(this.player.flyMode ? 'Fly Mode engaged.' : 'Fly Mode disengaged.', 'cyan');
        this.emitHudSnapshot();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
    // Variable jump height cut
    if (e.code === 'Space' && this.player.vy > 0 && !this.player.flyMode) {
      this.player.vy *= 0.48;
    }
  };

  // --- Public Control API for React Game Shell ---

  public selectPreviewClass(classId: PlayerClassId): void {
    this.player.classId = classId;
    this.heroRig.updateClassVisuals(classId);
    this.emitHudSnapshot();
  }

  public startNewGame(name: string, classId: PlayerClassId): void {
    this.heldKeys.clear();
    this.joystickX = 0;
    this.joystickY = 0;
    this.player = createInitialPlayer(name, classId);
    this.player.y = groundHeightAt(this.player.x, this.player.z);
    this.heroRig.updateClassVisuals(classId);
    this.heroRig.root.position.set(this.player.x, this.player.y, this.player.z);
    this.heroRig.root.rotation.y = this.player.yaw;

    this.camYaw = 0;
    this.camPitch = 0.23;
    this.camDist = 9.5;
    this.camPosCurrent.set(this.player.x, this.player.y + 4.3, this.player.z + 9.2);
    this.camLookCurrent.set(this.player.x, this.player.y + 2.5, this.player.z - 8);

    this.clearEnemies();
    this.topUpEnemies(10, false);
    this.causality.reset();
    this.nfts = [generateNftItem(`nft_${this.nextNftId++}`, 1, 0.42, 0.12)];
    this.combatLog = [];
    this.elapsedTime = 0;
    this.dayTime = 18;
    this.defeatDelayTimer = 0;
    this.bannerTimer = 0;
    this.bannerText = '';
    this.nukeWaveTimer = 0;
    this.nukeMesh.visible = false;
    this.domainGroup.visible = false;

    for (const proj of this.projectiles) {
      proj.active = false;
      proj.mesh.visible = false;
    }

    this.pushLog(`${this.player.name} (${CLASS_DEFINITIONS[classId].name}) enters ShadowRealm.`, 'gold');
    this.setPhase('playing');
    this.emitHudSnapshot();
  }

  public setJoystickInput(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y) || this.phase !== 'playing') {
      this.joystickX = 0;
      this.joystickY = 0;
      return;
    }
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      this.joystickX = x / mag;
      this.joystickY = y / mag;
    } else {
      this.joystickX = x;
      this.joystickY = y;
    }
  }

  public setPhase(next: GamePhase): void {
    this.phase = next;
    document.body.dataset.state = next;
    if (next !== 'playing') {
      this.heldKeys.clear();
      this.joystickX = 0;
      this.joystickY = 0;
      this.rmbDragging = false;
    }
    this.callbacks.onPhaseChange?.(next);
    this.emitHudSnapshot();
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public toggleMute(): boolean {
    this.sound.muted = !this.sound.muted;
    return this.sound.muted;
  }

  public isMuted(): boolean {
    return this.sound.muted;
  }

  public triggerBasicAttack(): void {
    if (this.phase !== 'playing') return;
    this.attackBufferTimer = 0.14;
  }

  public triggerPowerAbility(): void {
    if (this.phase !== 'playing' || this.player.powerCd > 0) return;
    const cls = CLASS_DEFINITIONS[this.player.classId];
    this.player.powerCd = 5.5;
    this.sound.playPower();
    this.trauma = Math.min(1, this.trauma + 0.38);

    const stats = computeEffectiveStats(this.player, this.nfts);
    const radius = this.player.classId === 'mage' ? 11.5 : 8.5;
    let hits = 0;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - this.player.x, enemy.z - this.player.z);
      if (dist <= radius) {
        const { damage, isCrit } = calculateAttackDamage(
          stats.str,
          stats.agi,
          this.player.comboCount,
          true,
          Math.random(),
        );
        this.damageEnemy(enemy, damage, isCrit, cls.powerStatus, 5.5);
        hits += 1;
      }
    }

    if (this.player.classId === 'shaman') {
      const healAmt = Math.round(this.player.maxHp * 0.14);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
    }

    this.spawnBurst(this.player.x, this.player.y + 1.2, this.player.z, cls.accentColor, 22, 8.5);
    this.pushLog(`${cls.powerName} unleashed! (${hits} foes hit)`, 'cyan');
    this.emitHudSnapshot();
  }

  public triggerHeal(): void {
    if (this.phase !== 'playing' || this.player.healCd > 0) return;
    if (this.player.hp >= this.player.maxHp) return;
    this.player.healCd = 9.0;
    const amount = Math.round(this.player.maxHp * 0.3);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    this.sound.playHeal();
    this.spawnBurst(this.player.x, this.player.y + 1.1, this.player.z, 0x4ade80, 16, 4.5);
    this.pushLog(`Vitality surge restored +${amount} HP.`, 'green');
    this.emitHudSnapshot();
  }

  public triggerDash(): void {
    if (this.phase !== 'playing' || this.player.dashCd > 0) return;
    if (this.player.stamina < 20) return;
    this.player.stamina -= 20;
    this.player.dashCd = 1.6;
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.32);
    const fx = Math.sin(this.player.yaw);
    const fz = Math.cos(this.player.yaw);
    this.player.vx += fx * 22;
    this.player.vz += fz * 22;
    this.sound.playDash();
    this.spawnBurst(this.player.x, this.player.y + 0.8, this.player.z, 0x93c5fd, 10, 5.5);
  }

  public triggerDomain(): void {
    if (this.phase !== 'playing' || this.player.domainCd > 0) return;
    const range = getDomainRange(this.player.domainLevel);
    this.player.domainActiveTimer = 8.0;
    this.player.domainCd = getDomainCooldown(this.player.domainLevel);
    this.player.domainChaosAcc = 0;
    this.sound.playDomain();
    this.trauma = Math.min(1, this.trauma + 0.45);
    this.showBanner(`INFINITE DEVOURING DOMAIN · LV.${this.player.domainLevel}`, 'violet');
    this.pushLog(
      `Infinite Devouring Domain opened! Range: ${range.toFixed(0)}u (Lv.${this.player.domainLevel}/999)`,
      'violet',
    );

    // Lv10+ Domain Suppression / Lv250+ Absolute Zero instant freeze
    if (this.player.domainLevel >= 10) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - this.player.x, e.z - this.player.z) <= range) {
          e.statusMask |= STATUS_FREEZE;
          e.statusTimer = Math.max(e.statusTimer, this.player.domainLevel >= 250 ? 6.0 : 4.0);
        }
      }
    }

    this.spawnBurst(this.player.x, this.player.y + 1.2, this.player.z, 0xa855f7, 26, 9.5);
    this.emitHudSnapshot();
  }

  public triggerNuke(): void {
    if (this.phase !== 'playing' || !this.player.nukeUnlocked || this.player.nukeCd > 0) return;
    this.player.nukeCd = NUKE_COOLDOWN_SECONDS;
    this.nukeWaveTimer = 1.1;
    this.nukeMesh.position.set(this.player.x, this.player.y + 1.0, this.player.z);
    this.nukeMesh.scale.setScalar(1);
    this.nukeMesh.visible = true;
    this.sound.playNuke();
    this.trauma = 1.0;
    this.hitstopTimer = 0.08;

    let obliterated = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - this.player.x, e.z - this.player.z) <= 32) {
        this.damageEnemy(e, 450 + this.player.level * 40, true, STATUS_BURN, 12);
        obliterated += 1;
      }
    }
    this.spawnBurst(this.player.x, this.player.y + 1.5, this.player.z, 0x38bdf8, 42, 16);
    this.showBanner(`TERATON BOMB · ${obliterated} TARGETS OBLITERATED`, 'cyan');
    this.pushLog(`Teraton Bomb detonated! Radius 32u — ${obliterated} enemies hit.`, 'cyan');
    this.emitHudSnapshot();
  }

  public buyShopItem(itemId: string): { ok: boolean; message: string } {
    const res = purchaseShopItem(this.player, itemId);
    this.pushLog(res.message, res.ok ? 'gold' : 'red');
    if (res.ok) this.sound.playHeal();
    this.emitHudSnapshot();
    return res;
  }

  public equipNft(itemId: string): void {
    this.nfts = equipNftInList(this.nfts, itemId);
    const target = this.nfts.find((n) => n.id === itemId);
    if (target) {
      this.pushLog(`${target.equipped ? 'Equipped' : 'Unequipped'} ${target.name}.`, 'gold');
    }
    this.emitHudSnapshot();
  }

  public sellNft(itemId: string): void {
    const idx = this.nfts.findIndex((n) => n.id === itemId);
    if (idx === -1) return;
    const [removed] = this.nfts.splice(idx, 1);
    this.player.cc += removed.ccValue;
    this.pushLog(`Sold ${removed.name} for +${removed.ccValue} CC.`, 'gold');
    this.emitHudSnapshot();
  }

  public summonBossNow(): void {
    this.spawnEnemyAtAngle('boss', 22);
    this.showBanner('SHADOW KING SUMMONED', 'red');
    this.pushLog('Shadow King has materialized near the Spire!', 'red');
    this.emitHudSnapshot();
  }

  // --- Internal Simulation Helpers ---

  private clearEnemies(): void {
    for (const rig of this.enemyRigs.values()) {
      this.scene.remove(rig.root);
    }
    this.enemyRigs.clear();
    this.enemies = [];
  }

  private topUpEnemies(targetCount: number, includeBoss: boolean): void {
    const aliveCount = this.enemies.filter((e) => e.alive).length;
    const needed = Math.max(0, targetCount - aliveCount);

    for (let i = 0; i < needed; i++) {
      const roll = Math.random();
      const type: EnemyType = roll < 0.42 ? 'wolf' : roll < 0.76 ? 'goblin' : 'shade';
      const dist = 16 + Math.random() * 34;
      this.spawnEnemyAtAngle(type, dist);
    }

    if (includeBoss && !this.enemies.some((e) => e.alive && e.type === 'boss')) {
      this.spawnEnemyAtAngle('boss', 24);
    }
  }

  private spawnEnemyAtAngle(type: EnemyType, distFromOrigin: number): void {
    // Keep spawn clearing clear by placing enemies further out or near the Spire
    const angle = Math.random() * Math.PI * 2;
    let x = Math.cos(angle) * distFromOrigin;
    let z = Math.sin(angle) * distFromOrigin - 8;
    if (Math.hypot(x - this.player.x, z - this.player.z) < 12) {
      x = -x;
      z = -z - 12;
    }
    const r = Math.hypot(x, z);
    if (r > PLAYABLE_RADIUS - 6) {
      x *= (PLAYABLE_RADIUS - 6) / r;
      z *= (PLAYABLE_RADIUS - 6) / r;
    }

    const state = createEnemy(this.nextEnemyId++, type, this.player.level, x, z, Math.random());
    state.y = groundHeightAt(x, z);
    this.enemies.push(state);

    const rig = createEnemyRig(type, this.shadowTex, this.isSoftwareGl);
    rig.root.position.set(state.x, state.y, state.z);
    this.scene.add(rig.root);
    this.enemyRigs.set(state.id, rig);
  }

  private pushLog(text: string, tone: CombatLogEntry['tone']): void {
    this.combatLog.unshift({
      id: this.nextLogId++,
      text,
      tone,
      time: Math.floor(this.elapsedTime),
    });
    if (this.combatLog.length > 18) this.combatLog.length = 18;
  }

  private showBanner(text: string, tone: 'gold' | 'violet' | 'red' | 'cyan'): void {
    this.bannerText = text;
    this.bannerTone = tone;
    this.bannerTimer = 2.6;
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    hex: number,
    count: number,
    speed: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      const theta = Math.random() * Math.PI * 2;
      const up = 0.25 + Math.random() * 0.9;
      const spd = speed * (0.4 + Math.random() * 0.7);
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = Math.cos(theta) * spd;
      slot.vy = up * spd;
      slot.vz = Math.sin(theta) * spd;
      slot.maxLife = 0.35 + Math.random() * 0.45;
      slot.life = slot.maxLife;
      slot.scale = 0.55 + Math.random() * 0.85;
      slot.color.setHex(hex);
    }
  }

  private spawnEnemyProjectile(enemy: EnemyState): void {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    const dx = this.player.x - enemy.x;
    const dz = this.player.z - enemy.z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    const spd = 16.5;
    slot.active = true;
    slot.x = enemy.x;
    slot.y = enemy.y + 1.35;
    slot.z = enemy.z;
    slot.vx = (dx / len) * spd;
    slot.vy = 0;
    slot.vz = (dz / len) * spd;
    slot.damage = enemy.attack;
    slot.life = 2.2;
    slot.mesh.position.set(slot.x, slot.y, slot.z);
    slot.mesh.visible = true;
  }

  private damageEnemy(
    enemy: EnemyState,
    damage: number,
    isCrit: boolean,
    applyStatus: number,
    knockback: number,
  ): void {
    if (!enemy.alive) return;
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hitFlash = 0.08;

    if (applyStatus !== 0) {
      enemy.statusMask |= applyStatus;
      enemy.statusTimer = Math.max(enemy.statusTimer, 3.6);
    }

    // Knockback away from player
    const dx = enemy.x - this.player.x;
    const dz = enemy.z - this.player.z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    enemy.vx += (dx / len) * knockback;
    enemy.vz += (dz / len) * knockback;

    this.player.comboCount += 1;
    this.player.comboTimer = COMBO_WINDOW_SECONDS;

    this.sound.playHit(isCrit);
    this.spawnBurst(enemy.x, enemy.y + 1.1, enemy.z, isCrit ? 0xf5a623 : 0xf43f5e, isCrit ? 14 : 7, 6.2);
    if (isCrit) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
      this.trauma = Math.min(1, this.trauma + 0.24);
    }

    if (enemy.hp <= 0) {
      this.handleEnemyKilled(enemy);
    }
  }

  private handleEnemyKilled(enemy: EnemyState): void {
    enemy.alive = false;
    enemy.koTimer = 0.45;
    enemy.hasAttackToken = false;

    const rig = this.enemyRigs.get(enemy.id);
    if (rig) {
      rig.telegraphRing.visible = false;
      rig.hpBarBg.visible = false;
      rig.hpBarFill.visible = false;
    }

    this.hitstopTimer = Math.max(this.hitstopTimer, enemy.type === 'boss' ? 0.075 : 0.04);
    this.trauma = Math.min(1, this.trauma + (enemy.type === 'boss' ? 0.55 : 0.22));
    this.spawnBurst(enemy.x, enemy.y + 1.2, enemy.z, enemy.type === 'boss' ? 0xf5a623 : 0xa855f7, 20, 8.2);

    const xpGain = enemy.type === 'boss' ? 140 : 28 + enemy.level * 6;
    const goldGain = enemy.type === 'boss' ? 95 : 14 + enemy.level * 3;
    const baseCc = enemy.type === 'boss' ? 50 : 9 + enemy.level * 2;
    const ccGain = this.player.ccMultTimer > 0 ? baseCc * 2 : baseCc;

    this.player.kills += 1;
    this.player.streak += 1;
    this.player.bestStreak = Math.max(this.player.bestStreak, this.player.streak);
    this.player.gold += goldGain;
    this.player.cc += ccGain;
    this.player.score += enemy.type === 'boss' ? 500 : 100 + this.player.streak * 15;
    this.player.domainLevel = Math.min(999, this.player.domainLevel + (enemy.type === 'boss' ? 5 : 1));

    const lvlRes = grantPlayerXp(this.player, xpGain);
    this.pushLog(`${enemy.name} defeated! +${xpGain} XP · +${goldGain}G · +${ccGain} CC`, 'green');

    if (lvlRes.leveledUp) {
      this.sound.playLevelUp();
      this.showBanner(`LEVEL UP · LV.${this.player.level}`, 'gold');
      this.pushLog(`Ascended to Level ${this.player.level}! Max HP & Domain strengthened.`, 'gold');
    }

    const streakTitle = getStreakTitle(this.player.streak);
    if (streakTitle) {
      this.showBanner(`${streakTitle} · ${this.player.streak} STREAK`, 'red');
    }

    // NFT Drop Roll
    if (Math.random() < getDropChanceForEnemy(enemy.type)) {
      const forced = enemy.type === 'boss' ? 4 : undefined;
      const drop = generateNftItem(`nft_${this.nextNftId++}`, forced);
      this.nfts.unshift(drop);
      if (this.nfts.length > 24) this.nfts.pop();
      this.pushLog(
        `NFT Drop: [${RARITY_NAMES[drop.rarity]}] ${drop.name} (+${drop.strBonus} STR, +${drop.defBonus} DEF)`,
        'gold',
      );
    }

    this.emitHudSnapshot();
  }

  // --- Main Simulation Tick ---

  private updateDayNightCycle(dt: number): void {
    this.dayTime = (this.dayTime + dt) % DAY_CYCLE_SECONDS;
    const phase = (this.dayTime / DAY_CYCLE_SECONDS) * Math.PI * 2;
    const sunElev = Math.sin(phase); // >0 day, <0 night
    const sunX = Math.cos(phase) * 58;
    const sunY = Math.max(12, Math.sin(phase) * 54 + 8);
    const sunZ = 24;

    this.sunLight.position.set(this.player.x + sunX, sunY, this.player.z + sunZ);
    this.sunLight.target.position.set(this.player.x, this.player.y, this.player.z);

    const dayFactor = THREE.MathUtils.clamp((sunElev + 0.18) / 0.55, 0, 1);
    const duskFactor = Math.max(0, 1 - Math.abs(sunElev) * 4.5);

    _fogColor.copy(_skyNight).lerp(_skyDay, dayFactor).lerp(_skySunset, duskFactor * 0.45);
    this.scene.background = _fogColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_fogColor);
      this.scene.fog.density = 0.0075 + (1 - dayFactor) * 0.0035;
    }

    this.sunLight.intensity = 0.75 + dayFactor * 1.45;
    this.sunLight.color.setHex(dayFactor > 0.3 ? 0xffe4bc : 0x8ea8e6);
    this.hemiLight.intensity = 0.55 + dayFactor * 0.5;
  }

  private updatePlayer(simDt: number, realDt: number): void {
    const p = this.player;
    const stats = computeEffectiveStats(p, this.nfts);

    // Cooldowns & buffs
    if (p.attackCd > 0) p.attackCd = Math.max(0, p.attackCd - simDt);
    if (p.powerCd > 0) p.powerCd = Math.max(0, p.powerCd - simDt);
    if (p.healCd > 0) p.healCd = Math.max(0, p.healCd - simDt);
    if (p.dashCd > 0) p.dashCd = Math.max(0, p.dashCd - simDt);
    if (p.domainCd > 0) p.domainCd = Math.max(0, p.domainCd - simDt);
    if (p.nukeCd > 0) p.nukeCd = Math.max(0, p.nukeCd - simDt);
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - simDt);
    if (p.ccMultTimer > 0) p.ccMultTimer = Math.max(0, p.ccMultTimer - simDt);
    if (p.essenceBuffTimer > 0) p.essenceBuffTimer = Math.max(0, p.essenceBuffTimer - simDt);
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - realDt);
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - simDt);
    if (this.attackBufferTimer > 0) this.attackBufferTimer = Math.max(0, this.attackBufferTimer - simDt);

    if (p.comboTimer > 0) {
      p.comboTimer = Math.max(0, p.comboTimer - simDt);
      if (p.comboTimer === 0) p.comboCount = 0;
    }

    // Trailing damage ghost bar decays smoothly toward current HP
    p.trailingHp = THREE.MathUtils.damp(p.trailingHp, p.hp, 5.5, realDt);

    // Camera-relative movement input (Keyboard WASD/Arrows + Virtual Joystick)
    let inFwd = 0;
    let inRight = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) inFwd += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) inFwd -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) inRight += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) inRight -= 1;

    inFwd += this.joystickY;
    inRight += this.joystickX;

    const inputMag = Math.hypot(inFwd, inRight);
    const moving = inputMag > 0.001;
    const analogScale = Math.min(1, inputMag);
    const wantsSprint =
      (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) && moving && p.stamina > 2;
    const speedMult = wantsSprint ? 1.55 : 1.0;

    if (wantsSprint) {
      p.stamina = Math.max(0, p.stamina - 22 * simDt);
    } else {
      p.stamina = Math.min(p.maxStamina, p.stamina + 16 * simDt);
    }

    if (moving) {
      // Camera forward vector on XZ plane (camera looks from camPos toward player)
      const camFwdX = -Math.sin(this.camYaw);
      const camFwdZ = -Math.cos(this.camYaw);
      const camRightX = Math.cos(this.camYaw);
      const camRightZ = -Math.sin(this.camYaw);

      let mx = camFwdX * inFwd + camRightX * inRight;
      let mz = camFwdZ * inFwd + camRightZ * inRight;
      const len = Math.max(0.001, Math.hypot(mx, mz));
      mx /= len;
      mz /= len;

      const moveSpeed = p.baseSpeed * speedMult * analogScale;
      p.vx = THREE.MathUtils.damp(p.vx, mx * moveSpeed, 14, simDt);
      p.vz = THREE.MathUtils.damp(p.vz, mz * moveSpeed, 14, simDt);

      const targetYaw = Math.atan2(mx, mz);
      let diff = targetYaw - p.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.yaw += diff * Math.min(1, simDt * 13);
    } else {
      p.vx = THREE.MathUtils.damp(p.vx, 0, 12, simDt);
      p.vz = THREE.MathUtils.damp(p.vz, 0, 12, simDt);
    }

    p.x += p.vx * simDt;
    p.z += p.vz * simDt;
    p.distanceWalked += Math.hypot(p.vx, p.vz) * simDt;

    // Soft natural perimeter clamp inside cliff ring
    const radial = Math.hypot(p.x, p.z);
    if (radial > PLAYABLE_RADIUS - 2) {
      const s = (PLAYABLE_RADIUS - 2) / radial;
      p.x *= s;
      p.z *= s;
    }

    const groundY = groundHeightAt(p.x, p.z);

    if (p.flyMode) {
      let vyTarget = 0;
      if (this.heldKeys.has('Space')) vyTarget = 9;
      if (this.heldKeys.has('ControlLeft')) vyTarget = -9;
      p.vy = THREE.MathUtils.damp(p.vy, vyTarget, 10, simDt);
      p.y = Math.max(groundY + 0.5, Math.min(groundY + 26, p.y + p.vy * simDt));
      p.onGround = false;
    } else {
      if (p.onGround) {
        p.coyoteTimer = 0.11;
      } else {
        p.coyoteTimer = Math.max(0, p.coyoteTimer - simDt);
      }

      if (this.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
        p.vy = JUMP_VELOCITY;
        p.onGround = false;
        p.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        p.squashX = 0.84;
        p.squashY = 1.2;
        this.sound.playJump();
        this.spawnBurst(p.x, groundY + 0.15, p.z, 0xc4b5fd, 5, 3.2);
      }

      p.vy += GRAVITY * simDt;
      p.y += p.vy * simDt;
      if (p.y <= groundY) {
        if (!p.onGround && p.vy < -5) {
          p.squashX = 1.2;
          p.squashY = 0.8;
        }
        p.y = groundY;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }
    }

    // Squash & stretch recovery
    p.squashX = THREE.MathUtils.damp(p.squashX, 1, 14, realDt);
    p.squashY = THREE.MathUtils.damp(p.squashY, 1, 14, realDt);

    // Basic Attack state machine: windup -> active -> recovery
    if (this.attackBufferTimer > 0 && p.attackCd <= 0 && p.attackPhase === 'idle') {
      this.attackBufferTimer = 0;
      p.attackPhase = 'windup';
      p.attackPhaseTimer = 0.08;
      p.attackCd = 0.36;
      this.sound.playSwing();
    }

    if (p.attackPhase !== 'idle') {
      p.attackPhaseTimer -= simDt;
      if (p.attackPhase === 'windup' && p.attackPhaseTimer <= 0) {
        p.attackPhase = 'active';
        p.attackPhaseTimer = 0.1;
        this.executeMeleeHitbox(stats.str, stats.agi);
      } else if (p.attackPhase === 'active' && p.attackPhaseTimer <= 0) {
        p.attackPhase = 'recovery';
        p.attackPhaseTimer = 0.12;
      } else if (p.attackPhase === 'recovery' && p.attackPhaseTimer <= 0) {
        p.attackPhase = 'idle';
      }
    }

    // Active Infinite Devouring Domain tick
    if (p.domainActiveTimer > 0) {
      p.domainActiveTimer = Math.max(0, p.domainActiveTimer - simDt);
      const range = getDomainRange(p.domainLevel);
      this.domainGroup.visible = true;
      this.domainGroup.position.set(p.x, groundY + 0.22, p.z);
      this.domainGroup.scale.setScalar(range);
      this.domainGroup.rotation.y += simDt * 1.1;

      p.domainChaosAcc += simDt;
      const tickNow = p.domainChaosAcc >= 0.45;
      if (tickNow) {
        p.domainChaosAcc = 0;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) <= range) {
            // Lv25+ Void Erasure executes enemies below 20% HP
            if (p.domainLevel >= 25 && e.hp / e.maxHp < 0.2 && e.type !== 'boss') {
              this.damageEnemy(e, e.hp + 10, true, 0, 2);
            } else {
              const dps = 8 + (p.domainLevel >= 50 ? 8 : 0) + (p.domainLevel >= 100 ? 18 : 0);
              this.damageEnemy(e, dps, false, 0, 0.8);
              p.hp = Math.min(p.maxHp, p.hp + 2);
            }
          }
        }
      }
    } else {
      this.domainGroup.visible = false;
    }

    // Sync Hero 3D Rig
    this.heroRig.root.position.set(p.x, p.y, p.z);
    this.heroRig.root.rotation.y = p.yaw;
    this.heroRig.bodyPivot.scale.set(p.squashX, p.squashY, p.squashX);

    const gait = Math.sin(p.distanceWalked * 2.1);
    const speedAlpha = Math.min(1, Math.hypot(p.vx, p.vz) / 5);
    this.heroRig.leftLeg.rotation.x = gait * 0.55 * speedAlpha;
    this.heroRig.rightLeg.rotation.x = -gait * 0.55 * speedAlpha;
    this.heroRig.cloak.rotation.x = 0.16 + speedAlpha * 0.35 + Math.sin(this.elapsedTime * 4) * 0.06;

    if (p.attackPhase === 'windup') {
      this.heroRig.weaponPivot.rotation.set(-0.9, -0.6, 0);
    } else if (p.attackPhase === 'active') {
      this.heroRig.weaponPivot.rotation.set(0.65, 1.05, 0.4);
    } else {
      this.heroRig.weaponPivot.rotation.x = THREE.MathUtils.damp(this.heroRig.weaponPivot.rotation.x, 0, 12, realDt);
      this.heroRig.weaponPivot.rotation.y = THREE.MathUtils.damp(this.heroRig.weaponPivot.rotation.y, 0, 12, realDt);
      this.heroRig.weaponPivot.rotation.z = THREE.MathUtils.damp(this.heroRig.weaponPivot.rotation.z, 0, 12, realDt);
    }

    const flashColor = p.hitFlash > 0 ? 0xff4444 : 0x000000;
    this.heroRig.materialsToFlash[0].emissive.setHex(flashColor);
    this.heroRig.materialsToFlash[0].emissiveIntensity = p.hitFlash > 0 ? 0.9 : 0;
  }

  private executeMeleeHitbox(totalStr: number, totalAgi: number): void {
    const p = this.player;
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const reach = p.classId === 'mage' ? 6.2 : 4.4;

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach) continue;
      const dot = (dx * fx + dz * fz) / Math.max(0.001, dist);
      if (dot < -0.15 && dist > 1.8) continue;

      const { damage, isCrit } = calculateAttackDamage(
        totalStr,
        totalAgi,
        p.comboCount,
        false,
        Math.random(),
      );
      this.damageEnemy(e, damage, isCrit, 0, 4.2);
    }
  }

  private updateEnemies(simDt: number, realDt: number, night: boolean): void {
    const p = this.player;
    const stats = computeEffectiveStats(p, this.nfts);
    const nightSpeedMult = night ? 1.2 : 1.0;

    let activeTokens = this.enemies.filter((e) => e.alive && e.hasAttackToken).length;

    for (const e of this.enemies) {
      const rig = this.enemyRigs.get(e.id);
      if (!rig) continue;

      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - realDt);

      // KO topple & dissolve animation
      if (!e.alive) {
        if (e.koTimer > 0) {
          e.koTimer = Math.max(0, e.koTimer - realDt);
          const progress = 1 - e.koTimer / 0.45;
          rig.bodyPivot.rotation.x = progress * (Math.PI / 2);
          rig.bodyPivot.scale.setScalar(Math.max(0.05, 1 - progress * 0.7));
          if (e.koTimer <= 0) {
            rig.root.visible = false;
          }
        }
        continue;
      }

      // Status effects (Burn / Freeze / Poison / Stun)
      let moveFactor = 1.0;
      if (e.statusTimer > 0) {
        e.statusTimer = Math.max(0, e.statusTimer - simDt);
        if (e.statusMask & STATUS_FREEZE) moveFactor *= 0.42;
        if (e.statusMask & STATUS_STUN) moveFactor = 0;

        e.statusTickAcc += simDt;
        if (e.statusTickAcc >= 0.75) {
          e.statusTickAcc = 0;
          if (e.statusMask & (STATUS_BURN | STATUS_POISON)) {
            this.damageEnemy(e, 6 + this.player.level, false, 0, 0);
            if (!e.alive) continue;
          }
        }
        if (e.statusTimer <= 0) e.statusMask = 0;
      }

      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const dist = Math.max(0.001, Math.hypot(dx, dz));

      // Evaluate 5-state AI machine
      e.aiState = evaluateEnemyAIState(e, dist, night);

      if (e.attackCd > 0) e.attackCd = Math.max(0, e.attackCd - simDt);

      // Token release if out of combat
      if (e.hasAttackToken && e.aiState !== 'Attack' && e.aiState !== 'Chase') {
        e.hasAttackToken = false;
        activeTokens = Math.max(0, activeTokens - 1);
      }

      let desiredVx = 0;
      let desiredVz = 0;
      const spd = e.speed * nightSpeedMult * moveFactor;

      if (e.aiState === 'Patrol') {
        e.patrolTimer -= simDt;
        if (e.patrolTimer <= 0) {
          e.patrolTimer = 2.5 + Math.random() * 3.0;
          const a = Math.random() * Math.PI * 2;
          e.patrolX = e.spawnX + Math.cos(a) * 8;
          e.patrolZ = e.spawnZ + Math.sin(a) * 8;
        }
        const pdx = e.patrolX - e.x;
        const pdz = e.patrolZ - e.z;
        const pdist = Math.hypot(pdx, pdz);
        if (pdist > 0.8) {
          desiredVx = (pdx / pdist) * spd * 0.45;
          desiredVz = (pdz / pdist) * spd * 0.45;
        }
      } else if (e.aiState === 'Flee') {
        desiredVx = -(dx / dist) * spd * 1.05;
        desiredVz = -(dz / dist) * spd * 1.05;
        e.windupTimer = 0;
        rig.telegraphRing.visible = false;
      } else if (e.aiState === 'Chase') {
        // Goblin flanks slightly sideways while closing; Wolf chases directly
        const flank = e.type === 'goblin' ? 0.35 : 0;
        const dirX = dx / dist - (dz / dist) * flank;
        const dirZ = dz / dist + (dx / dist) * flank;
        const n = Math.max(0.001, Math.hypot(dirX, dirZ));
        desiredVx = (dirX / n) * spd;
        desiredVz = (dirZ / n) * spd;
        e.windupTimer = 0;
        rig.telegraphRing.visible = false;
      } else if (e.aiState === 'Attack') {
        // Void Shade kites back if player gets too close
        if (e.type === 'shade' && dist < e.preferredRange * 0.72) {
          desiredVx = -(dx / dist) * spd * 0.8;
          desiredVz = -(dz / dist) * spd * 0.8;
        } else if (e.type !== 'shade' && dist > e.preferredRange) {
          desiredVx = (dx / dist) * spd * 0.65;
          desiredVz = (dz / dist) * spd * 0.65;
        }

        // Acquire attack token before starting windup
        if (this.phase === 'playing' && moveFactor > 0 && e.attackCd <= 0 && e.windupTimer <= 0) {
          if (!e.hasAttackToken && activeTokens < MAX_ATTACK_TOKENS) {
            e.hasAttackToken = true;
            activeTokens += 1;
          }
          if (e.hasAttackToken) {
            e.windupTimer = e.windupDuration;
            rig.telegraphRing.visible = true;
            this.sound.playTelegraph();
          }
        }
      }

      // Resolve telegraphed windup -> strike
      if (e.windupTimer > 0) {
        e.windupTimer -= simDt;
        const pulse = 1 + Math.sin(this.elapsedTime * 22) * 0.08;
        rig.telegraphRing.scale.setScalar(pulse);
        if (e.windupTimer <= 0) {
          rig.telegraphRing.visible = false;
          e.attackCd = e.type === 'boss' ? 1.9 : e.type === 'shade' ? 1.85 : 1.35;
          if (e.hasAttackToken) {
            e.hasAttackToken = false;
            activeTokens = Math.max(0, activeTokens - 1);
          }
          if (e.type === 'shade') {
            this.spawnEnemyProjectile(e);
          } else if (dist <= e.attackRange + 0.9 && this.phase === 'playing') {
            this.hurtPlayer(e.attack, e.name, e.type === 'boss' ? 0.45 : 0.22);
          }
        }
      }

      e.vx = THREE.MathUtils.damp(e.vx, desiredVx, 9, simDt);
      e.vz = THREE.MathUtils.damp(e.vz, desiredVz, 9, simDt);
      e.x += e.vx * simDt;
      e.z += e.vz * simDt;

      // Keep inside natural cliff perimeter
      const er = Math.hypot(e.x, e.z);
      if (er > PLAYABLE_RADIUS - 3) {
        e.x *= (PLAYABLE_RADIUS - 3) / er;
        e.z *= (PLAYABLE_RADIUS - 3) / er;
      }

      e.y = groundHeightAt(e.x, e.z);
      if (e.aiState === 'Attack' || e.aiState === 'Chase') {
        e.yaw = Math.atan2(dx, dz);
      } else if (Math.hypot(e.vx, e.vz) > 0.3) {
        e.yaw = Math.atan2(e.vx, e.vz);
      }

      rig.root.position.set(e.x, e.y, e.z);
      rig.bodyPivot.rotation.y = e.yaw;

      // Animate limbs / floating shade bob
      if (e.type === 'shade') {
        rig.bodyPivot.position.y = Math.sin(this.elapsedTime * 3.5 + e.id) * 0.2;
      } else {
        const stride = Math.sin(this.elapsedTime * 9 + e.id) * Math.min(1, Math.hypot(e.vx, e.vz) / 3);
        if (rig.limbs[0]) rig.limbs[0].rotation.x = stride * 0.5;
        if (rig.limbs[1]) rig.limbs[1].rotation.x = -stride * 0.5;
      }

      // Billboard world HP bar toward camera
      const hpRatio = Math.max(0.01, e.hp / Math.max(1, e.maxHp));
      rig.hpBarBg.quaternion.copy(this.camera.quaternion);
      rig.hpBarFill.quaternion.copy(this.camera.quaternion);
      rig.hpBarFill.scale.x = hpRatio;

      // Hit / status flash
      rig.materialsToFlash.forEach((mat, i) => {
        if (e.hitFlash > 0) {
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = 0.9;
        } else if (e.statusMask & STATUS_FREEZE) {
          mat.emissive.setHex(0x38bdf8);
          mat.emissiveIntensity = 0.55;
        } else if (e.statusMask & STATUS_BURN) {
          mat.emissive.setHex(0xf97316);
          mat.emissiveIntensity = 0.55;
        } else {
          mat.emissive.copy(rig.baseEmissives[i]);
          mat.emissiveIntensity = rig.baseEmissives[i].getHex() === 0 ? 0 : 1.4;
        }
      });
    }

    // Update Void Shade projectiles
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.life -= simDt;
      proj.x += proj.vx * simDt;
      proj.z += proj.vz * simDt;
      proj.y = groundHeightAt(proj.x, proj.z) + 1.25;
      proj.mesh.position.set(proj.x, proj.y, proj.z);

      if (this.phase === 'playing' && Math.hypot(proj.x - p.x, proj.z - p.z) < 1.15) {
        proj.active = false;
        proj.mesh.visible = false;
        this.hurtPlayer(proj.damage, 'Void Shade Bolt', 0.25);
        continue;
      }

      if (proj.life <= 0) {
        proj.active = false;
        proj.mesh.visible = false;
      }
    }

    // Keep unused stats lint clean
    void stats;
  }

  private hurtPlayer(rawDamage: number, sourceName: string, shake: number): void {
    const stats = computeEffectiveStats(this.player, this.nfts);
    const res = applyDamageToPlayer(this.player, rawDamage, stats.def);
    if (res.dealt <= 0) return;

    this.sound.playHurt();
    this.trauma = Math.min(1, this.trauma + shake);
    this.spawnBurst(this.player.x, this.player.y + 1.1, this.player.z, 0xef4444, 12, 5.5);

    if (res.revived) {
      this.showBanner('REVIVE TOKEN TRIGGERED · 50% HP RESTORED', 'gold');
      this.pushLog(`Revive Token saved you from ${sourceName}!`, 'gold');
      this.sound.playHeal();
    } else if (res.died) {
      this.sound.playDefeat();
      this.pushLog(`Defeated by ${sourceName}.`, 'red');
      this.defeatDelayTimer = 0.55;
    }
    this.emitHudSnapshot();
  }

  private updateCausality(simDt: number, night: boolean): void {
    const aliveList = this.enemies.filter((e) => e.alive);
    const bosses = aliveList.filter((e) => e.type === 'boss');
    const nearestBossDist = bosses.reduce(
      (min, b) => Math.min(min, Math.hypot(b.x - this.player.x, b.z - this.player.z)),
      999,
    );

    this.causality.evaluate(
      {
        level: this.player.level,
        kills: this.player.kills,
        deaths: this.player.deaths,
        hpPct: this.player.hp / Math.max(1, this.player.maxHp),
        streak: this.player.streak,
        cc: this.player.cc,
        domainLevel: this.player.domainLevel,
        nukeUnlocked: this.player.nukeUnlocked,
        nukeCd: this.player.nukeCd,
        bossAlive: bosses.length > 0,
        nearestBossDist,
        aliveEnemies: aliveList.length,
        isNight: night,
        inSafeClearing: Math.hypot(this.player.x, this.player.z - 14) < 10,
      },
      simDt,
      this.elapsedTime,
      {
        onUnlockNuke: () => {
          this.player.nukeUnlocked = true;
          this.showBanner('TERATON BOMB UNLOCKED · PRESS [N]', 'cyan');
          this.pushLog('[Causality] Unlock Nuke triggered — Teraton Bomb armed!', 'cyan');
        },
        onLowHpWarn: () => {
          this.pushLog('[Causality] Critical Vitality (<20%) — press [C] to Heal!', 'red');
        },
        onStreakBonus: () => {
          const bonus = this.player.ccMultTimer > 0 ? 50 : 25;
          this.player.cc += bonus;
          this.showBanner(`ON FIRE · +${bonus} CC BONUS`, 'gold');
          this.pushLog(`[Causality] Kill Streak bonus awarded +${bonus} CC.`, 'gold');
        },
        onBossAlert: () => {
          this.showBanner('SHADOW KING APPROACHES', 'red');
          this.pushLog('[Causality] Boss proximity alert — Shadow King within 22u!', 'red');
        },
        onCcAirdrop: () => {
          const drop = generateNftItem(`nft_${this.nextNftId++}`, 3);
          this.nfts.unshift(drop);
          this.showBanner(`CC MILESTONE AIRDROP · ${drop.name.toUpperCase()}`, 'gold');
          this.pushLog(`[Causality] 200 CC Milestone — Epic ${drop.name} added to Vault!`, 'gold');
        },
        onSpawnBossWave: () => {
          this.topUpEnemies(10, true);
          this.showBanner('SHADOW KING REINFORCEMENTS', 'red');
          this.pushLog('[Causality] Boss Wave summoned the Shadow King!', 'red');
        },
        onWaveRespawn: () => {
          this.player.gold += 40;
          this.topUpEnemies(10, this.player.level >= 4);
          this.pushLog('[Causality] Wave cleared (+40G). Fresh realm foes emerge.', 'violet');
        },
        onNukeReady: () => {
          this.pushLog('[Causality] Teraton Bomb is charged and ready [N].', 'cyan');
        },
        onAbsorbEvolve: () => {
          this.player.maxHp += 500;
          this.player.hp = this.player.maxHp;
          this.showBanner('DOMAIN EVOLUTION · +500 MAX HP', 'violet');
          this.pushLog('[Causality] Absorb Evolve triggered: +500 Max HP!', 'violet');
        },
        onNightWarn: () => {
          this.showBanner('NIGHTFALL · ENEMIES GROW STRONGER', 'violet');
          this.pushLog('[Causality] Night has fallen — enemy speed & aggro increased.', 'violet');
        },
      },
    );
  }

  private updateParticlesAndFx(realDt: number): void {
    // Spire crystal gentle levitation & spin
    this.spireCrystal.rotation.y += realDt * 0.85;
    this.spireCrystal.position.y = 8.2 + Math.sin(this.elapsedTime * 2.1) * 0.45;

    // Teraton Bomb expanding shockwave
    if (this.nukeWaveTimer > 0) {
      this.nukeWaveTimer = Math.max(0, this.nukeWaveTimer - realDt);
      const t = 1 - this.nukeWaveTimer / 1.1;
      this.nukeMesh.scale.setScalar(1 + t * 32);
      (this.nukeMesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.5;
      if (this.nukeWaveTimer <= 0) this.nukeMesh.visible = false;
    }

    let dirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const slot = this.particles[i];
      if (!slot.active) continue;
      dirty = true;
      slot.life -= realDt;
      if (slot.life <= 0) {
        slot.active = false;
        _dummy.position.set(0, -999, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleInst.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      slot.vy -= 14 * realDt;
      slot.x += slot.vx * realDt;
      slot.y += slot.vy * realDt;
      slot.z += slot.vz * realDt;
      const frac = slot.life / slot.maxLife;
      _dummy.position.set(slot.x, slot.y, slot.z);
      _dummy.rotation.set(slot.life * 6, slot.life * 4, 0);
      _dummy.scale.setScalar(slot.scale * frac);
      _dummy.updateMatrix();
      this.particleInst.setMatrixAt(i, _dummy.matrix);
      this.particleInst.setColorAt(i, slot.color);
    }
    if (dirty) {
      this.particleInst.instanceMatrix.needsUpdate = true;
      if (this.particleInst.instanceColor) this.particleInst.instanceColor.needsUpdate = true;
    }
  }

  private updateCamera(realDt: number): void {
    if (this.phase === 'title') {
      // Live World Camera Tour orbiting smoothly around the Shadow Spire & clearing
      this.titleTourAngle += realDt * 0.14;
      const cx = Math.sin(this.titleTourAngle) * 26 + 6;
      const cz = Math.cos(this.titleTourAngle) * 24 - 6;
      const cy = groundHeightAt(cx, cz) + 11.5 + Math.sin(this.titleTourAngle * 2) * 1.4;
      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(0, groundHeightAt(0, -14) + 7.0, -14);
      return;
    }

    // Third-person damped chase / orbit camera framing hero + landmark horizon ahead
    const p = this.player;
    const horiz = Math.cos(this.camPitch) * this.camDist;
    const desiredX = p.x + Math.sin(this.camYaw) * horiz;
    const desiredZ = p.z + Math.cos(this.camYaw) * horiz;
    const minGround = groundHeightAt(desiredX, desiredZ) + 1.5;
    const desiredY = Math.max(minGround, p.y + 2.0 + Math.sin(this.camPitch) * this.camDist);

    _v1.set(desiredX, desiredY, desiredZ);
    const alpha = 1 - Math.exp(-10 * realDt);
    this.camPosCurrent.lerp(_v1, alpha);

    // Look slightly ahead of the hero along camera forward so the Shadow Spire & horizon stay framed
    const lookAhead = 4.2;
    _v2.set(
      p.x - Math.sin(this.camYaw) * lookAhead,
      p.y + 2.4,
      p.z - Math.cos(this.camYaw) * lookAhead,
    );
    this.camLookCurrent.lerp(_v2, 1 - Math.exp(-14 * realDt));

    this.camera.position.copy(this.camPosCurrent);
    this.camera.lookAt(this.camLookCurrent);

    // Trauma-squared screen shake
    if (this.trauma > 0) {
      const shake = this.trauma * this.trauma;
      this.camera.position.x += (Math.random() - 0.5) * shake * 0.7;
      this.camera.position.y += (Math.random() - 0.5) * shake * 0.5;
      this.trauma = Math.max(0, this.trauma - realDt * 1.9);
    }
  }

  private emitHudSnapshot(): void {
    const p = this.player;
    const stats = computeEffectiveStats(p, this.nfts);
    const zone = getZoneAt(p.x, p.z);
    const aliveEnemies = this.enemies.filter((e) => e.alive);
    const boss = aliveEnemies.find((e) => e.type === 'boss');
    const hpPct = p.hp / Math.max(1, p.maxHp);

    this.callbacks.onHudUpdate({
      phase: this.phase,
      player: {
        name: p.name,
        classId: p.classId,
        className: CLASS_DEFINITIONS[p.classId].name,
        level: p.level,
        xp: Math.round(p.xp),
        xpToNext: Math.round(p.xpToNext),
        hp: Math.round(p.hp),
        maxHp: Math.round(p.maxHp),
        trailingHp: Math.round(p.trailingHp),
        stamina: Math.round(p.stamina),
        maxStamina: Math.round(p.maxStamina),
        totalStr: stats.str,
        totalDef: stats.def,
        totalAgi: stats.agi,
        gold: Math.round(p.gold),
        cc: Math.round(p.cc),
        kills: p.kills,
        deaths: p.deaths,
        streak: p.streak,
        bestStreak: p.bestStreak,
        comboCount: p.comboCount,
        score: Math.round(p.score),
        domainLevel: p.domainLevel,
        domainRange: Math.round(getDomainRange(p.domainLevel)),
        domainActiveTimer: Number(p.domainActiveTimer.toFixed(1)),
        domainCd: Number(p.domainCd.toFixed(1)),
        nukeUnlocked: p.nukeUnlocked,
        nukeCd: Number(p.nukeCd.toFixed(1)),
        attackCd: Number(p.attackCd.toFixed(1)),
        powerCd: Number(p.powerCd.toFixed(1)),
        healCd: Number(p.healCd.toFixed(1)),
        dashCd: Number(p.dashCd.toFixed(1)),
        reviveTokens: p.reviveTokens,
        ccMultTimer: Math.round(p.ccMultTimer),
        essenceBuffTimer: Math.round(p.essenceBuffTimer),
        flyMode: p.flyMode,
        x: Math.round(p.x),
        z: Math.round(p.z),
        yaw: p.yaw,
      },
      zone,
      zoneName: ZONE_NAMES[zone],
      dayTime: Math.round(this.dayTime),
      isNight: isNightTime(this.dayTime),
      aliveEnemies: aliveEnemies.length,
      bossActive: Boolean(boss),
      bossName: boss?.name ?? '',
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? Math.round(boss.maxHp) : 0,
      lowHpVignette: hpPct < 0.3 && this.phase === 'playing' ? (0.3 - hpPct) / 0.3 : 0,
      domainVignette: p.domainActiveTimer > 0 ? 0.55 : 0,
      bannerText: this.bannerTimer > 0 ? this.bannerText : '',
      bannerTone: this.bannerTone,
      nfts: [...this.nfts],
      causalityRules: this.causality.getSnapshot(),
      combatLog: [...this.combatLog],
      minimapEntities: aliveEnemies.map((e) => ({ id: e.id, type: e.type, x: e.x, z: e.z })),
      elapsedTime: Math.floor(this.elapsedTime),
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = () => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastFrameTs) / 1000);
    this.lastFrameTs = now;
    const dt = Math.min(rawDt, 0.05);

    if (this.bannerTimer > 0) this.bannerTimer = Math.max(0, this.bannerTimer - dt);

    if (this.phase === 'title') {
      this.elapsedTime += dt;
      this.updateDayNightCycle(dt * 0.5);
      this.updateEnemies(dt * 0.5, dt, isNightTime(this.dayTime));
      this.updateParticlesAndFx(dt);
      this.updateCamera(dt);
    } else if (this.phase === 'playing') {
      this.elapsedTime += dt;
      let simDt = dt;
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
        simDt = 0;
      }

      if (this.defeatDelayTimer > 0) {
        this.defeatDelayTimer = Math.max(0, this.defeatDelayTimer - dt);
        if (this.defeatDelayTimer <= 0) {
          this.setPhase('gameover');
        }
      } else {
        const night = isNightTime(this.dayTime);
        this.updateDayNightCycle(simDt);
        this.updatePlayer(simDt, dt);
        this.updateEnemies(simDt, dt, night);
        this.updateCausality(simDt, night);
      }

      this.updateParticlesAndFx(dt);
      this.updateCamera(dt);

      // High-frequency bar update without React reconciliation
      this.callbacks.onFastBars?.(
        (this.player.hp / Math.max(1, this.player.maxHp)) * 100,
        (this.player.trailingHp / Math.max(1, this.player.maxHp)) * 100,
        (this.player.stamina / Math.max(1, this.player.maxStamina)) * 100,
      );

      this.hudEmitAcc += dt;
      if (this.hudEmitAcc >= 0.12) {
        this.hudEmitAcc = 0;
        this.emitHudSnapshot();
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    this.unbindEvents();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
