import React from 'react';
import { BookOpen, Pause, Volume2, VolumeX } from 'lucide-react';
import { CLASS_DEFINITIONS, DAY_CYCLE_SECONDS } from '../game/rules';
import { HudSnapshot } from '../game/types';

interface PlayingHudProps {
  hud: HudSnapshot;
  muted: boolean;
  hpBarRef: React.RefObject<HTMLDivElement | null>;
  trailingHpBarRef: React.RefObject<HTMLDivElement | null>;
  stamBarRef: React.RefObject<HTMLDivElement | null>;
  onOpenMenu: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onBasicAttack: () => void;
  onPower: () => void;
  onHeal: () => void;
  onDash: () => void;
  onDomain: () => void;
  onNuke: () => void;
}

function AbilityIcon({ id, activeColor }: { id: string; activeColor: string }) {
  switch (id) {
    case 'attack':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path d="M18 3l3 3-9 9-2 3-4-4 3-2 9-9z" fill="#181226" stroke={activeColor} strokeWidth="1.8" />
          <path d="M5 19l3-3" stroke={activeColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'power':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <polygon
            points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9"
            fill="#181226"
            stroke={activeColor}
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'heal':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <rect x="9" y="4" width="6" height="16" rx="1" fill="#181226" stroke="#4ade80" strokeWidth="1.7" />
          <rect x="4" y="9" width="16" height="6" rx="1" fill="#181226" stroke="#4ade80" strokeWidth="1.7" />
        </svg>
      );
    case 'dash':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path
            d="M4 12h13m0 0l-5-5m5 5l-5 5M4 7h6M4 17h6"
            fill="none"
            stroke="#93c5fd"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'domain':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="#181226" stroke="#c084fc" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" fill="#a855f7" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="#181226" stroke="#38bdf8" strokeWidth="1.8" />
          <path d="M12 12l-4-6h8l-4 6zm0 0l6 4-4 4-2-8zm0 0l-6 4 4 4 2-8z" fill="#38bdf8" />
        </svg>
      );
  }
}

