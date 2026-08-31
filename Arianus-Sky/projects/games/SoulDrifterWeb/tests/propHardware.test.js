import { describe,expect,it } from 'vitest';
import { Vector3 } from 'three';
import { propHardwareBox, propHardwareCylinder } from '../scripts/assets/prop-hardware.mjs';
const uv=[.666,.215,.688,.225];
function verify(polygons) {
  const edges=new Map();let volume=0;
  for(const face of polygons) {
    const p=face.map(v=>new Vector3(...v.attributes.position));
    const normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));expect(normal.length()).toBeGreaterThan(1e-12);
    expect(normal.dot(new Vector3(...face[0].attributes.normal))).toBeGreaterThan(0);
    volume+=p[0].dot(p[1].clone().cross(p[2]))/6;
    for(let i=0;i<3;i++) {
      const key=[p[i],p[(i+1)%3]].map(v=>v.toArray().map(n=>Math.round(n*1e9)).join(',')).sort().join('|');edges.set(key,(edges.get(key)??0)+1);
      expect(face[i].attributes.uv[0]).toBeGreaterThanOrEqual(uv[0]);expect(face[i].attributes.uv[0]).toBeLessThanOrEqual(uv[2]);
      expect(face[i].attributes.uv[1]).toBeGreaterThanOrEqual(uv[1]);expect(face[i].attributes.uv[1]).toBeLessThanOrEqual(uv[3]);
    }
  }
  expect([...edges.values()].every(count=>count===2)).toBe(true);return volume;
}
describe('source-atlas hinge hardware',()=>{
  it('builds a closed outward box with actual thickness',()=>{
    const faces=propHardwareBox([0,0,0],[1,2,3],uv);expect(faces).toHaveLength(12);expect(verify(faces)).toBeCloseTo(6);
  });
  it.each([0,1,2])('builds a closed smooth barrel along axis %s',axis=>{
    const faces=propHardwareCylinder([1,2,3],axis,.1,.5,uv);expect(faces).toHaveLength(60);
    expect(verify(faces)).toBeCloseTo(.5*.1*.1*8*Math.sin(Math.PI/8),10);
  });
  it('refuses flat or invalid geometry',()=>{
    expect(()=>propHardwareBox([0,0,0],[0,1,1],uv)).toThrow('Invalid');
    expect(()=>propHardwareCylinder([0,0,0],2,0,1,uv)).toThrow('Invalid');
    expect(()=>propHardwareCylinder([0,0,0],2,1,1,uv,3)).toThrow('Invalid');
  });
});
