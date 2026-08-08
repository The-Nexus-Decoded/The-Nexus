import { SoulDriftProvider } from './soul-drifter/game/state';
import Game from './soul-drifter/components/Game';

export default function App() {
  return (
    <SoulDriftProvider>
      <Game />
    </SoulDriftProvider>
  );
}
