import {
  ClassDefinition,
  EnemyAIState,
  EnemyState,
  EnemyType,
  NftItem,
  NftRarity,
  PlayerClassId,
  PlayerState,
  ShopItem,
  STATUS_BURN,
  STATUS_FREEZE,
  STATUS_POISON,
  STATUS_STUN,
  ZoneId,
} from './types';

export const DAY_CYCLE_SECONDS = 120;
export const COMBO_WINDOW_SECONDS = 2.5;
export const MAX_ATTACK_TOKENS = 3;
export const NUKE_COOLDOWN_SECONDS = 90;

export const CLASS_DEFINITIONS: Record<PlayerClassId, ClassDefinition> = {
  knight: {
    id: 'knight',
    name: 'Shadow Knight',
    role: 'Vanguard · Heavy Armor & Stun Cleave',
    maxHp: 160,
    maxStamina: 110,
    str: 22,
    def: 16,
    agi: 8,
    speed: 8.6,
    powerName: 'Aegis Cleave',
    powerDesc: 'Arc shockwave dealing heavy damage and stunning nearby foes.',
    powerStatus: STATUS_STUN,
    accentHex: '#f5a623',
    primaryColor: 0x3b3348,
    accentColor: 0xf5a623,
  },
  mage: {
    id: 'mage',
    name: 'Void Mage',
    role: 'Arcanist · Elemental Nova & Freeze',
    maxHp: 115,
    maxStamina: 120,
    str: 30,
    def: 8,
    agi: 12,
    speed: 9.2,
    powerName: 'Frostfire Nova',
    powerDesc: 'Detonates arcane frostfire that burns and slows enemies in range.',
    powerStatus: STATUS_FREEZE | STATUS_BURN,
    accentHex: '#38bdf8',
    primaryColor: 0x222a54,
    accentColor: 0x38bdf8,
  },
  rogue: {
    id: 'rogue',
    name: 'Night Rogue',
    role: 'Assassin · High Crit & Venom Flurry',
    maxHp: 125,
    maxStamina: 135,
    str: 25,
    def: 10,
    agi: 20,
    speed: 10.8,
    powerName: 'Venom Flurry',
    powerDesc: 'Rapid shadow strikes inflicting lethal poison with elevated crit.',
    powerStatus: STATUS_POISON,
    accentHex: '#4ade80',
    primaryColor: 0x1c3128,
    accentColor: 0x4ade80,
  },
  shaman: {
    id: 'shaman',
    name: 'Rift Shaman',
    role: 'Spiritcaller · Cinder Burn & Vitality',
    maxHp: 140,
    maxStamina: 115,
    str: 26,
    def: 12,
    agi: 14,
    speed: 9.5,
    powerName: 'Cinder Totem',
    powerDesc: 'Scorches foes in spirit flame while restoring a portion of vitality.',
    powerStatus: STATUS_BURN,
    accentHex: '#fb923c',
    primaryColor: 0x42261a,
    accentColor: 0xfb923c,
  },
};

export const RARITY_NAMES: Record<NftRarity, string> = {
  0: 'Common',
  1: 'Uncommon',
  2: 'Rare',
  3: 'Epic',
  4: 'Legendary',
  5: 'Mythic',
};

