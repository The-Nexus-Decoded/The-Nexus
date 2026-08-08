import { useGame } from '../hooks/GameContext';
import { ArrowLeft, Heart, Zap, Swords, Shield, Wind } from 'lucide-react';

export default function InventoryScreen() {
  const { gameState, setScreen, useItem } = useGame();
  const char = gameState.character;

  if (!char) return null;

  const elementColors: Record<string, string> = {
    air: 'text-sky-400 border-sky-700 bg-sky-900/20',
    fire: 'text-orange-400 border-orange-700 bg-orange-900/20',
    stone: 'text-amber-400 border-amber-700 bg-amber-900/20',
    water: 'text-blue-400 border-blue-700 bg-blue-900/20',
    labyrinth: 'text-purple-400 border-purple-700 bg-purple-900/20',
    void: 'text-slate-400 border-slate-700 bg-slate-900/20',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setScreen('worldmap')}
          className="mb-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h2 className="text-2xl font-bold mb-4">Inventory</h2>

        {/* Stats */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-4">
          <h3 className="font-bold mb-3 text-purple-400">Character Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox icon={<Heart className="w-4 h-4 text-red-400" />} label="HP" value={`${char.hp}/${char.maxHp}`} />
            <StatBox icon={<Zap className="w-4 h-4 text-blue-400" />} label="Mana" value={`${char.mana}/${char.maxMana}`} />
            <StatBox icon={<Swords className="w-4 h-4 text-orange-400" />} label="Attack" value={char.attack} />
            <StatBox icon={<Shield className="w-4 h-4 text-green-400" />} label="Defense" value={char.defense} />
            <StatBox icon={<Wind className="w-4 h-4 text-cyan-400" />} label="Speed" value={char.speed} />
            <StatBox icon={<Zap className="w-4 h-4 text-yellow-400" />} label="Level" value={char.level} />
            <StatBox icon={<Zap className="w-4 h-4 text-purple-400" />} label="XP" value={`${char.xp}/${char.xpToNext}`} />
            <StatBox icon={<Zap className="w-4 h-4 text-yellow-400" />} label="Gold" value={char.gold} />
          </div>
        </div>

        {/* Runes */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-4">
          <h3 className="font-bold mb-3 text-cyan-400">Runes ({char.runes.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {char.runes.map((rune, idx) => (
              <div key={`${rune.id}-${idx}`} className={`p-3 rounded-lg border ${elementColors[rune.element] || 'border-slate-700 bg-slate-800'}`}>
                <div className="text-2xl mb-1">{rune.symbol}</div>
                <div className="text-sm font-bold">{rune.name}</div>
                <div className="text-xs text-slate-400">{rune.description}</div>
                <div className="text-xs mt-1">
                  <span className="text-orange-400">{rune.effect}</span> <span className="text-slate-300">{rune.power}</span>
                </div>
                <div className="text-xs text-blue-400">Mana: {rune.manaCost}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <h3 className="font-bold mb-3 text-yellow-400">Items ({char.items.length})</h3>
          {char.items.length === 0 ? (
            <p className="text-slate-500">No items.</p>
          ) : (
            <div className="space-y-2">
              {char.items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                  <div>
                    <span className="font-bold">{item.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{item.description}</span>
                  </div>
                  {item.consumableEffect && (
                    <button
                      onClick={() => useItem(idx)}
                      className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm font-bold transition-colors"
                    >
                      Use
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-slate-800 rounded p-2 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">{icon} <span className="text-xs text-slate-400">{label}</span></div>
      <span className="font-bold">{value}</span>
    </div>
  );
}
