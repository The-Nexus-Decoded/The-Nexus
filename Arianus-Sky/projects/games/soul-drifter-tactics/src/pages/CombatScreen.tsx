import { useEffect, useRef, useState } from 'react';
import { useGame } from '../hooks/GameContext';
import { HaploPortrait, EnemySprite, RuneSymbol, WorldBackground } from '../components/GameArt';
import { Heart, Zap, Shield, ArrowLeft, Sparkles } from 'lucide-react';

const elementBg: Record<string, string> = {
  air: 'bg-sky-900/30 border-sky-700',
  fire: 'bg-orange-900/30 border-orange-700',
  stone: 'bg-amber-900/30 border-amber-700',
  water: 'bg-blue-900/30 border-blue-700',
  labyrinth: 'bg-purple-900/30 border-purple-700',
  void: 'bg-slate-900/30 border-slate-700',
};

export default function CombatScreen() {
  const { gameState, useRune, enemyTurn, flee, returnToWorld, completeWorld, setScreen } = useGame();
  const { character, combat } = gameState;
  const logRef = useRef<HTMLDivElement>(null);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [combat.combatLog]);

  useEffect(() => {
    if (combat.turn === 'enemy' && combat.inCombat && !combat.combatEnded) {
      const timer = setTimeout(() => { enemyTurn(); }, 1200);
      return () => clearTimeout(timer);
    }
  }, [combat.turn, combat.inCombat, combat.combatEnded, enemyTurn]);

  useEffect(() => {
    if (combat.combatLog.length > 0) {
      const lastLog = combat.combatLog[combat.combatLog.length - 1];
      if (lastLog.includes('damage') && lastLog.includes('uses')) {
        setShakePlayer(true);
        setTimeout(() => setShakePlayer(false), 500);
      }
      if (lastLog.includes('cast') && lastLog.includes('damage')) {
        setShakeEnemy(true);
        setTimeout(() => setShakeEnemy(false), 500);
      }
    }
  }, [combat.combatLog]);

  if (!character || !combat.enemy) return null;

  const enemy = combat.enemy;
  const playerHpPercent = Math.max(0, (character.hp / character.maxHp) * 100);
  const enemyHpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  const playerManaPercent = Math.max(0, (character.mana / character.maxMana) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 relative overflow-hidden">
      <WorldBackground element={enemy.element} />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={flee} disabled={combat.combatEnded}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 border border-slate-600/30">
            <ArrowLeft className="w-4 h-4" /> Flee
          </button>
          <div className="text-sm text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full">
            Turn {combat.turnCount + 1} | {combat.turn === 'player' ? 'Your Turn' : 'Enemy Turn'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className={`bg-slate-900/80 rounded-lg p-5 border border-slate-700 ${shakePlayer ? 'animate-shake' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-purple-900/50 to-slate-900/50 p-1 border-2 border-purple-500/30">
                <HaploPortrait className="w-full h-full" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{character.name}</h3>
                <p className="text-xs text-slate-400">Lv.{character.level} Patryn</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-purple-900/50 px-2 py-0.5 rounded">ATK {character.attack}</span>
                  <span className="text-xs bg-purple-900/50 px-2 py-0.5 rounded">DEF {character.defense}</span>
                  <span className="text-xs bg-purple-900/50 px-2 py-0.5 rounded">SPD {character.speed}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500 relative"
                    style={{ width: `${playerHpPercent}%` }}>
                    {playerHpPercent < 30 && <div className="absolute inset-0 bg-red-400 animate-pulse opacity-30" />}
                  </div>
                </div>
                <span className="text-sm font-bold w-16 text-right">{character.hp}/{character.maxHp}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-300" style={{ width: `${playerManaPercent}%` }} />
                </div>
                <span className="text-sm font-bold w-16 text-right">{character.mana}/{character.maxMana}</span>
              </div>
              {combat.playerShield > 0 && (
                <div className="flex items-center gap-2 text-cyan-400 text-sm">
                  <Shield className="w-4 h-4" />
                  <span className="font-bold">Shield: {combat.playerShield}</span>
                </div>
              )}
            </div>
          </div>

          <div className={`bg-slate-900/80 rounded-lg p-5 border ${elementBg[enemy.element] || 'border-slate-700'} ${shakeEnemy ? 'animate-shake' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-20 h-20 rounded-full p-1 border-2 ${enemy.isBoss ? 'border-red-500/50 animate-pulse' : 'border-slate-600/30'}`}>
                <EnemySprite element={enemy.element} isBoss={enemy.isBoss} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{enemy.name}</h3>
                <p className="text-xs text-slate-400">{enemy.title}</p>
                {enemy.isBoss && (
                  <span className="text-xs text-red-400 font-bold bg-red-900/30 px-2 py-0.5 rounded animate-pulse">☠ BOSS</span>
                )}
              </div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500" style={{ width: `${enemyHpPercent}%` }} />
                </div>
                <span className="text-sm font-bold w-16 text-right">{enemy.hp}/{enemy.maxHp}</span>
              </div>
              {combat.enemyShield > 0 && (
                <div className="flex items-center gap-2 text-cyan-400 text-sm">
                  <Shield className="w-4 h-4" />
                  <span className="font-bold">Shield: {combat.enemyShield}</span>
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">ATK {enemy.attack}</span>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">DEF {enemy.defense}</span>
              </div>
            </div>
          </div>
        </div>

        <div ref={logRef} className="bg-slate-900/80 rounded-lg p-4 border border-slate-700 h-40 overflow-y-auto mb-4 text-sm space-y-1 combat-log backdrop-blur-sm">
          {combat.combatLog.map((log, i) => (
            <p key={i} className={`animate-slide-in ${
              log.includes('Victory') ? 'text-green-400 font-bold text-base' : 
              log.includes('fell') ? 'text-red-400 font-bold' : 
              log.includes('BOSS') ? 'text-yellow-400 font-bold' :
              log.includes('cast') ? 'text-cyan-300' :
              log.includes('uses') ? 'text-orange-300' : 'text-slate-300'
            }`}>
              {log.includes('Victory') && '★ '}{log}
            </p>
          ))}
        </div>

        {!combat.combatEnded ? (
          <div className="animate-fade-in">
            <h4 className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> RUNES
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {character.runes.map((rune, idx) => {
                const canUse = combat.turn === 'player' && character.mana >= rune.manaCost;
                return (
                  <button key={`${rune.id}-${idx}`} onClick={() => canUse && useRune(rune.id)} disabled={!canUse}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      canUse ? `${elementBg[rune.element]} hover:scale-105 hover:brightness-110 cursor-pointer border-opacity-50` : 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <RuneSymbol element={rune.element} size={24} />
                      <span className="text-xs font-bold">{rune.name}</span>
                    </div>
                    <div className="text-xs text-slate-400 capitalize">{rune.effect} {rune.power}</div>
                    <div className="flex items-center gap-1 text-xs text-blue-400 mt-1">
                      <Zap className="w-3 h-3" />{rune.manaCost}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 animate-fade-in">
            {combat.result === 'win' ? (
              <div>
                <h2 className="text-4xl font-bold text-green-400 mb-2 drop-shadow-lg">VICTORY!</h2>
                <p className="text-slate-400 mb-4">{enemy.isBoss ? 'The boss has fallen!' : 'Enemy defeated!'}</p>
                <div className="space-y-2">
                  <button onClick={() => enemy.isBoss ? completeWorld(character.world) : returnToWorld()}
                    className="px-8 py-3 bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-green-900/50">
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-4xl font-bold text-red-400 mb-2">DEFEATED</h2>
                <p className="text-slate-400 mb-4">The Death Gate claims another soul...</p>
                <button onClick={() => setScreen('gameover')}
                  className="px-8 py-3 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-900/50">
                  Continue
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