export const RARITY_COLORS: Record<NftRarity, string> = {
  0: '#a8a29e',
  1: '#4ade80',
  2: '#38bdf8',
  3: '#c084fc',
  4: '#f5a623',
  5: '#f43f5e',
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'minor_potion',
    name: 'Minor Potion',
    goldCost: 30,
    ccCost: 0,
    description: 'Restores +30 HP immediately.',
  },
  {
    id: 'major_potion',
    name: 'Major Potion',
    goldCost: 80,
    ccCost: 0,
    description: 'Restores +80 HP immediately.',
  },
  {
    id: 'energy_draught',
    name: 'Energy Draught',
    goldCost: 40,
    ccCost: 0,
    description: 'Restores +50 Stamina for sprint & dash.',
  },
  {
    id: 'xp_scroll',
    name: 'XP Scroll',
    goldCost: 0,
    ccCost: 50,
    description: 'Grants +200 XP instantly.',
  },
  {
    id: 'cc_multiplier',
    name: 'CC Multiplier 2x',
    goldCost: 0,
    ccCost: 100,
    description: 'Doubles all CC earned for 60 seconds.',
  },
  {
    id: 'revive_token',
    name: 'Revive Token',
    goldCost: 150,
    ccCost: 20,
    description: 'Automatically survive a lethal hit at 50% HP.',
  },
  {
    id: 'nuke_reset',
    name: 'Nuke Cooldown Reset',
    goldCost: 0,
    ccCost: 200,
    description: 'Resets Teraton Bomb cooldown to 0s and unlocks it.',
  },
  {
    id: 'shadow_essence',
    name: 'Shadow Essence',
    goldCost: 60,
    ccCost: 30,
    description: 'Grants +10 STR and +5 AGI for 5 minutes.',
  },
];

export const DOMAIN_MILESTONES: Array<{ level: number; name: string; effect: string }> = [
  { level: 1, name: 'Soul Devour', effect: 'Drains enemy HP into XP & self-heal.' },
  { level: 10, name: 'Domain Suppression', effect: 'Freezes all enemies inside domain for 4s.' },
  { level: 25, name: 'Void Erasure', effect: 'Instantly executes foes below 20% HP.' },
  { level: 50, name: 'Breaker', effect: 'Shatters defenses and deals +8 bonus DPS.' },
  { level: 100, name: 'Chaos', effect: 'Periodic high-damage rift bursts inside range.' },
  { level: 250, name: 'Absolute Zero', effect: 'Instant glacial freeze across entire domain.' },
  { level: 999, name: 'Absolute Supremacy', effect: 'Maximum 80u domain range & apex power.' },
];

export const ZONE_NAMES: Record<ZoneId, string> = {
  forest: 'Shadow Forest',
  desert: 'Ashen Desert',
  mountains: 'Obsidian Mountains',
  cursed: 'Cursed Wastes',
};

export function getZoneAt(x: number, z: number): ZoneId {
  const dist = Math.hypot(x, z);
  if (dist < 32) return 'forest';
  if (dist < 54) return 'desert';
  if (dist < 76) return 'mountains';
  return 'cursed';
}

export function isNightTime(dayTime: number): boolean {
  const normalized = ((dayTime % DAY_CYCLE_SECONDS) + DAY_CYCLE_SECONDS) % DAY_CYCLE_SECONDS;
  return normalized >= 66 && normalized < 114;
}

export function getDomainRange(domainLevel: number): number {
  return Math.min(80, 12 + Math.max(0, domainLevel - 1) * 0.5);
}

export function getDomainCooldown(domainLevel: number): number {
  return Math.max(15, 40 - domainLevel * 0.25);
}

export function getUnlockedDomainMilestones(domainLevel: number) {
  return DOMAIN_MILESTONES.filter((m) => domainLevel >= m.level);
}

export function createInitialPlayer(name: string, classId: PlayerClassId): PlayerState {
  const cls = CLASS_DEFINITIONS[classId];
  return {
    name: name.trim() || 'Ascendant',
    classId,
    level: 1,
    xp: 0,
    xpToNext: 100,
    hp: cls.maxHp,
    maxHp: cls.maxHp,
    trailingHp: cls.maxHp,
    stamina: cls.maxStamina,
    maxStamina: cls.maxStamina,
    baseStr: cls.str,
    baseDef: cls.def,
    baseAgi: cls.agi,
    baseSpeed: cls.speed,
    gold: 75,
    cc: 25,
    kills: 0,
    deaths: 0,
    streak: 0,
    bestStreak: 0,
    comboCount: 0,
    comboTimer: 0,
    score: 0,
    domainLevel: 1,
    domainActiveTimer: 0,
    domainCd: 0,
    domainChaosAcc: 0,
    nukeUnlocked: false,
    nukeCd: 0,
    attackCd: 0,
    powerCd: 0,
    healCd: 0,
    dashCd: 0,
    reviveTokens: 1,
    ccMultTimer: 0,
    essenceBuffTimer: 0,
    flyMode: false,
    invulnTimer: 1.5,
    x: 0,
    y: 0,
    z: 14,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI, // Facing toward -Z (the Shadow Spire landmark)
    onGround: true,
    coyoteTimer: 0,
    attackPhase: 'idle',
    attackPhaseTimer: 0,
    hitFlash: 0,
    distanceWalked: 0,
    squashX: 1,
    squashY: 1,
  };
}