export const PlayingHud: React.FC<PlayingHudProps> = ({
  hud,
  muted,
  hpBarRef,
  trailingHpBarRef,
  stamBarRef,
  onOpenMenu,
  onToggleMute,
  onPause,
  onBasicAttack,
  onPower,
  onHeal,
  onDash,
  onDomain,
  onNuke,
}) => {
  const { player } = hud;
  const cls = CLASS_DEFINITIONS[player.classId];
  const hpPct = Math.max(0, Math.min(100, (player.hp / Math.max(1, player.maxHp)) * 100));
  const trailPct = Math.max(0, Math.min(100, (player.trailingHp / Math.max(1, player.maxHp)) * 100));
  const stamPct = Math.max(0, Math.min(100, (player.stamina / Math.max(1, player.maxStamina)) * 100));
  const xpPct = Math.max(0, Math.min(100, (player.xp / Math.max(1, player.xpToNext)) * 100));

  const abilities = [
    {
      id: 'attack',
      key: 'Z',
      name: 'Strike',
      cd: player.attackCd,
      locked: false,
      active: false,
      onClick: onBasicAttack,
    },
    {
      id: 'power',
      key: 'X',
      name: cls.powerName.split(' ')[0],
      cd: player.powerCd,
      locked: false,
      active: false,
      onClick: onPower,
    },
    {
      id: 'heal',
      key: 'C',
      name: 'Heal',
      cd: player.healCd,
      locked: false,
      active: false,
      onClick: onHeal,
    },
    {
      id: 'dash',
      key: 'Q',
      name: 'Dash',
      cd: player.dashCd,
      locked: false,
      active: false,
      onClick: onDash,
    },
    {
      id: 'domain',
      key: 'G',
      name: `Dom.${player.domainLevel}`,
      cd: player.domainCd,
      locked: false,
      active: player.domainActiveTimer > 0,
      onClick: onDomain,
    },
    {
      id: 'nuke',
      key: 'N',
      name: 'Nuke',
      cd: player.nukeCd,
      locked: !player.nukeUnlocked,
      active: false,
      onClick: onNuke,
    },
  ];

  // Minimap coordinate projection (world radius 82 -> SVG radius 42 centered at 48,48)
  const mapScale = 42 / 82;
  const pxMap = 48 + player.x * mapScale;
  const pzMap = 48 + player.z * mapScale;
  const spireX = 48;
  const spireZ = 48 - 18 * mapScale;

  const toneColor: Record<string, string> = {
    gold: '#f5a623',
    violet: '#c084fc',
    red: '#f87171',
    green: '#4ade80',
    cyan: '#38bdf8',
    neutral: '#cfc4df',
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none">
      {/* Peripheral Low-HP Crimson Vignette */}
      {hud.lowHpVignette > 0 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, transparent 54%, rgba(185, 28, 28, ${
              hud.lowHpVignette * 0.55
            }) 100%)`,
          }}
        />
      )}

      {/* Peripheral Domain Violet Edge Glow */}
      {hud.domainVignette > 0 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, transparent 58%, rgba(124, 58, 237, ${
              hud.domainVignette * 0.45
            }) 100%)`,
          }}
        />
      )}

      {/* TOP-LEFT: Hero Vitality, Stamina, Level, Currencies */}
      <div className="fixed top-4 left-4 w-[276px] hud-panel rounded-md px-3.5 py-3 pointer-events-auto">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-[#f6eedf] truncate">
                {player.name}
              </span>
              <span className="font-mono-num text-xs font-bold text-[#f5a623] shrink-0">
                LV.{player.level}
              </span>
            </div>
            <div className="text-[11px] text-[#b8adc8] truncate">
              {player.className} · {hud.zoneName}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono-num text-[11px] text-[#d9ceea]">
              {hud.isNight ? 'Night' : 'Day'} {Math.round((hud.dayTime / DAY_CYCLE_SECONDS) * 24)}:00
            </div>
            <div className="font-mono-num text-[10px] text-[#9b8fb2]">Foes {hud.aliveEnemies}</div>
          </div>
        </div>

        {/* HP Bar with trailing damage ghost bar */}
        <div className="mt-2.5">
          <div className="flex justify-between text-[11px] font-mono-num mb-0.5">
            <span className="text-[#fca5a5] font-bold">HP</span>
            <span className="text-[#f6eedf]">
              {player.hp} / {player.maxHp}
            </span>
          </div>
          <div className="relative h-2.5 w-full rounded-sm bg-[#1f1324] overflow-hidden border border-[#522436]">
            <div
              ref={trailingHpBarRef}
              className="absolute inset-y-0 left-0 bg-[#f59e0b]/70"
              style={{ width: `${trailPct}%` }}
            />
            <div
              ref={hpBarRef}
              className="absolute inset-y-0 left-0 bg-[#dc2626]"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="mt-1.5">
          <div className="flex justify-between text-[10px] font-mono-num mb-0.5">
            <span className="text-[#93c5fd]">STAMINA</span>
            <span className="text-[#d6cde3]">
              {player.stamina} / {player.maxStamina}
            </span>
          </div>
          <div className="relative h-1.5 w-full rounded-sm bg-[#141a2b] overflow-hidden">
            <div
              ref={stamBarRef}
              className="absolute inset-y-0 left-0 bg-[#38bdf8]"
              style={{ width: `${stamPct}%` }}
            />
          </div>
        </div>

        {/* XP Strip */}
        <div className="mt-1.5 h-1 w-full rounded-sm bg-[#1c152b] overflow-hidden">
          <div className="h-full bg-[#a855f7]" style={{ width: `${xpPct}%` }} />
        </div>

        {/* Compact Currencies & Tokens */}
        <div className="mt-2 pt-2 border-t border-[#c49b58]/20 flex items-center justify-between text-[11px] font-mono-num text-[#e6d9bf]">
          <span>{player.gold}G</span>
          <span className="text-[#c084fc]">{player.cc} CC</span>
          <span>Kills {player.kills}</span>
          <span className="text-[#f5a623]">Rev {player.reviveTokens}</span>
        </div>
      </div>

      {/* TOP-CENTER: Boss Health Bar + Transient Event Banner */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-[440px] w-[90vw]">
        {hud.bossActive && (
          <div className="w-full hud-panel rounded-md px-4 py-2">
            <div className="flex justify-between text-xs font-display font-bold text-[#fca5a5] mb-1">
              <span>{hud.bossName}</span>
              <span className="font-mono-num">
                {hud.bossHp} / {hud.bossMaxHp}
              </span>
            </div>
            <div className="h-2 w-full rounded-sm bg-[#24101d] overflow-hidden border border-[#9f1239]">
              <div
                className="h-full bg-[#e11d48]"
                style={{ width: `${Math.max(0, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {hud.bannerText && (
          <div
            className="px-4 py-1.5 rounded-md bg-[#120c20]/95 border text-xs font-display font-bold tracking-wider hud-text-shadow"
            style={{
              borderColor: toneColor[hud.bannerTone],
              color: toneColor[hud.bannerTone],
            }}
          >
            {hud.bannerText}
          </div>
        )}

        {player.comboCount >= 2 && (
          <div className="font-display text-lg font-black text-[#f5a623] hud-text-shadow">
            {player.comboCount}x COMBO
          </div>
        )}
      </div>

      {/* TOP-RIGHT: Utility Buttons + Compact Realm Minimap */}
      <div className="fixed top-4 right-4 flex flex-col items-end gap-2.5">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Realm Menu"
            title="Menu (Tab)"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMenu();
            }}
            className="h-9 px-3 hud-slot rounded-md flex items-center gap-1.5 text-xs font-semibold text-[#f3e8d2] hover:border-[#f5a623] cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-4 h-4 text-[#f5a623]" />
            <span>Menu</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title="Mute (M)"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 hud-slot rounded-md flex items-center justify-center text-[#e6d9bf] hover:border-[#f5a623] cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-[#f87171]" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game"
            title="Pause (Esc)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-9 h-9 hud-slot rounded-md flex items-center justify-center text-[#e6d9bf] hover:border-[#f5a623] cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Zone Minimap */}
        <div className="hud-panel rounded-full p-1.5" aria-label="Zone Minimap">
          <svg viewBox="0 0 96 96" className="w-24 h-24 block">
            <circle cx="48" cy="48" r="45" fill="#0c0916" stroke="#c49b58" strokeOpacity="0.45" strokeWidth="1.2" />
            {/* Radial zone rings */}
            <circle cx="48" cy="48" r="39" fill="none" stroke="#6b21a8" strokeOpacity="0.35" strokeWidth="0.8" />
            <circle cx="48" cy="48" r="28" fill="none" stroke="#b45309" strokeOpacity="0.35" strokeWidth="0.8" />
            <circle cx="48" cy="48" r="16" fill="none" stroke="#15803d" strokeOpacity="0.4" strokeWidth="0.8" />
            {/* Shadow Spire landmark diamond */}
            <polygon
              points={`${spireX},${spireZ - 3.5} ${spireX + 3},${spireZ} ${spireX},${spireZ + 3.5} ${spireX - 3},${spireZ}`}
              fill="#c084fc"
            />
            {/* Live Enemies */}
            {hud.minimapEntities.map((e) => (
              <circle
                key={e.id}
                cx={48 + e.x * mapScale}
                cy={48 + e.z * mapScale}
                r={e.type === 'boss' ? 3.2 : 1.9}
                fill={e.type === 'boss' ? '#f43f5e' : e.type === 'shade' ? '#22d3ee' : '#f87171'}
              />
            ))}
            {/* Player dot */}
            <circle cx={pxMap} cy={pzMap} r="3" fill="#f5a623" stroke="#ffffff" strokeWidth="0.9" />
          </svg>
        </div>
      </div>

      {/* BOTTOM-LEFT: Compact Recent Event Log (3 lines max) */}
      <div className="hidden md:flex fixed bottom-4 left-4 w-[310px] flex-col gap-1 pointer-events-none">
        {hud.combatLog.slice(0, 3).map((entry) => (
          <div
            key={entry.id}
            className="text-[11px] leading-snug px-2.5 py-1 rounded bg-[#0c0916]/80 border border-white/5 truncate"
            style={{ color: toneColor[entry.tone] ?? '#d8cee6' }}
          >
            {entry.text}
          </div>
        ))}
      </div>

      {/* BOTTOM-CENTER: 6-Slot Action Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
        {abilities.map((ab) => {
          const onCd = ab.cd > 0;
          const disabled = ab.locked || onCd;
          return (
            <button
              key={ab.id}
              type="button"
              tabIndex={-1}
              aria-label={`${ab.name} (${ab.key})`}
              onClick={(e) => {
                e.currentTarget.blur();
                ab.onClick();
              }}
              className={`relative w-14 h-14 hud-slot rounded-md flex flex-col items-center justify-center gap-0.5 transition-transform cursor-pointer ${
                ab.active
                  ? 'border-[#c084fc] bg-[#2a1545]/95'
                  : disabled
                    ? 'opacity-55'
                    : 'hover:border-[#f5a623] active:scale-95'
              }`}
            >
              <span className="absolute top-1 left-1.5 font-mono-num text-[10px] font-bold text-[#d4a351]">
                {ab.key}
              </span>
              <AbilityIcon id={ab.id} activeColor={cls.accentHex} />
              <span className="text-[10px] font-medium text-[#e7decb] leading-none truncate max-w-[48px]">
                {ab.locked ? 'Locked' : onCd ? `${ab.cd.toFixed(1)}s` : ab.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
