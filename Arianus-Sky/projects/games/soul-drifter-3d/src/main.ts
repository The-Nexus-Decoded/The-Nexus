import './style.css';
import { Game3D } from './realm3d/game';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
new Game3D(canvas);