export function computeEffectiveStats(
  player: PlayerState,
  nfts: NftItem[],
): { str: number; def: number; agi: number } {
  let str = player.baseStr + (player.level - 1) * 3;
  let def = player.baseDef + (player.level - 1) * 2;
  let agi = player.baseAgi + Math.floor((player.level - 1) * 1.2);

  if (player.essenceBuffTimer > 0) {
    str += 10;
    agi += 5;
  }

  for (const item of nfts) {
    if (item.equipped) {
      str += item.strBonus;
      def += item.defBonus;
    }
  }
  return { str, def, agi };
}

export function calculateAttackDamage(
  totalStr: number,
  totalAgi: number,
  comboCount: number,
  isPower: boolean,
  rngRoll: number,
): { damage: number; isCrit: boolean } {
  const critChance = Math.min(0.65, 0.1 + totalAgi * 0.012 + (isPower ? 0.08 : 0));
  const isCrit = rngRoll < critChance;
  const comboMult = 1 + Math.min(comboCount, 12) * 0.06;
  const base = totalStr * (isPower ? 1.85 : 1.0) * comboMult;
  const damage = Math.round(base * (isCrit ? 4.0 : 1.0));
  return { damage, isCrit };
}

export function getStreakTitle(streak: number): string | null {
  if (streak === 3) return 'TRIPLE KILL';
  if (streak === 5) return 'PENTA KILL';
  if (streak === 8) return 'UNSTOPPABLE';
  if (streak >= 12 && streak % 4 === 0) return 'GODLIKE';
  return null;
}

export function grantPlayerXp(
  player: PlayerState,
  amount: number,
): { leveledUp: boolean; levelsGained: number } {
  player.xp += Math.max(0, Math.round(amount));
  let levelsGained = 0;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    levelsGained += 1;
    player.xpToNext = Math.round(100 * Math.pow(1.22, player.level - 1));
    player.maxHp += 18;
    player.hp = player.maxHp;
    player.trailingHp = player.maxHp;
    player.stamina = player.maxStamina;
    player.domainLevel = Math.min(999, player.domainLevel + 2);
  }
  return { leveledUp: levelsGained > 0, levelsGained };
}

export function applyDamageToPlayer(
  player: PlayerState,
  rawDamage: number,
  totalDef: number,
): { dealt: number; revived: boolean; died: boolean } {
  if (player.invulnTimer > 0) {
    return { dealt: 0, revived: false, died: false };
  }
  const mitigation = 100 / (100 + totalDef * 2.5);
  const dealt = Math.max(4, Math.round(rawDamage * mitigation));
  player.hp = Math.max(0, player.hp - dealt);
  player.hitFlash = 0.16;

  if (player.hp <= 0) {
    if (player.reviveTokens > 0) {
      player.reviveTokens -= 1;
      player.hp = Math.round(player.maxHp * 0.5);
      player.trailingHp = player.hp;
      player.invulnTimer = 2.0;
      return { dealt, revived: true, died: false };
    }
    player.deaths += 1;
    player.streak = 0;
    return { dealt, revived: false, died: true };
  }
  return { dealt, revived: false, died: false };
}

