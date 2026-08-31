import { propCutFace } from './prop-cut-surfaces.mjs';

/** Small explicitly authored hardware, textured from the source atlas. These
 * helpers do not replace the original prop shell or invent provider provenance.
 */
export function propHardwareBox(min, max, uv) {
  if (min.length !== 3 || max.length !== 3 || ![...min,...max].every(Number.isFinite) || min.some((n,i)=>n>=max[i])) throw new Error('Invalid hardware box');
  const polygons=[];
  for(let axis=0;axis<3;axis++) for(const sign of [-1,1]) {
    const u=(axis+1)%3,v=(axis+2)%3, constant=sign<0?min[axis]:max[axis];
    const contour=[[min[u],min[v]],[max[u],min[v]],[max[u],max[v]],[min[u],max[v]]].map(([a,b])=>{
      const p=[0,0,0];p[axis]=constant;p[u]=a;p[v]=b;return p;
    });
    polygons.push(...propCutFace(contour,[],axis,sign,uv));
  }
  return polygons;
}

export function propHardwareCylinder(center,axis,radius,length,uv,segments=16) {
  if(center.length!==3 || !center.every(Number.isFinite) || ![0,1,2].includes(axis)
    || ![radius,length].every(n=>Number.isFinite(n)&&n>0) || !Number.isInteger(segments) || segments<8 || segments>64) throw new Error('Invalid hardware cylinder');
  const u=(axis+1)%3,v=(axis+2)%3, rings=[[],[]],polygons=[];
  for(let end=0;end<2;end++) for(let i=0;i<segments;i++) {
    const angle=i/segments*Math.PI*2,p=[...center];p[u]+=radius*Math.cos(angle);p[v]+=radius*Math.sin(angle);p[axis]+=(end-.5)*length;rings[end].push(p);
  }
  for(let i=0;i<segments;i++) {
    const j=(i+1)%segments;
    const vertex=(end,index,fraction)=>{
      const normal=[0,0,0];normal[u]=Math.cos(index/segments*Math.PI*2);normal[v]=Math.sin(index/segments*Math.PI*2);
      return {attributes:{position:rings[end][index],normal,uv:[uv[0]+fraction*(uv[2]-uv[0]),uv[1]+end*(uv[3]-uv[1])]}};
    };
    const a=vertex(0,i,i/segments),b=vertex(0,j,(i+1)/segments),c=vertex(1,j,(i+1)/segments),d=vertex(1,i,i/segments);
    polygons.push([a,b,c],[a,c,d]);
  }
  polygons.push(...propCutFace(rings[0],[],axis,-1,uv),...propCutFace(rings[1],[],axis,1,uv));
  return polygons;
}
