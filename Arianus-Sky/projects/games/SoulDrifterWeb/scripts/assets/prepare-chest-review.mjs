import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readStaticProp, encodeStaticPropParts } from './static-prop-mesh.mjs';
import { sectionProp, propCutFace, splitClosedProp } from './prop-cut-surfaces.mjs';
import { propHardwareBox, propHardwareCylinder } from './prop-hardware.mjs';
import { encodeGlb } from '../replace-glb-animation.mjs';

// Usage: node scripts/assets/prepare-chest-review.mjs --out <external-review-folder>
// Output is an inspection candidate, not a provider, art or interaction approval.
const root = fileURLToPath(new URL('../../', import.meta.url));
const outIndex = process.argv.indexOf('--out');
if (outIndex < 0 || !process.argv[outIndex + 1]) throw new Error('An explicit --out review artifact folder is required');
const out = path.resolve(process.argv[outIndex + 1]); fs.mkdirSync(out, { recursive: true });
const source = readStaticProp(path.join(root,'docs/3d-ai-studio/source-models/environment/dungeon-kit/storage-chest.glb'), '8cc7d2c791614661e6997e9ea0632dbdbf8cd706b81dea5a45031921ffe4dc56');
// UV regions inspected on the original 2K Color/ORM/Normal atlas, not replacement textures.
const wood = [.235,.137,.326,.199], iron = [.666,.215,.688,.225];
let hasp = source.polygons; const shell = [];
for (const plane of [
  {axis:0,boundary:.249,keepGreater:true},
  {axis:1,boundary:.019,keepGreater:true},
  {axis:1,boundary:.184,keepGreater:false},
  {axis:2,boundary:-.028,keepGreater:true},
  {axis:2,boundary:.028,keepGreater:false},
]) { const cut=splitClosedProp(hasp,plane,iron); shell.push(...cut.outside); hasp=cut.inside; }
const split=sectionProp(shell,{axis:1,boundary:.122,keepGreater:false});
if(split.loops.length!==1) throw new Error('Hasp must be independent before opening the body aperture');
const body=split.inside, lid=split.outside, loop=split.loops[0];
const aperture=[[-.203,.122,-.446],[.203,.122,-.446],[.203,.122,.446],[-.203,.122,.446]];
body.push(...propCutFace(loop,[aperture],1,1,wood));
lid.push(...propCutFace(loop,[],1,-1,wood));
const face=(axis,constant,a0,a1,b0,b1,sign,uv=wood)=> {
  const axes=[(axis+1)%3,(axis+2)%3];
  return propCutFace([[a0,b0],[a1,b0],[a1,b1],[a0,b1]].map(([a,b])=> {
    const p=[0,0,0];p[axis]=constant;p[axes[0]]=a;p[axes[1]]=b;return p;
  }),[],axis,sign,uv);
};
// Hollow interior: inward walls plus a real floor, never a flat cap over the aperture.
// Wall boards reuse clean wood-grain atlas regions; shallow floor joints have backing.
body.push(...face(1,-.216,-.446,.446,-.203,.203,1));
for(const x of [-.203,.203]) for(let row=0;row<3;row++) {
  const low=-.216+row*(.338/3), high=-.216+(row+1)*(.338/3);
  body.push(...face(0,x,low,high,-.446,.446,x<0?1:-1));
}
for(const z of [-.446,.446]) for(let row=0;row<3;row++) {
  const low=-.216+row*(.338/3), high=-.216+(row+1)*(.338/3);
  body.push(...face(2,z,-.203,.203,low,high,z<0?1:-1));
}
// Two real rear hinges: fixed outer knuckles and a moving central knuckle.
// Plates overlap the source's rear iron bands, so the lid is mechanically
// attached throughout opening rather than floating around an invisible pivot.
const hardware=[];
for(const z of [-.24,.24]) {
  const fixed=[...propHardwareBox([-.268,.068,z-.024],[-.232,.122,z+.024],iron)];
  const moving=[...propHardwareBox([-.268,.122,z-.024],[-.231,.186,z+.024],iron)];
  for(const offset of [-.034,.034]) fixed.push(...propHardwareCylinder([-.260,.122,z+offset],2,.011,.032,iron));
  moving.push(...propHardwareCylinder([-.260,.122,z],2,.011,.034,iron));
  fixed.push(...propHardwareCylinder([-.270,.09,z],0,.005,.006,iron));
  moving.push(...propHardwareCylinder([-.270,.165,z],0,.005,.006,iron));
  body.push(...fixed);lid.push(...moving);
  hardware.push({center:[-.260,.122,z],axis:2,radius:.011,fixedTriangles:fixed.length,movingTriangles:moving.length});
}
for(let i=0;i<5;i++) {
  const low=-.446+i*.892/5+.0007, high=-.446+(i+1)*.892/5-.0007;
  body.push(...face(1,-.214,low,high,-.203,.203,1),
    ...face(2,low,-.203,.203,-.216,-.214,-1),...face(2,high,-.203,.203,-.216,-.214,1));
  // Backed shallow lid lining divides the grain into board-sized regions; the
  // true underside cap remains behind every small seam and around the rim.
  lid.push(...propHardwareBox([-.203,.120,low],[.203,.122,high],wood));
}
const encoded=encodeStaticPropParts(source,[{name:'chest-body',polygons:body},{name:'chest-lid',polygons:lid},{name:'chest-hasp',polygons:hasp}]);
const j=encoded.json, lidPivot=[-.260,.122,0], haspPivot=[.249,.179,0];
// Mesh buffers stay in the original coordinate system. Separate parent pivots
// articulate genuine source subsets with cancelling rest translations.
const lidHinge=j.nodes.push({name:'chest-lid-hinge',translation:lidPivot,children:[2]})-1;
j.nodes[2].translation=lidPivot.map(v=>-v);
const haspHinge=j.nodes.push({name:'chest-hasp-hinge',translation:haspPivot.map((v,i)=>v-lidPivot[i]),children:[3]})-1;
j.nodes[3].translation=haspPivot.map(v=>-v);
j.nodes[lidHinge].children.push(haspHinge);j.nodes[0].children=[1,lidHinge];
const poses=[['Closed',0,0],['Unlatched',0,60],['Partial',38,60],['Open',105,30]];
const receipt={...encoded.receipt,sourceTextures:'original embedded 2K; bytes unchanged',sourceLicense:'existing project source; original account receipt not independently recovered',
  seam:.122,lidPivot,haspPivot,interiorAperture:aperture,woodUv:wood,ironUv:iron,hardware,poses:[]};