export function createEnemy(
  id: number,
  type: EnemyType,
  playerLevel: number,
  x: number,
  z: number,
  rngVal = 0.5,
): EnemyState {
  const levelOffset = Math.round((rngVal - 0.5) * 3); // ±1-2 levels
  const level = Math.max(1, playerLevel + levelOffset + (type === 'boss' ? 2 : 0));
  const scale = 1 + (level - 1) * 0.16;

  const presets: Record<
    EnemyType,
    {
      name: string;
      hp: number;
      attack: number;
      speed: number;
      attackRange: number;
      preferredRange: number;
      fleeHpPct: number;
      windupDuration: number;
    }
  > = {
    wolf: {
      name: 'Shadow Wolf',
      hp: 58,
      attack: 12,
      speed: 6.4,
      attackRange: 2.6,
      preferredRange: 1.8,
      fleeHpPct: 0.05,
      windupDuration: 0.35,
    },
    goblin: {
      name: 'Rift Goblin',
      hp: 76,
      attack: 15,
      speed: 4.9,
      attackRange: 3.0,
      preferredRange: 2.3,
      fleeHpPct: 0.12,
      windupDuration: 0.42,
    },
    shade: {
      name: 'Void Shade',
      hp: 64,
      attack: 17,
      speed: 4.5,
      attackRange: 16.5,
      preferredRange: 12.5,
      fleeHpPct: 0.3,
      windupDuration: 0.55,
    },
    boss: {
      name: 'Shadow King',
      hp: 360,
      attack: 30,
      speed: 4.3,
      attackRange: 4.8,
      preferredRange: 3.4,
      fleeHpPct: 0,
      windupDuration: 0.68,
    },
  };

  const p = presets[type];
  const maxHp = Math.round(p.hp * scale);
  return {
    id,
    type,
    name: p.name,
    level,
    x,
    y: 0,
    z,
    vx: 0,
    vz: 0,
    yaw: 0,
    spawnX: x,
    spawnZ: z,
    patrolX: x,
    patrolZ: z,
    patrolTimer: 1.5 + rngVal * 2.5,
    hp: maxHp,
    maxHp,
    attack: Math.round(p.attack * scale),
    speed: p.speed,
    attackRange: p.attackRange,
    preferredRange: p.preferredRange,
    fleeHpPct: p.fleeHpPct,
    aiState: 'Patrol',
    attackCd: 0.8,
    windupTimer: 0,
    windupDuration: p.windupDuration,
    hitFlash: 0,
    statusMask: 0,
    statusTimer: 0,
    statusTickAcc: 0,
    alive: true,
    koTimer: 0,
    hasAttackToken: false,
  };
}

export function evaluateEnemyAIState(
  enemy: EnemyState,
  distToPlayer: number,
  isNight: boolean,
): EnemyAIState {
  if (!enemy.alive) return 'Idle';
  const aggroDist = (enemy.type === 'boss' ? 30 : enemy.type === 'shade' ? 24 : 18) * (isNight ? 1.25 : 1);
  const leashDist = aggroDist * 1.55;
  const hpPct = enemy.hp / Math.max(1, enemy.maxHp);

  if (enemy.fleeHpPct > 0 && hpPct <= enemy.fleeHpPct) {
    if (distToPlayer < aggroDist * 1.2) return 'Flee';
    return 'Patrol';
  }
  if (enemy.aiState === 'Flee' && distToPlayer >= aggroDist * 1.2) {
    return 'Patrol';
  }
  if (distToPlayer <= enemy.attackRange) {
    return 'Attack';
  }
  if (distToPlayer <= aggroDist || (enemy.aiState === 'Chase' && distToPlayer <= leashDist)) {
    return 'Chase';
  }
  return enemy.patrolTimer > 0 ? 'Patrol' : 'Idle';
}

const WEAPON_PREFIXES = ['Obsidian', 'Void', 'Abyssal', 'Celestial', 'Eclipse', 'Ascendant'];
const SLOT_NOUNS: Record<NftItem['slot'], string[]> = {
  weapon: ['Reaper', 'Greatsword', 'Staff', 'Daggers'],
  armor: ['Aegis', 'Cuirass', 'Shroud', 'Mantle'],
  relic: ['Sigil', 'Heart', 'Crown', 'Talisman'],
};

export function getDropChanceForEnemy(type: EnemyType): number {
  switch (type) {
    case 'boss':
      return 0.9;
    case 'shade':
      return 0.4;
    case 'goblin':
      return 0.35;
    case 'wolf':
      return 0.2;
  }
}

