import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDamageToPlayer,
  calculateAttackDamage,
  computeEffectiveStats,
  createEnemy,
  createInitialPlayer,
  equipNftInList,
  evaluateEnemyAIState,
  generateNftItem,
  getDomainCooldown,
  getDomainRange,
  getZoneAt,
  grantPlayerXp,
  isNightTime,
  purchaseShopItem,
} from './rules';
import { CausalityContext, CausalityEffectCallbacks, CausalityEngine } from './causality';

function makeNoopCallbacks(log: string[]): CausalityEffectCallbacks {
  return {
    onUnlockNuke: () => log.push('unlock_nuke'),
    onLowHpWarn: () => log.push('low_hp_warn'),
    onStreakBonus: () => log.push('on_fire'),
    onBossAlert: () => log.push('boss_alert'),
    onCcAirdrop: () => log.push('cc_airdrop'),
    onSpawnBossWave: () => log.push('boss_wave'),
    onWaveRespawn: () => log.push('wave_respawn'),
    onNukeReady: () => log.push('nuke_ready'),
    onAbsorbEvolve: () => log.push('absorb_evolve'),
    onNightWarn: () => log.push('night_warn'),
  };
}

function baseContext(overrides: Partial<CausalityContext> = {}): CausalityContext {
  return {
    level: 1,
    kills: 0,
    deaths: 0,
    hpPct: 1,
    streak: 0,
    cc: 25,
    domainLevel: 1,
    nukeUnlocked: false,
    nukeCd: 0,
    bossAlive: false,
    nearestBossDist: 99,
    aliveEnemies: 5,
    isNight: false,
    inSafeClearing: true,
    ...overrides,
  };
}

test('zones and day/night cycle match radial and 120s rules', () => {
  assert.equal(getZoneAt(0, 10), 'forest');
  assert.equal(getZoneAt(40, 0), 'desert');
  assert.equal(getZoneAt(0, 62), 'mountains');
  assert.equal(getZoneAt(80, 10), 'cursed');

  assert.equal(isNightTime(10), false);
  assert.equal(isNightTime(80), true);
  assert.equal(isNightTime(125), false);
});

test('combat crit 4x multiplier and combo scaling work deterministically', () => {
  const normal = calculateAttackDamage(25, 10, 0, false, 0.99);
  assert.equal(normal.isCrit, false);
  assert.equal(normal.damage, 25);

  const crit = calculateAttackDamage(25, 10, 0, false, 0.01);
  assert.equal(crit.isCrit, true);
  assert.equal(crit.damage, 100);

  const comboPower = calculateAttackDamage(25, 10, 5, true, 0.99);
  assert.equal(comboPower.isCrit, false);
  assert.ok(comboPower.damage > normal.damage * 2);
});

test('enemy 5-state AI handles chase, attack, and low-HP flee thresholds', () => {
  const shade = createEnemy(1, 'shade', 3, 20, 20, 0.5);
  assert.equal(evaluateEnemyAIState(shade, 22, false), 'Chase');
  assert.equal(evaluateEnemyAIState(shade, 12, false), 'Attack');

  shade.hp = Math.floor(shade.maxHp * 0.2); // below 30% flee threshold
  assert.equal(evaluateEnemyAIState(shade, 10, false), 'Flee');

  const boss = createEnemy(2, 'boss', 5, 0, -40, 0.5);
  boss.hp = 1; // bosses never flee
  assert.equal(evaluateEnemyAIState(boss, 4, false), 'Attack');
});

test('NFT rarity scales by 2^rarity and equip swaps same-slot items cleanly', () => {
  const common = generateNftItem('n1', 0, 0.1, 0.1);
  const epic = generateNftItem('n2', 3, 0.1, 0.1);
  assert.equal(epic.ccValue, common.ccValue * 8);

  const player = createInitialPlayer('Aria', 'knight');
  const baseStats = computeEffectiveStats(player, []);
  const equipped = equipNftInList([common, epic], epic.id);
  const boosted = computeEffectiveStats(player, equipped);
  assert.equal(boosted.str, baseStats.str + epic.strBonus);
  assert.equal(boosted.def, baseStats.def + epic.defBonus);
});

test('Shop purchases deduct Gold/CC and Revive Token saves lethal damage', () => {
  const player = createInitialPlayer('Kael', 'rogue');
  player.invulnTimer = 0;
  player.gold = 200;
  player.cc = 60;
  player.reviveTokens = 0;

  const buy = purchaseShopItem(player, 'revive_token');
  assert.equal(buy.ok, true);
  assert.equal(player.reviveTokens, 1);
  assert.equal(player.gold, 50);
  assert.equal(player.cc, 40);

  const hit = applyDamageToPlayer(player, 9999, 0);
  assert.equal(hit.revived, true);
  assert.equal(hit.died, false);
  assert.equal(player.reviveTokens, 0);
  assert.equal(player.hp, Math.round(player.maxHp * 0.5));
});

test('Domain formulas clamp range at 80u and cooldown floor at 15s', () => {
  assert.equal(getDomainRange(1), 12);
  assert.equal(getDomainRange(250), 80);
  assert.equal(getDomainCooldown(1), 39.75);
  assert.equal(getDomainCooldown(250), 15);
});

test('Causality Engine v2 enforces priority ordering, AND/OR/NOT logic, and cooldowns', () => {
  const engine = new CausalityEngine();
  const fired: string[] = [];
  const cb = makeNoopCallbacks(fired);

  engine.evaluate(
    baseContext({
      level: 5,
      kills: 10,
      hpPct: 0.15,
      cc: 220,
      isNight: true,
      inSafeClearing: false,
    }),
    0.1,
    12,
    cb,
  );

  // Must fire in descending priority order: unlock_nuke (10) -> low_hp_warn (9) -> cc_airdrop (7) -> night_warn (2)
  assert.deepEqual(fired, ['unlock_nuke', 'low_hp_warn', 'cc_airdrop', 'night_warn']);

  // Immediate re-evaluation respects once-only rules and cooldowns
  fired.length = 0;
  engine.evaluate(
    baseContext({
      level: 5,
      kills: 10,
      hpPct: 0.15,
      cc: 220,
      isNight: true,
      inSafeClearing: false,
    }),
    1.0,
    13,
    cb,
  );
  assert.deepEqual(fired, []);

  // After 5s cooldown expires, low_hp_warn can fire again
  engine.evaluate(baseContext({ hpPct: 0.1 }), 5.1, 18, cb);
  assert.deepEqual(fired, ['low_hp_warn']);

  // XP level up increments player level and domain level
  const p = createInitialPlayer('Test', 'mage');
  const lvl = grantPlayerXp(p, 260);
  assert.equal(lvl.leveledUp, true);
  assert.ok(p.level >= 3);
  assert.ok(p.domainLevel >= 5);
});
