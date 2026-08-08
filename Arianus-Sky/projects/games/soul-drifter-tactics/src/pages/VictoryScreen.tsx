import { useGame } from '../hooks/GameContext';
import { Crown, RotateCcw, Sparkles, Wind, Flame, Mountain, Waves, Skull } from 'lucide-react';

export default function VictoryScreen() {
  const { setScreen, meta } = useGame();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        <Crown className="w-20 h-20 mx-auto text-yellow-400 mb-4" />
        <h1 className="text-5xl font-bold text-yellow-400 mb-2">CONQUEROR</h1>
        <p className="text-xl text-slate-300 mb-2">
          You have mastered the Death Gate!
        </p>
        <p className="text-slate-400 mb-6">
          Lord Xar has fallen. The Five Worlds are yours to traverse.
        </p>

        <div className="bg-slate-900 rounded-lg p-4 border border-yellow-700 mb-6">
          <h3 className="font-bold text-yellow-400 mb-3">Worlds Conquered</h3>
          <div className="flex justify-center gap-4">
            <WorldIcon icon={<Wind className="w-6 h-6" />} name="Arianus" color="text-sky-400" />
            <WorldIcon icon={<Flame className="w-6 h-6" />} name="Pryan" color="text-orange-400" />
            <WorldIcon icon={<Mountain className="w-6 h-6" />} name="Abarrach" color="text-amber-400" />
            <WorldIcon icon={<Waves className="w-6 h-6" />} name="Chelestra" color="text-blue-400" />
            <WorldIcon icon={<Skull className="w-6 h-6" />} name="Labyrinth" color="text-purple-400" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-6">
          <h3 className="font-bold text-yellow-400 mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Final Stats
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Total Runs</div>
              <div className="text-xl font-bold">{meta.totalRuns}</div>
            </div>
            <div>
              <div className="text-slate-400">Victories</div>
              <div className="text-xl font-bold text-green-400">{meta.totalWins}</div>
            </div>
            <div>
              <div className="text-slate-400">Sigils</div>
              <div className="text-xl font-bold text-yellow-400">{meta.sigils}</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setScreen('title')}
          className="px-8 py-4 bg-gradient-to-r from-yellow-700 to-purple-700 hover:from-yellow-600 hover:to-purple-600 rounded-lg text-xl font-bold transition-all flex items-center justify-center gap-3 mx-auto"
        >
          <RotateCcw className="w-5 h-5" />
          Begin Anew
        </button>
      </div>
    </div>
  );
}

function WorldIcon({ icon, name, color }: { icon: React.ReactNode; name: string; color: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${color}`}>
      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs">{name}</span>
    </div>
  );
}
