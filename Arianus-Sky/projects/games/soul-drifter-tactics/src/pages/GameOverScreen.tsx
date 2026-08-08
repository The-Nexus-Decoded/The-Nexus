import { useGame } from '../hooks/GameContext';
import { Skull, RotateCcw, Sparkles } from 'lucide-react';

export default function GameOverScreen() {
  const { setScreen, meta } = useGame();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <Skull className="w-20 h-20 mx-auto text-red-500 mb-4" />
        <h1 className="text-5xl font-bold text-red-400 mb-2">DEFEATED</h1>
        <p className="text-xl text-slate-400 mb-6">
          The Death Gate claims another soul...
        </p>
        <p className="text-slate-300 mb-8">
          Your journey has ended, but the cycle continues. The Death Gate awaits your return.
        </p>

        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-6">
          <h3 className="font-bold text-yellow-400 mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Meta Progress
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Total Runs</div>
              <div className="text-xl font-bold">{meta.totalRuns}</div>
            </div>
            <div>
              <div className="text-slate-400">Wins</div>
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
          className="px-8 py-4 bg-purple-700 hover:bg-purple-600 rounded-lg text-xl font-bold transition-all flex items-center justify-center gap-3 mx-auto"
        >
          <RotateCcw className="w-5 h-5" />
          Return to Nexus
        </button>
      </div>
    </div>
  );
}
