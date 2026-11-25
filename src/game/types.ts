export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type PlayerClassId = 'knight' | 'mage' | 'rogue' | 'shaman';

export type EnemyType = 'wolf' | 'goblin' | 'shade' | 'boss';

export type EnemyAIState = 'Idle' | 'Patrol' | 'Chase' | 'Attack' | 'Flee';

export type ZoneId = 'forest' | 'desert' | 'mountains' | 'cursed';

export type NftRarity = 0 | 1 | 2 | 3 | 4 | 5;

export const STATUS_NONE = 0;
export const STATUS_BURN = 1 << 0;
export const STATUS_FREEZE = 1 << 1;
export const STATUS_POISON = 1 << 2;
export const STATUS_STUN = 1 << 3;

export interface ClassDefinition {
  id: PlayerClassId;
  name: string;
  role: string;
  maxHp: number;
  maxStamina: number;
  str: number;
  def: number;
  agi: number;
  speed: number;
  powerName: string;
  powerDesc: string;
  powerStatus: number;
  accentHex: string;
  primaryColor: number;
  accentColor: number;
}

export interface NftItem {
  id: string;
  name: string;
  slot: 'weapon' | 'armor' | 'relic';
  rarity: NftRarity;
  strBonus: number;
  defBonus: number;
  ccValue: number;
  equipped: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  goldCost: number;
  ccCost: number;
  description: string;
}

export interface CombatLogEntry {
  id: number;
  text: string;
  tone: 'gold' | 'violet' | 'red' | 'green' | 'cyan' | 'neutral';
  time: number;
}

export interface EnemyState {
  id: number;
  type: EnemyType;
  name: string;
  level: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  spawnX: number;
  spawnZ: number;
  patrolX: number;
  patrolZ: number;
  patrolTimer: number;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  attackRange: number;
  preferredRange: number;
  fleeHpPct: number;
  aiState: EnemyAIState;
  attackCd: number;
  windupTimer: number;
  windupDuration: number;
  hitFlash: number;
  statusMask: number;
  statusTimer: number;
  statusTickAcc: number;
  alive: boolean;
  koTimer: number;
  hasAttackToken: boolean;
}

export interface PlayerState {
  name: string;
  classId: PlayerClassId;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  trailingHp: number;
  stamina: number;
  maxStamina: number;
  baseStr: number;
  baseDef: number;
  baseAgi: number;
  baseSpeed: number;
  gold: number;
  cc: number;
  kills: number;
  deaths: number;
  streak: number;
  bestStreak: number;
  comboCount: number;
  comboTimer: number;
  score: number;
  domainLevel: number;
  domainActiveTimer: number;
  domainCd: number;
  domainChaosAcc: number;
  nukeUnlocked: boolean;
  nukeCd: number;
  attackCd: number;
  powerCd: number;
  healCd: number;
  dashCd: number;
  reviveTokens: number;
  ccMultTimer: number;
  essenceBuffTimer: number;
  flyMode: boolean;
  invulnTimer: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  onGround: boolean;
  coyoteTimer: number;
  attackPhase: 'idle' | 'windup' | 'active' | 'recovery';
  attackPhaseTimer: number;
  hitFlash: number;
  distanceWalked: number;
  squashX: number;
  squashY: number;
}

export interface CausalityRuleSnapshot {
  id: string;
  label: string;
  logic: 'AND' | 'OR';
  priority: number;
  fires: number;
  maxFires: number;
  cooldownRemaining: number;
  conditionMet: boolean;
  lastTriggered: string;
}

export interface HudSnapshot {
  phase: GamePhase;
  player: {
    name: string;
    classId: PlayerClassId;
    className: string;
    level: number;
    xp: number;
    xpToNext: number;
    hp: number;
    maxHp: number;
    trailingHp: number;
    stamina: number;
    maxStamina: number;
    totalStr: number;
    totalDef: number;
    totalAgi: number;
    gold: number;
    cc: number;
    kills: number;
    deaths: number;
    streak: number;
    bestStreak: number;
    comboCount: number;
    score: number;
    domainLevel: number;
    domainRange: number;
    domainActiveTimer: number;
    domainCd: number;
    nukeUnlocked: boolean;
    nukeCd: number;
    attackCd: number;
    powerCd: number;
    healCd: number;
    dashCd: number;
    reviveTokens: number;
    ccMultTimer: number;
    essenceBuffTimer: number;
    flyMode: boolean;
    x: number;
    z: number;
    yaw: number;
  };
  zone: ZoneId;
  zoneName: string;
  dayTime: number; // 0..120s
  isNight: boolean;
  aliveEnemies: number;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  lowHpVignette: number;
  domainVignette: number;
  bannerText: string;
  bannerTone: 'gold' | 'violet' | 'red' | 'cyan';
  nfts: NftItem[];
  causalityRules: CausalityRuleSnapshot[];
  combatLog: CombatLogEntry[];
  minimapEntities: Array<{
    id: number;
    type: EnemyType;
    x: number;
    z: number;
  }>;
  elapsedTime: number;
}