for(const [name,lidDegrees,haspDegrees] of poses) {
  const json=structuredClone(j), q=degrees=>[0,0,Math.sin(degrees*Math.PI/360),Math.cos(degrees*Math.PI/360)];
  json.nodes[lidHinge].rotation=q(lidDegrees);json.nodes[haspHinge].rotation=q(haspDegrees);
  const bytes=encodeGlb(json,encoded.bin), file=path.join(out,`chest-${name.toLowerCase()}.glb`), sha=createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(file,bytes);
  const config={static:true,candidatePath:file,candidateSha256:sha,runtimeScale:1,fixedFloorMeters:-.29840388894081116,clips:[
    {name:'Front',duration:0,keyTimes:[0],closeFocus:[0,.20,0],closeScale:2.2,closeOffset:[2.5,0,.25]},
    {name:'Interior',duration:0,keyTimes:[0],closeFocus:[0,.20,0],closeScale:2.2,closeOffset:[2.5,-2.5,2.5]},
    {name:'Back',duration:0,keyTimes:[0],closeFocus:[0,.20,0],closeScale:2.2,closeOffset:[-2.5,0,1.5]},
    {name:'Side',duration:0,keyTimes:[0],closeFocus:[0,.20,0],closeScale:2.2,closeOffset:[0,-2.5,.5]},
  ]};
  fs.writeFileSync(path.join(out,`render-${name.toLowerCase()}.json`),JSON.stringify(config,null,2));
  receipt.poses.push({name,file,sha256:sha,bytes:bytes.length,lidDegrees,haspDegrees});
}
fs.writeFileSync(path.join(out,'candidate-receipt.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({parts:receipt.parts,poses:receipt.poses,originalBinaryPrefixUnchanged:receipt.originalBinaryPrefixUnchanged}));
