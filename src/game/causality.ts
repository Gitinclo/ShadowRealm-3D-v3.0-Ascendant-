import { CausalityRuleSnapshot } from './types';

export interface CausalityContext {
  level: number;
  kills: number;
  deaths: number;
  hpPct: number;
  streak: number;
  cc: number;
  domainLevel: number;
  nukeUnlocked: boolean;
  nukeCd: number;
  bossAlive: boolean;
  nearestBossDist: number;
  aliveEnemies: number;
  isNight: boolean;
  inSafeClearing: boolean;
}

export interface CausalityEffectCallbacks {
  onUnlockNuke: () => void;
  onLowHpWarn: () => void;
  onStreakBonus: () => void;
  onBossAlert: () => void;
  onCcAirdrop: () => void;
  onSpawnBossWave: () => void;
  onWaveRespawn: () => void;
  onNukeReady: () => void;
  onAbsorbEvolve: () => void;
  onNightWarn: () => void;
}

type CauseFn = (ctx: CausalityContext) => boolean;

export function NOT(fn: CauseFn): CauseFn {
  return (ctx) => !fn(ctx);
}

interface InternalRule {
  id: string;
  label: string;
  logic: 'AND' | 'OR';
  priority: number;
  causes: CauseFn[];
  maxFires: number; // 0 = unlimited
  cooldown: number;
  fires: number;
  cooldownRemaining: number;
  lastConditionMet: boolean;
  lastTriggered: string;
  effect: (cb: CausalityEffectCallbacks) => void;
}

export class CausalityEngine {
  private rules: InternalRule[] = [];

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.rules = [
      {
        id: 'unlock_nuke',
        label: 'Unlock Teraton Bomb (Lv>=5 AND Kills>=10)',
        logic: 'AND',
        priority: 10,
        causes: [(c) => c.level >= 5, (c) => c.kills >= 10, NOT((c) => c.nukeUnlocked)],
        maxFires: 1,
        cooldown: 0,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onUnlockNuke(),
      },
      {
        id: 'low_hp_warn',
        label: 'Low Vitality Warning (HP < 20%)',
        logic: 'AND',
        priority: 9,
        causes: [(c) => c.hpPct > 0, (c) => c.hpPct < 0.2],
        maxFires: 0,
        cooldown: 5,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onLowHpWarn(),
      },
      {
        id: 'on_fire',
        label: 'Unstoppable Streak (Streak >= 5)',
        logic: 'AND',
        priority: 8,
        causes: [(c) => c.streak >= 5],
        maxFires: 0,
        cooldown: 8,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onStreakBonus(),
      },
      {
        id: 'boss_alert',
        label: 'Shadow King Proximity (Boss Alive AND Dist<=22u)',
        logic: 'AND',
        priority: 8,
        causes: [(c) => c.bossAlive, (c) => c.nearestBossDist <= 22],
        maxFires: 1,
        cooldown: 0,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onBossAlert(),
      },
      {
        id: 'cc_airdrop',
        label: 'CC Milestone Airdrop (CC >= 200)',
        logic: 'AND',
        priority: 7,
        causes: [(c) => c.cc >= 200],
        maxFires: 1,
        cooldown: 0,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onCcAirdrop(),
      },
      {
        id: 'boss_wave',
        label: 'Shadow King Summon (Lv>=10 OR Deaths>=3)',
        logic: 'OR',
        priority: 6,
        causes: [(c) => c.level >= 10, (c) => c.deaths >= 3],
        maxFires: 0,
        cooldown: 30,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onSpawnBossWave(),
      },
      {
        id: 'wave_respawn',
        label: 'Realm Reinforcements (All Enemies Cleared)',
        logic: 'AND',
        priority: 5,
        causes: [(c) => c.aliveEnemies === 0],
        maxFires: 0,
        cooldown: 4,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onWaveRespawn(),
      },
      {
        id: 'nuke_ready',
        label: 'Teraton Bomb Ready (Unlocked AND CD=0 AND Lv>=3)',
        logic: 'AND',
        priority: 4,
        causes: [(c) => c.nukeUnlocked, (c) => c.nukeCd <= 0, (c) => c.level >= 3],
        maxFires: 5,
        cooldown: 20,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onNukeReady(),
      },
      {
        id: 'absorb_evolve',
        label: 'Domain Evolution (DomainLv>=50 AND Kills>=50)',
        logic: 'AND',
        priority: 3,
        causes: [(c) => c.domainLevel >= 50, (c) => c.kills >= 50],
        maxFires: 1,
        cooldown: 0,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onAbsorbEvolve(),
      },
      {
        id: 'night_warn',
        label: 'Nightfall Surge (Night AND NOT Safe Clearing)',
        logic: 'AND',
        priority: 2,
        causes: [(c) => c.isNight, NOT((c) => c.inSafeClearing)],
        maxFires: 3,
        cooldown: 45,
        fires: 0,
        cooldownRemaining: 0,
        lastConditionMet: false,
        lastTriggered: 'Never',
        effect: (cb) => cb.onNightWarn(),
      },
    ];

    this.rules.sort((a, b) => b.priority - a.priority);
  }

  reset(): void {
    this.registerDefaults();
  }

  evaluate(
    ctx: CausalityContext,
    dt: number,
    elapsedSeconds: number,
    callbacks: CausalityEffectCallbacks,
  ): string[] {
    const firedIds: string[] = [];

    for (const rule of this.rules) {
      if (rule.cooldownRemaining > 0) {
        rule.cooldownRemaining = Math.max(0, rule.cooldownRemaining - dt);
      }

      const conditionMet =
        rule.logic === 'AND'
          ? rule.causes.every((fn) => fn(ctx))
          : rule.causes.some((fn) => fn(ctx));
      rule.lastConditionMet = conditionMet;

      if (!conditionMet) continue;
      if (rule.maxFires > 0 && rule.fires >= rule.maxFires) continue;
      if (rule.cooldownRemaining > 0) continue;

      rule.fires += 1;
      rule.cooldownRemaining = rule.cooldown;
      rule.lastTriggered = `${Math.floor(elapsedSeconds)}s`;
      rule.effect(callbacks);
      firedIds.push(rule.id);
    }

    return firedIds;
  }

  getSnapshot(): CausalityRuleSnapshot[] {
    return this.rules.map((r) => ({
      id: r.id,
      label: r.label,
      logic: r.logic,
      priority: r.priority,
      fires: r.fires,
      maxFires: r.maxFires,
      cooldownRemaining: Number(r.cooldownRemaining.toFixed(1)),
      conditionMet: r.lastConditionMet,
      lastTriggered: r.lastTriggered,
    }));
  }
}
