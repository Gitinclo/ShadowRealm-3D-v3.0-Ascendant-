import React, { useEffect } from 'react';
import { CLASS_DEFINITIONS } from '../game/rules';
import { PlayerClassId } from '../game/types';

interface TitleScreenProps {
  playerName: string;
  selectedClass: PlayerClassId;
  onNameChange: (name: string) => void;
  onSelectClass: (classId: PlayerClassId) => void;
  onStart: () => void;
}

const CLASS_ORDER: PlayerClassId[] = ['knight', 'mage', 'rogue', 'shaman'];

function ClassEmblem({ classId }: { classId: PlayerClassId }) {
  const color = CLASS_DEFINITIONS[classId].accentHex;
  if (classId === 'knight') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <path
          d="M12 2L4 5.5v6.2c0 5.1 3.4 9.5 8 10.8 4.6-1.3 8-5.7 8-10.8V5.5L12 2z"
          fill="#181326"
          stroke={color}
          strokeWidth="1.8"
        />
        <path d="M12 6v11M8.5 9.5h7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (classId === 'mage') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <polygon
          points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9"
          fill="#181326"
          stroke={color}
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="2.2" fill={color} />
      </svg>
    );
  }
  if (classId === 'rogue') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <path
          d="M19 3L9 13l-3-1-3 3 4 1 1 4 3-3-1-3L21 5l-2-2z"
          fill="#181326"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path
        d="M12 2c2.5 3.6 6 6.2 6 11a6 6 0 11-12 0c0-2.6 1.2-4.8 2.8-6.7.2 1.8 1.2 2.9 2.2 3.4C10.5 6.8 11 4.2 12 2z"
        fill="#181326"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  playerName,
  selectedClass,
  onNameChange,
  onSelectClass,
  onStart,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' && e.code !== 'Enter') return;
      if (e.code === 'Enter' || (e.code === 'Space' && tag !== 'INPUT')) {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart]);

  const activeDef = CLASS_DEFINITIONS[selectedClass];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between">
      {/* Asymmetric dark scrim on left third so the 3D Shadow Spire remains open and visible on right */}
      <div
        className="absolute inset-y-0 left-0 w-full max-w-[560px] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,6,14,0.92) 0%, rgba(10,7,18,0.8) 72%, rgba(10,7,18,0) 100%)',
        }}
      />

      {/* Main Left-Third Title & Class Picker */}
      <main className="relative z-10 flex-1 flex items-center px-6 sm:px-12 py-8">
        <div className="pointer-events-auto w-full max-w-[430px] flex flex-col gap-5">
          {/* Custom Inline SVG ShadowRealm Crest & Title Lockup */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 48 48"
                className="w-11 h-11 shrink-0"
                role="img"
                aria-label="ShadowRealm Crest"
              >
                <polygon
                  points="24,3 42,13 38,36 24,45 10,36 6,13"
                  fill="#130e20"
                  stroke="#d4a351"
                  strokeWidth="2.2"
                />
                <polygon
                  points="24,9 33,24 24,39 15,24"
                  fill="#291645"
                  stroke="#a855f7"
                  strokeWidth="1.8"
                />
                <circle cx="24" cy="24" r="3.8" fill="#f5a623" />
                <path d="M24 3v8M24 37v8" stroke="#f5a623" strokeWidth="1.6" />
              </svg>
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-black tracking-wide text-[#f6eedf] hud-text-shadow leading-none">
                  SHADOWREALM
                </h1>
                <p className="text-xs font-medium tracking-[0.26em] text-[#d4a351] mt-1">
                  ASCENDANT · OPEN WORLD 3D RPG
                </p>
              </div>
            </div>
          </div>

          {/* Hero Name Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hero-name" className="text-xs font-semibold text-[#c9bea8] tracking-wide">
              Hero Name
            </label>
            <input
              id="hero-name"
              type="text"
              maxLength={18}
              value={playerName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ascendant"
              className="w-full px-3.5 py-2.5 rounded-md bg-[#120e1e] border border-[#c49b58]/40 text-sm text-[#f6eedf] placeholder:text-[#7c728d] focus:outline-none focus:border-[#f5a623]"
            />
          </div>

          {/* 4-Class Selection Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#c9bea8] tracking-wide">Choose Class</span>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Player Class">
              {CLASS_ORDER.map((cid) => {
                const def = CLASS_DEFINITIONS[cid];
                const selected = cid === selectedClass;
                return (
                  <button
                    key={cid}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onSelectClass(cid)}
                    className={`text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#1f1733] border-[#f5a623] text-[#f8f2e4]'
                        : 'bg-[#120e1d]/90 border-[#3d3354] text-[#b9aec9] hover:border-[#8a75b3] hover:text-[#efe8dc]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ClassEmblem classId={cid} />
                      <span className="font-display text-sm font-bold whitespace-nowrap truncate">
                        {def.name}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5 text-[11px] font-mono-num text-[#b4a7c8]">
                      <span>HP {def.maxHp}</span>
                      <span>STR {def.str}</span>
                      <span>DEF {def.def}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Class Summary */}
            <div className="px-3.5 py-2.5 rounded-md bg-[#120e1d]/90 border border-[#3a3052] text-xs leading-relaxed">
              <div className="flex items-center justify-between text-[#f4ead6] font-semibold">
                <span>{activeDef.powerName}</span>
                <span className="font-mono-num text-[11px]" style={{ color: activeDef.accentHex }}>
                  AGI {activeDef.agi} · SPD {activeDef.speed.toFixed(1)}
                </span>
              </div>
              <p className="text-[#b3a7c4] mt-0.5">{activeDef.powerDesc}</p>
            </div>
          </div>

          {/* Primary Start Action */}
          <div className="pt-1">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="w-full py-3.5 px-6 rounded-md bg-[#c98b2c] hover:bg-[#dc9b36] active:bg-[#b27820] text-[#110c19] font-display text-base font-bold tracking-wider transition-colors cursor-pointer shadow-lg focus-visible:outline-2 focus-visible:outline-[#f5a623] focus-visible:outline-offset-2"
            >
              Enter ShadowRealm
            </button>
          </div>
        </div>
      </main>

      {/* Single flat borderless control hint in bottom safe margin */}
      <footer className="relative z-10 px-6 pb-4 text-center">
        <p className="text-xs text-[#c7bdd6]/90 hud-text-shadow tracking-wide">
          WASD Move · Shift Sprint · Space Jump · Z Attack · X Power · C Heal · G Domain · Tab Menu · Esc Pause
        </p>
      </footer>
    </div>
  );
};