export function generateNftItem(
  id: string,
  forcedRarity?: NftRarity,
  rngA = Math.random(),
  rngB = Math.random(),
): NftItem {
  let rarity: NftRarity;
  if (forcedRarity !== undefined) {
    rarity = forcedRarity;
  } else if (rngA > 0.985) {
    rarity = 5;
  } else if (rngA > 0.93) {
    rarity = 4;
  } else if (rngA > 0.82) {
    rarity = 3;
  } else if (rngA > 0.62) {
    rarity = 2;
  } else if (rngA > 0.35) {
    rarity = 1;
  } else {
    rarity = 0;
  }

  const mult = Math.pow(2, rarity);
  const slots: NftItem['slot'][] = ['weapon', 'armor', 'relic'];
  const slot = slots[Math.floor(rngB * slots.length) % slots.length];
  const nouns = SLOT_NOUNS[slot];
  const prefix = WEAPON_PREFIXES[rarity];
  const noun = nouns[Math.floor((rngA * 17 + rngB * 13) * 10) % nouns.length];

  const strBonus = slot === 'armor' ? Math.round(2 * mult) : Math.round(5 * mult);
  const defBonus = slot === 'weapon' ? Math.round(1 * mult) : Math.round(4 * mult);
  const ccValue = Math.round(18 * mult);

  return {
    id,
    name: `${prefix} ${noun}`,
    slot,
    rarity,
    strBonus,
    defBonus,
    ccValue,
    equipped: false,
  };
}

export function equipNftInList(nfts: NftItem[], itemId: string): NftItem[] {
  const target = nfts.find((n) => n.id === itemId);
  if (!target) return nfts;
  const togglingOff = target.equipped;
  return nfts.map((item) => {
    if (item.id === itemId) {
      return { ...item, equipped: !togglingOff };
    }
    if (!togglingOff && item.slot === target.slot) {
      return { ...item, equipped: false };
    }
    return item;
  });
}

export function purchaseShopItem(
  player: PlayerState,
  itemId: string,
): { ok: boolean; message: string } {
  const item = SHOP_ITEMS.find((s) => s.id === itemId);
  if (!item) return { ok: false, message: 'Unknown item.' };
  if (player.gold < item.goldCost) {
    return { ok: false, message: `Need ${item.goldCost} Gold.` };
  }
  if (player.cc < item.ccCost) {
    return { ok: false, message: `Need ${item.ccCost} CC.` };
  }

  player.gold -= item.goldCost;
  player.cc -= item.ccCost;

  switch (item.id) {
    case 'minor_potion':
      player.hp = Math.min(player.maxHp, player.hp + 30);
      return { ok: true, message: 'Used Minor Potion (+30 HP).' };
    case 'major_potion':
      player.hp = Math.min(player.maxHp, player.hp + 80);
      return { ok: true, message: 'Used Major Potion (+80 HP).' };
    case 'energy_draught':
      player.stamina = Math.min(player.maxStamina, player.stamina + 50);
      return { ok: true, message: 'Used Energy Draught (+50 Stamina).' };
    case 'xp_scroll': {
      const res = grantPlayerXp(player, 200);
      return {
        ok: true,
        message: res.leveledUp
          ? `XP Scroll read (+200 XP) — LEVEL UP to Lv.${player.level}!`
          : 'XP Scroll read (+200 XP).',
      };
    }
    case 'cc_multiplier':
      player.ccMultTimer = Math.max(player.ccMultTimer, 60);
      return { ok: true, message: 'CC Multiplier 2x active for 60s!' };
    case 'revive_token':
      player.reviveTokens += 1;
      return { ok: true, message: `Revive Token acquired (Total: ${player.reviveTokens}).` };
    case 'nuke_reset':
      player.nukeUnlocked = true;
      player.nukeCd = 0;
      return { ok: true, message: 'Teraton Bomb armed and ready!' };
    case 'shadow_essence':
      player.essenceBuffTimer = Math.max(player.essenceBuffTimer, 300);
      return { ok: true, message: 'Shadow Essence active (+10 STR, +5 AGI for 5m).' };
    default:
      return { ok: true, message: `Purchased ${item.name}.` };
  }
}
