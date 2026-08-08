export interface Point { x: number; y: number }

export function findPath(
  start: Point,
  end: Point,
  walkable: (x: number, y: number) => boolean,
  maxSteps: number = 30
): Point[] {
  if (start.x === end.x && start.y === end.y) return [];
  
  const queue: { pos: Point; path: Point[] }[] = [{ pos: start, path: [] }];
  const visited = new Set<string>([`${start.x},${start.y}`]);
  
  const dirs = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
    { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
  ];
  
  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    
    if (path.length > maxSteps) continue;
    
    for (const dir of dirs) {
      const next: Point = { x: pos.x + dir.x, y: pos.y + dir.y };
      const key = `${next.x},${next.y}`;
      
      if (visited.has(key)) continue;
      if (!walkable(next.x, next.y)) continue;
      
      const newPath = [...path, next];
      
      if (next.x === end.x && next.y === end.y) {
        return newPath;
      }
      
      visited.add(key);
      queue.push({ pos: next, path: newPath });
    }
  }
  
  return [];
}
