import { useGame } from '../hooks/GameContext';
import { HaploPortrait, WorldBackground } from '../components/GameArt';
import { Swords, BookOpen, Sparkles, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export default function TitleScreen() {
  const { startGame, meta, resetMeta, upgradeMeta } = useGame();
  const [showMeta, setShowMeta] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
      <WorldBackground element="title" />
      
      {/* Floating rune particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-purple-400/20 text-4xl font-bold"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${5 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            {'◈◉◆▲■●◐◑'[i]}
          </div>
        ))}
      </div>

      <div className="relative z-10 text-center px-4 max-w-2xl animate-fade-in">
        {/* Character portrait */}
        <div className="mb-6 flex justify-center">
          <div className="w-40 h-40 rounded-full bg-gradient-to-b from-purple-900/50 to-slate-900/50 p-2 border-2 border-purple-500/30 animate-pulse-glow">
            <HaploPortrait className="w-full h-full" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
          DEATH GATE
        </h1>
        <h2 className="text-xl md:text-2xl text-slate-400 mb-8 tracking-widest uppercase">
          Cycle Roguelite RPG
        </h2>

        <div className="space-y-4 mb-8">
          <button
            onClick={startGame}
            className="w-full py-4 px-8 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-lg text-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg shadow-purple-900/50 border border-purple-500/30"
          >
            <Swords className="w-6 h-6" />
            Enter the Gate
          </button>

          <button
            onClick={() => setShowMeta(!showMeta)}
            className="w-full py-3 px-8 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-lg font-medium transition-all flex items-center justify-center gap-3 border border-slate-600/30"
          >
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Meta Upgrades
          </button>
        </div>

        {showMeta && (
          <div className="bg-slate-900/90 rounded-lg p-6 border border-slate-700 mb-4 text-left animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Meta Progression
              </h3>
              <button onClick={resetMeta} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
            <p className="text-slate-400 mb-4 text-sm">Total Runs: {meta.totalRuns} | Wins: {meta.totalWins} | Sigils: {meta.sigils}</p>
            <div className="space-y-3">
              <UpgradeRow name="Starting HP" value={meta.upgrades.startingHp} cost={(meta.upgrades.startingHp + 1) * 5} sigils={meta.sigils} onUpgrade={() => upgradeMeta('startingHp')} />
              <UpgradeRow name="Starting Mana" value={meta.upgrades.startingMana} cost={(meta.upgrades.startingMana + 1) * 5} sigils={meta.sigils} onUpgrade={() => upgradeMeta('startingMana')} />
              <UpgradeRow name="Starting Gold" value={meta.upgrades.startingGold} cost={(meta.upgrades.startingGold + 1) * 5} sigils={meta.sigils} onUpgrade={() => upgradeMeta('startingGold')} />
              <UpgradeRow name="Rune Slots" value={meta.upgrades.runeSlots} cost={(meta.upgrades.runeSlots + 1) * 5} sigils={meta.sigils} onUpgrade={() => upgradeMeta('runeSlots')} />
            </div>
          </div>
        )}

        <div className="mt-8 text-slate-500 text-sm flex items-center justify-center gap-2">
          <BookOpen className="w-4 h-4" />
          Based on The Death Gate Cycle by Margaret Weis & Tracy Hickman
        </div>
      </div>
    </div>
  );
}

function UpgradeRow({ name, value, cost, sigils, onUpgrade }: { name: string; value: number; cost: number; sigils: number; onUpgrade: () => void }) {
  const canAfford = sigils >= cost;
  return (
    <div className="flex items-center justify-between bg-slate-800 rounded p-3">
      <div>
        <span className="font-medium">{name}</span>
        <span className="text-slate-400 ml-2">Lv.{value}</span>
      </div>
      <button
        onClick={onUpgrade}
        disabled={!canAfford}
        className={`px-3 py-1 rounded text-sm font-bold ${canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
      >
        {cost} Sigils
      </button>
    </div>
  );
}
