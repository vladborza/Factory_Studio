/* Factory Studio concept animation. Three.js r160.1, MIT licence.
   This scene illustrates phase semantics. It is not an event-log replay. */
(()=>{
const host=document.getElementById('scene');
if(!window.THREE){host.innerHTML='<p style="position:absolute;right:5%;top:45%;max-width:35%">The local 3D library is missing. Keep the assets folder beside index.html.</p>';window.FactoryScene={update(){},resize(){}};return;}
const T=THREE,scene=new T.Scene();scene.background=new T.Color('#08121f');scene.fog=new T.FogExp2('#08121f',.028);
let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch(e){host.innerHTML='<p style="position:absolute;right:5%;top:45%;max-width:35%">This browser cannot initialise WebGL. Enable hardware acceleration for the 3D sequence.</p>';window.FactoryScene={update(){},resize(){}};return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
const camera=new T.PerspectiveCamera(40,1,.05,150);scene.add(new T.HemisphereLight('#b7e4ff','#162336',2.2));
function light(color,power,x,y,z){let l=new T.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l);return l;}
let key=light('#dcf1ff',3.8,-5,12,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-14,right:14,top:12,bottom:-12});key.shadow.bias=-.0003;light('#50ddc9',1.8,6,7,-8);light('#6984ed',1.5,-9,5,-4);
const mats={steel:new T.MeshStandardMaterial({color:'#b0c1cc',metalness:.65,roughness:.35}),body:new T.MeshStandardMaterial({color:'#d6dfe3',metalness:.32,roughness:.4}),dark:new T.MeshStandardMaterial({color:'#182a3c',metalness:.55,roughness:.32}),black:new T.MeshStandardMaterial({color:'#101b29',roughness:.55}),blue:new T.MeshStandardMaterial({color:'#337dbe',roughness:.75}),skin:new T.MeshStandardMaterial({color:'#d0a180',roughness:.82}),vest:new T.MeshStandardMaterial({color:'#e5b047',roughness:.65}),mint:new T.MeshStandardMaterial({color:'#48dbc6',emissive:'#1a806d',emissiveIntensity:.5,roughness:.25}),amber:new T.MeshStandardMaterial({color:'#e8ac4c',emissive:'#a05212',emissiveIntensity:.25}),glass:new T.MeshStandardMaterial({color:'#163345',metalness:.65,roughness:.16,transparent:true,opacity:.62}),floor:new T.MeshStandardMaterial({color:'#122334',metalness:.35,roughness:.55}),belt:new T.MeshStandardMaterial({color:'#27384a',roughness:.85})};
function box(parent,x,y,z,w,h,d,mat){let mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sphere(parent,x,y,z,r,mat,sx=1,sy=1,sz=1){let m=new T.Mesh(new T.SphereGeometry(r,20,14),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
function cyl(parent,x,y,z,r1,r2,h,mat){let m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,18),mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function label(text,w=2,h=.4){let c=document.createElement('canvas');c.width=512;c.height=128;let ctx=c.getContext('2d');ctx.fillStyle='#112637';ctx.fillRect(0,0,512,128);ctx.fillStyle='#daf6f1';ctx.font='500 54px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);let texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;let m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}));return m;}
box(scene,0,-.16,0,38,.25,28,mats.floor);
let grid=new T.GridHelper(36,36,'#29475c','#1c3448');grid.position.y=-.025;scene.add(grid);
// Marked workcell lanes and floor perimeter.
for(let x of [-7.2,7.2])box(scene,x,.002,0,.035,.006,10,mats.mint);
for(let z of [-4.8,5])box(scene,0,.002,z,14.4,.006,.035,mats.mint);
for(let x=-6.8;x<7;x+=.6)box(scene,x,.004,2.2,.28,.008,.04,mats.amber);
function machine(x,name){let g=new T.Group();g.position.x=x;scene.add(g);
 box(g,0,.2,0,2.8,.4,2.5,mats.dark);box(g,-1.2,1.65,0,.35,2.7,2.5,mats.body);box(g,1.2,1.65,0,.35,2.7,2.5,mats.body);box(g,0,3.05,0,2.8,.32,2.5,mats.body);box(g,0,1.55,-1.1,2.4,2.4,.25,mats.steel);box(g,0,.72,.1,2.2,.35,1.85,mats.dark);
 // Protected work envelope, spindle and fixture.
 box(g,0,2.35,-.35,.45,.8,.5,mats.steel);cyl(g,0,1.88,-.35,.10,.06,.35,mats.steel);box(g,0,1.02,.1,1.1,.15,.8,mats.steel);let part=box(g,0,1.18,.35,.6,.2,.42,mats.mint);
 let door=new T.Group();g.add(door);box(door,0,1.85,1.23,1.95,2.05,.10,mats.glass);box(door,0,2.9,1.24,2.05,.08,.12,mats.steel);box(door,0,.8,1.24,2.05,.08,.12,mats.steel);box(door,.94,1.85,1.26,.08,2.1,.12,mats.steel);box(door,-.94,1.85,1.26,.08,2.1,.12,mats.steel);box(door,.67,1.7,1.4,.055,.6,.08,mats.dark);
 box(g,1.63,1.96,.83,.58,.83,.25,mats.dark);box(g,1.63,2.07,.97,.42,.36,.025,mats.mint);for(let j=0;j<3;j++)sphere(g,1.45+j*.15,1.75,.98,.04,j===2?mats.amber:mats.steel);
 cyl(g,1,3.45,-.4,.055,.055,.65,mats.dark);let lamp=cyl(g,1,3.7,-.4,.12,.12,.18,mats.mint);
 const plaque=label(name,1.75,.33);plaque.position.set(-.1,3.08,1.27);g.add(plaque);
 for(let a of [-.9,.9])for(let b of [-.8,.8])cyl(g,a,.09,b,.14,.17,.18,mats.black);
 return{g,door,part,lamp};}
const a=machine(-3.1,'ASSEMBLY'),b=machine(3.1,'TEST');
function conveyor(x,z,w){let g=new T.Group();g.position.set(x,0,z);scene.add(g);box(g,0,.8,0,w,.16,1,mats.steel);box(g,0,.91,0,w,.08,.8,mats.belt);for(let px of [-w/2+.15,w/2-.15])for(let pz of [-.35,.35])box(g,px,.4,pz,.07,.8,.07,mats.steel);for(let px=-w/2+.15;px<w/2;px+=.25){let roller=cyl(g,px,.96,0,.035,.035,.82,mats.steel);roller.rotation.x=Math.PI/2;}return g;}
let input=conveyor(-6,1.1,2.1),output=conveyor(6,1.1,2.1);for(let i=0;i<3;i++){box(input,-.65+i*.6,1.11,0,.37,.23,.4,mats.amber);}
const finished=[];for(let i=0;i<3;i++)finished.push(box(output,-.65+i*.6,1.11,0,.37,.23,.4,mats.mint));
let transfer=conveyor(0,-1.9,5.5),travellingPart=box(transfer,0,1.11,0,.5,.25,.45,mats.mint);
// Small fixtures, tool cart and rear services give the cell a recognisable industrial scale.
let cart=new T.Group();cart.position.set(0,0,-2.8);scene.add(cart);box(cart,0,.6,0,1.2,.85,.7,mats.blue);box(cart,0,1.08,0,1.3,.12,.8,mats.steel);for(let y of [.45,.7,.95])box(cart,0,y,.36,.85,.025,.03,mats.steel);for(let x of [-.45,.45])for(let z of [-.25,.25]){let wheel=cyl(cart,x,.15,z,.12,.12,.08,mats.black);wheel.rotation.z=Math.PI/2;}
function limb(parent,mat,r=.085){let m=new T.Mesh(new T.CylinderGeometry(r,r*.85,1,14),mat);parent.add(m);m.castShadow=true;return m;}
function connect(mesh,from,to){let start=new T.Vector3(...from),end=new T.Vector3(...to),delta=end.clone().sub(start);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.scale.y=delta.length();mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());}
const worker=new T.Group();scene.add(worker);sphere(worker,0,1.65,0,.16,mats.skin,.87,1.15,.9);sphere(worker,0,1.79,0,.18,mats.vest,1.05,.6,1.1);box(worker,0,1.75,-.045,.37,.025,.38,mats.vest);sphere(worker,0,1.26,0,.3,mats.blue,.8,1.2,.62);box(worker,0,1.34,-.16,.39,.39,.035,mats.vest);box(worker,0,1.34,-.183,.38,.035,.008,mats.steel);box(worker,0,.95,0,.37,.23,.27,mats.dark);
let arms=[limb(worker,mats.blue),limb(worker,mats.blue),limb(worker,mats.blue),limb(worker,mats.blue)],legs=[limb(worker,mats.dark,.105),limb(worker,mats.dark,.105),limb(worker,mats.dark,.105),limb(worker,mats.dark,.105)],hands=[sphere(worker,0,0,0,.07,mats.skin),sphere(worker,0,0,0,.07,mats.skin)],feet=[box(worker,-.14,.08,-.07,.18,.12,.32,mats.black),box(worker,.14,.08,-.07,.18,.12,.32,mats.black)];
function pose(work,walk,clock){let swing=Math.sin(clock*9)*.38*walk;for(let i=0;i<2;i++){let sign=i?1:-1,x=sign*.15,knee=[x,.5,sign*swing*.35],foot=[x,.1,sign*swing];connect(legs[i*2],[x,.95,0],knee);connect(legs[i*2+1],knee,foot);feet[i].position.set(x,.075,foot[2]-.07);let shoulder=[sign*.25,1.48,0],elbow=[sign*.3,1.18,-.16-work*.18],hand=[sign*.18,1.12+work*.08,-.17-work*.52];if(walk){elbow[2]=sign*swing*.6;hand[2]=sign*swing;}if(work){hand[1]+=.025*Math.sin(clock*4+i);hand[0]+=.035*Math.sin(clock*3+i);}connect(arms[i*2],shoulder,elbow);connect(arms[i*2+1],elbow,hand);hands[i].position.set(...hand);}}
pose(1,0,0);const preparer=worker.clone();preparer.position.set(-6,0,2.1);scene.add(preparer);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function update(t,cover=false){let x=-3.1,z=2.05,work=1,walk=0,rot=0,openA=1,openB=0;
 if(t>14&&t<20){let p=smooth((t-14)/6);x=-3.1+6.2*p;z=2.7;work=0;walk=1;rot=-Math.PI/2;openA=1-smooth((t-14)/1.5);openB=smooth((t-18)/2);}
 else if(t>=20&&t<27){x=3.1;openA=0;openB=1;}
 else if(t>=27&&t<33){let p=smooth((t-27)/6);x=3.1-6.2*p;z=2.7;walk=1;work=0;rot=Math.PI/2;openA=smooth((t-31)/2);openB=1-smooth((t-27)/1.5);}
 else if(t>=33){openA=1;openB=0;}
 worker.position.set(x,walk?Math.abs(Math.sin(t*9))*.025:0,z);worker.rotation.y=rot;pose(work,walk,t);a.door.position.x=-2*openA;b.door.position.x=-2*openB;
 preparer.rotation.x=.025*Math.sin(t*2);travellingPart.position.x=-2.3+4.6*smooth((t-16)/6);travellingPart.visible=t>=16&&t<22;finished.forEach((part,i)=>part.visible=t>30+i*1.4);
 a.lamp.material=openA>.1?mats.amber:mats.mint;b.lamp.material=openB>.1?mats.amber:mats.mint;a.part.rotation.y=openA<.1?t*3:0;b.part.rotation.y=openB<.1?t*3:0;
 if(cover){camera.position.set(12,9,16);camera.lookAt(-4,1,0);}
 else{let pull=smooth((t-4)/8);let initial=new T.Vector3(-3.1,1.8,1.5),end=new T.Vector3(9.5,8,14.5);camera.position.lerpVectors(initial,end,pull);let target=new T.Vector3(-3.1,1.45,.1).lerp(new T.Vector3(-.4,.7,.25),pull);camera.lookAt(target);}
 renderer.render(scene,camera);}
function resize(){let w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.FactoryScene={update,resize};resize();update(10,true);
})();
