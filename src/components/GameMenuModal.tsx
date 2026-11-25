import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  DOMAIN_MILESTONES,
  RARITY_COLORS,
  RARITY_NAMES,
  SHOP_ITEMS,
} from '../game/rules';
import { HudSnapshot } from '../game/types';

type MenuTab = 'stats' | 'nft' | 'shop' | 'causality' | 'domain' | 'controls';

interface GameMenuModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onBuyShopItem: (itemId: string) => { ok: boolean; message: string };
  onEquipNft: (itemId: string) => void;
  onSellNft: (itemId: string) => void;
  onSummonBoss: () => void;
  onTriggerDomain: () => void;
  onTriggerNuke: () => void;
}

const TABS: Array<{ id: MenuTab; label: string }> = [
  { id: 'stats', label: 'Stats' },
  { id: 'nft', label: 'NFT Vault' },
  { id: 'shop', label: 'Shop' },
  { id: 'causality', label: 'Causality v2' },
  { id: 'domain', label: 'Domain & Nuke' },
  { id: 'controls', label: 'Controls' },
];

export const GameMenuModal: React.FC<GameMenuModalProps> = ({
  hud,
  onClose,
  onBuyShopItem,
  onEquipNft,
  onSellNft,
  onSummonBoss,
  onTriggerDomain,
  onTriggerNuke,
}) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('stats');
  const [feedback, setFeedback] = useState<string>('');
  const { player } = hud;

  const handleBuy = (id: string) => {
    const res = onBuyShopItem(id);
    setFeedback(res.message);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="ShadowRealm Menu"
    >
      <div className="w-full max-w-[820px] max-h-[84vh] hud-panel rounded-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#c49b58]/30 bg-[#100c1c]">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-lg font-bold text-[#f6eedf] tracking-wide">
              Ascendant Grimoire
            </h2>
            <span className="font-mono-num text-xs text-[#d4a351]">
              {player.gold}G · {player.cc} CC
            </span>
          </div>
          <button
            type="button"
            aria-label="Close Menu"
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-[#c7bdd6] hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6-Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#c49b58]/20 bg-[#0d0a16] overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => {
                setActiveTab(t.id);
                setFeedback('');
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                activeTab === t.id
                  ? 'bg-[#c98b2c] text-[#110c19]'
                  : 'text-[#bfb4d0] hover:text-[#f6eedf] hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {feedback && (
            <div className="mb-4 px-3.5 py-2 rounded bg-[#1d1530] border border-[#c49b58]/40 text-xs text-[#f5d08a]">
              {feedback}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2.5">
                <h3 className="font-display text-sm font-bold text-[#d4a351]">Hero Attributes</h3>
                <div className="grid grid-cols-2 gap-2 font-mono-num text-xs">
                  <div className="p-2.5 rounded bg-[#151024] border border-white/10">
                    <div className="text-[#9e92b5]">Level</div>
                    <div className="text-base font-bold text-[#f6eedf] mt-0.5">{player.level}</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#151024] border border-white/10">
                    <div className="text-[#9e92b5]">Score</div>
                    <div className="text-base font-bold text-[#f5a623] mt-0.5">{player.score}</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#151024] border border-white/10">
                    <div className="text-[#9e92b5]">STR / DEF / AGI</div>
                    <div className="text-sm font-bold text-[#f6eedf] mt-0.5">
                      {player.totalStr} / {player.totalDef} / {player.totalAgi}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#151024] border border-white/10">
                    <div className="text-[#9e92b5]">Kills / Streak</div>
                    <div className="text-sm font-bold text-[#4ade80] mt-0.5">
                      {player.kills} / Best {player.bestStreak}
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSummonBoss();
                      setFeedback('Shadow King summoned near the Shadow Spire!');
                    }}
                    className="px-4 py-2 rounded bg-[#881337] hover:bg-[#9f1239] text-xs font-semibold text-white cursor-pointer"
                  >
                    Summon Shadow King Boss
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-display text-sm font-bold text-[#d4a351]">Recent Combat Log</h3>
                <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-1">
                  {hud.combatLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="text-xs px-2.5 py-1.5 rounded bg-[#140f22] border border-white/5 text-[#d5cbe3]"
                    >
                      <span className="font-mono-num text-[#877ba0] mr-2">[{entry.time}s]</span>
                      {entry.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nft' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-[#b8adc8]">
                <span>Equip relics for instant STR/DEF bonuses or sell them for CC.</span>
                <span className="font-mono-num">{hud.nfts.length} items</span>
              </div>
              {hud.nfts.length === 0 ? (
                <p className="text-xs text-[#9b8fb2] py-6 text-center">
                  No NFT gear in vault yet. Defeat realm foes or reach 200 CC for an Epic airdrop.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {hud.nfts.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded bg-[#140f22] border flex flex-col justify-between gap-2"
                      style={{ borderColor: item.equipped ? '#f5a623' : 'rgba(255,255,255,0.1)' }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-display text-sm font-bold"
                            style={{ color: RARITY_COLORS[item.rarity] }}
                          >
                            {item.name}
                          </span>
                          <span className="font-mono-num text-[11px] text-[#b4a7c8] uppercase">
                            {RARITY_NAMES[item.rarity]} · {item.slot}
                          </span>
                        </div>
                        <div className="font-mono-num text-xs text-[#dfd5eb] mt-1">
                          +{item.strBonus} STR · +{item.defBonus} DEF · Value {item.ccValue} CC
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onEquipNft(item.id)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                            item.equipped
                              ? 'bg-[#f5a623] text-[#110c19]'
                              : 'bg-[#2a1f45] text-[#efe8dc] hover:bg-[#3a2c5e]'
                          }`}
                        >
                          {item.equipped ? 'Equipped' : 'Equip'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSellNft(item.id)}
                          className="px-3 py-1.5 rounded text-xs font-semibold bg-[#221a33] text-[#d6cbe6] hover:bg-[#3b1c2e] hover:text-[#fca5a5] cursor-pointer"
                        >
                          Sell +{item.ccValue} CC
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SHOP_ITEMS.map((item) => {
                const canAfford = player.gold >= item.goldCost && player.cc >= item.ccCost;
                const priceParts: string[] = [];
                if (item.goldCost > 0) priceParts.push(`${item.goldCost}G`);
                if (item.ccCost > 0) priceParts.push(`${item.ccCost} CC`);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded bg-[#140f22] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#f5ecdb] text-sm">{item.name}</div>
                      <div className="text-xs text-[#a89cc0] mt-0.5">{item.description}</div>
                      <div className="font-mono-num text-xs text-[#f5a623] mt-1">
                        {priceParts.join(' + ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleBuy(item.id)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold shrink-0 ${
                        canAfford
                          ? 'bg-[#c98b2c] hover:bg-[#dc9b36] text-[#110c19] cursor-pointer'
                          : 'bg-[#231d32] text-[#6d6285] cursor-not-allowed'
                      }`}
                    >
                      Buy
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'causality' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[#b3a7c8] mb-1">
                Priority-sorted live state of all 10 Causality Engine v2 rules (AND / OR / NOT logic).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/15 text-[#d4a351] font-mono-num">
                      <th className="py-1.5 pr-2">Pri</th>
                      <th className="py-1.5 pr-2">Rule</th>
                      <th className="py-1.5 pr-2">Logic</th>
                      <th className="py-1.5 pr-2">Fires</th>
                      <th className="py-1.5 pr-2">CD</th>
                      <th className="py-1.5">State</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono-num">
                    {hud.causalityRules.map((rule) => (
                      <tr key={rule.id} className="border-b border-white/5 text-[#d8cfe6]">
                        <td className="py-2 pr-2 text-[#f5a623]">{rule.priority}</td>
                        <td className="py-2 pr-2 font-sans">
                          <div className="font-semibold text-[#f3ead8]">{rule.id}</div>
                          <div className="text-[11px] text-[#9b8fb2]">{rule.label}</div>
                        </td>
                        <td className="py-2 pr-2">{rule.logic}</td>
                        <td className="py-2 pr-2">
                          {rule.fires}
                          {rule.maxFires > 0 ? `/${rule.maxFires}` : ''}
                        </td>
                        <td className="py-2 pr-2">{rule.cooldownRemaining > 0 ? `${rule.cooldownRemaining}s` : 'Ready'}</td>
                        <td className="py-2">
                          <span className={rule.conditionMet ? 'text-[#4ade80]' : 'text-[#877ba0]'}>
                            {rule.conditionMet ? 'Active' : 'Idle'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'domain' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded bg-[#18102b] border border-[#a855f7]/40">
                <div>
                  <div className="font-display text-base font-bold text-[#e9d5ff]">
                    Infinite Devouring Domain · Lv.{player.domainLevel} / 999
                  </div>
                  <div className="font-mono-num text-xs text-[#c4b5fd] mt-0.5">
                    Range: {player.domainRange}u · Cooldown: {player.domainCd > 0 ? `${player.domainCd}s` : 'Ready'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerDomain();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded bg-[#7c3aed] hover:bg-[#8b5cf6] text-xs font-semibold text-white cursor-pointer"
                  >
                    Activate Domain [G]
                  </button>
                  <button
                    type="button"
                    disabled={!player.nukeUnlocked || player.nukeCd > 0}
                    onClick={() => {
                      onTriggerNuke();
                      onClose();
                    }}
                    className={`px-3.5 py-2 rounded text-xs font-semibold ${
                      player.nukeUnlocked && player.nukeCd <= 0
                        ? 'bg-[#0284c7] hover:bg-[#0ea5e9] text-white cursor-pointer'
                        : 'bg-[#221c33] text-[#786c91] cursor-not-allowed'
                    }`}
                  >
                    {player.nukeUnlocked ? 'Detonate Nuke [N]' : 'Nuke Locked (Lv.5 & 10 Kills)'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DOMAIN_MILESTONES.map((m) => {
                  const unlocked = player.domainLevel >= m.level;
                  return (
                    <div
                      key={m.level}
                      className={`p-2.5 rounded border text-xs ${
                        unlocked
                          ? 'bg-[#1c1333] border-[#a855f7]/50 text-[#f1e9fe]'
                          : 'bg-[#110d1c] border-white/10 text-[#867a9f]'
                      }`}
                    >
                      <div className="flex justify-between font-semibold">
                        <span>{m.name}</span>
                        <span className="font-mono-num">Lv.{m.level}</span>
                      </div>
                      <p className="mt-0.5 opacity-90">{m.effect}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                ['W A S D / Arrows', 'Move hero relative to camera'],
                ['Shift', 'Sprint (drains Stamina)'],
                ['Space', 'Jump (with coyote time)'],
                ['Z / Left Click', 'Basic Attack (combo & 4x crit)'],
                ['X', 'Class Power Ability + status effect'],
                ['C', 'Vitality Heal (+30% HP)'],
                ['Q / Ctrl', 'Shadow Dash (20 Stamina, i-frames)'],
                ['G', 'Activate Infinite Devouring Domain'],
                ['N', 'Detonate Teraton Bomb (when unlocked)'],
                ['F', 'Toggle Fly Mode'],
                ['Right-Click Drag / Scroll', 'Orbit camera & zoom'],
                ['Tab / F1 / Esc', 'Open Grimoire Menu / Pause'],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-[#140f22] border border-white/10"
                >
                  <span className="font-mono-num text-[#f5a623] font-bold whitespace-nowrap">{key}</span>
                  <span className="text-[#cfc5e0] text-right">{desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
