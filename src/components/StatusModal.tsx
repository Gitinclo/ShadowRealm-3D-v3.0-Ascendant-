import React from 'react';
import { GamePhase, HudSnapshot } from '../game/types';

interface StatusModalProps {
  phase: Extract<GamePhase, 'paused' | 'gameover'>;
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  phase,
  hud,
  onResume,
  onRestart,
  onReturnTitle,
}) => {
  const isPause = phase === 'paused';
  const { player } = hud;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={isPause ? 'Game Paused' : 'Fallen in ShadowRealm'}
    >
      <div className="w-full max-w-[400px] hud-panel rounded-lg p-6 text-center flex flex-col gap-5">
        <div>
          <h2 className="font-display text-2xl font-black tracking-wide text-[#f6eedf]">
            {isPause ? 'Paused' : 'Fallen'}
          </h2>
          <p className="text-xs text-[#b5a9c8] mt-1">
            {isPause
              ? `${player.name} · ${hud.zoneName}`
              : `${player.name} fell in ${hud.zoneName} at Level ${player.level}`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 font-mono-num">
          <div className="p-2.5 rounded bg-[#140f22] border border-white/10">
            <div className="text-[10px] text-[#9b8fb2]">SCORE</div>
            <div className="text-base font-bold text-[#f5a623] mt-0.5">{player.score}</div>
          </div>
          <div className="p-2.5 rounded bg-[#140f22] border border-white/10">
            <div className="text-[10px] text-[#9b8fb2]">KILLS</div>
            <div className="text-base font-bold text-[#4ade80] mt-0.5">{player.kills}</div>
          </div>
          <div className="p-2.5 rounded bg-[#140f22] border border-white/10">
            <div className="text-[10px] text-[#9b8fb2]">STREAK</div>
            <div className="text-base font-bold text-[#c084fc] mt-0.5">{player.bestStreak}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isPause ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-2.5 px-4 rounded-md bg-[#c98b2c] hover:bg-[#dc9b36] text-[#110c19] font-display text-sm font-bold tracking-wider cursor-pointer"
            >
              Resume
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="w-full py-2.5 px-4 rounded-md bg-[#c98b2c] hover:bg-[#dc9b36] text-[#110c19] font-display text-sm font-bold tracking-wider cursor-pointer"
            >
              Try Again
            </button>
          )}
          {isPause && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 px-4 rounded-md bg-[#221a35] hover:bg-[#31254d] text-[#efe8dc] text-sm font-semibold cursor-pointer"
            >
              Restart Run
            </button>
          )}
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 px-4 rounded-md bg-transparent border border-[#c49b58]/35 hover:border-[#f5a623] text-[#d6cbe6] text-sm font-semibold cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};
