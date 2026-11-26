import { useCallback, useEffect, useRef, useState } from 'react';
import { GameMenuModal } from './components/GameMenuModal';
import { PlayingHud } from './components/PlayingHud';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { ShadowRealmEngine } from './game/engine';
import { HudSnapshot, PlayerClassId } from './game/types';

export function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ShadowRealmEngine | null>(null);
  const hpBarRef = useRef<HTMLDivElement | null>(null);
  const trailingHpBarRef = useRef<HTMLDivElement | null>(null);
  const stamBarRef = useRef<HTMLDivElement | null>(null);

  const [playerName, setPlayerName] = useState('Ascendant');
  const [selectedClass, setSelectedClass] = useState<PlayerClassId>('knight');
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new ShadowRealmEngine(
      mount,
      {
        onHudUpdate: (snapshot) => setHud(snapshot),
        onFastBars: (hpPct, trailingPct, stamPct) => {
          if (hpBarRef.current) hpBarRef.current.style.width = `${Math.max(0, Math.min(100, hpPct))}%`;
          if (trailingHpBarRef.current) {
            trailingHpBarRef.current.style.width = `${Math.max(0, Math.min(100, trailingPct))}%`;
          }
          if (stamBarRef.current) {
            stamBarRef.current.style.width = `${Math.max(0, Math.min(100, stamPct))}%`;
          }
        },
        onPhaseChange: (phase) => {
          if (phase !== 'playing') {
            setMenuOpen(false);
          }
        },
        onToggleMenu: () => {
          setMenuOpen((prev) => !prev);
        },
      },
      'knight',
    );
    engineRef.current = engine;

    // Support ?autostart=1 for instant gameplay boot
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startNewGame('Ascendant', 'knight');
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectClass = useCallback((classId: PlayerClassId) => {
    setSelectedClass(classId);
    engineRef.current?.selectPreviewClass(classId);
  }, []);

  const handleStart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMenuOpen(false);
    engineRef.current?.startNewGame(playerName, selectedClass);
  }, [playerName, selectedClass]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = engineRef.current?.toggleMute() ?? false;
    setMuted(nextMuted);
  }, []);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    engineRef.current?.setJoystickInput(x, y);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      engineRef.current?.setJoystickInput(0, 0);
    }
  }, [menuOpen]);

  const phase = hud?.phase ?? 'title';

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#09070f]">
      {/* Isolated WebGL Canvas Container — never unmounts on HUD updates */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full z-0" />

      {phase === 'title' && (
        <TitleScreen
          playerName={playerName}
          selectedClass={selectedClass}
          onNameChange={setPlayerName}
          onSelectClass={handleSelectClass}
          onStart={handleStart}
        />
      )}

      {hud && phase === 'playing' && (
        <PlayingHud
          hud={hud}
          muted={muted}
          menuOpen={menuOpen}
          hpBarRef={hpBarRef}
          trailingHpBarRef={trailingHpBarRef}
          stamBarRef={stamBarRef}
          onOpenMenu={() => setMenuOpen((prev) => !prev)}
          onToggleMute={handleToggleMute}
          onPause={() => {
            setMenuOpen(false);
            engineRef.current?.setPhase('paused');
          }}
          onJoystickMove={handleJoystickMove}
          onBasicAttack={() => engineRef.current?.triggerBasicAttack()}
          onPower={() => engineRef.current?.triggerPowerAbility()}
          onHeal={() => engineRef.current?.triggerHeal()}
          onDash={() => engineRef.current?.triggerDash()}
          onDomain={() => engineRef.current?.triggerDomain()}
          onNuke={() => engineRef.current?.triggerNuke()}
        />
      )}

      {hud && menuOpen && phase === 'playing' && (
        <GameMenuModal
          hud={hud}
          onClose={() => setMenuOpen(false)}
          onBuyShopItem={(id) =>
            engineRef.current?.buyShopItem(id) ?? { ok: false, message: 'Engine unavailable' }
          }
          onEquipNft={(id) => engineRef.current?.equipNft(id)}
          onSellNft={(id) => engineRef.current?.sellNft(id)}
          onSummonBoss={() => engineRef.current?.summonBossNow()}
          onTriggerDomain={() => engineRef.current?.triggerDomain()}
          onTriggerNuke={() => engineRef.current?.triggerNuke()}
        />
      )}

      {hud && (phase === 'paused' || phase === 'gameover') && (
        <StatusModal
          phase={phase}
          hud={hud}
          onResume={() => engineRef.current?.setPhase('playing')}
          onRestart={handleStart}
          onReturnTitle={() => {
            setMenuOpen(false);
            engineRef.current?.setPhase('title');
          }}
        />
      )}
    </div>
  );
}

export default App;
