export function validate(model){
 if(!model||model.version!==1||!Array.isArray(model.lines)||!model.lines.length||model.lines.length>30)throw Error('Model invalid: între 1 și 30 linii, version=1.');
 const ids=new Set();const id=x=>{if(typeof x!=='string'||!x||ids.has(x))throw Error('ID lipsă sau duplicat.');ids.add(x)};
 if(typeof model.name!=='string')throw Error('Nume model invalid.');
 for(const l of model.lines){id(l.id);if(typeof l.name!=='string'||!Array.isArray(l.stations)||!l.stations.length||l.stations.length>50)throw Error('O linie necesită 1–50 stații.');if(!(Number.isFinite(l.arrival)&&l.arrival>=1&&l.arrival<=86400))throw Error('Interval sosiri: 1–86400 secunde.');
 for(const s of l.stations){id(s.id);if(typeof s.name!=='string')throw Error('Nume stație invalid.');for(const[k,lo,hi,int]of[['cycle',1,86400,false],['capacity',1,20,true],['buffer',1,1000,true],['variation',0,0.9,false]])if(!Number.isFinite(s[k])||s[k]<lo||s[k]>hi||(int&&!Number.isInteger(s[k])))throw Error(`${s.name}: valoare invalidă pentru ${k}.`);}}
 for(const key of ['elements','links','requirements','hazards'])if(!Array.isArray(model[key])||model[key].length>5000)throw Error(`Listă ${key} invalidă.`);
 for(const e of model.elements){id(e.id);if(!['M','O','F','L','T'].includes(e.level)||typeof e.name!=='string')throw Error('Element MOFLT invalid.');}
 const refs=new Set([...ids]); for(const e of model.links)if(!refs.has(e.from)||!refs.has(e.to)||typeof e.type!=='string')throw Error('Legătură fără capete valide.');
 for(const r of model.requirements){id(r.id);if(typeof r.text!=='string'||!Array.isArray(r.targets)||r.targets.some(t=>!refs.has(t)))throw Error('Trasabilitate cerință invalidă.');}
 for(const h of model.hazards){id(h.id);if(typeof h.text!=='string'||typeof h.mitigation!=='string'||!['Open','Mitigated','Accepted'].includes(h.status))throw Error('Hazard invalid.');}
 return true;
}
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
class Heap{constructor(){this.a=[]}push(e){let a=this.a,i=a.length;a.push(e);while(i){let p=(i-1)>>1;if(a[p].t<=e.t)break;a[i]=a[p];i=p}a[i]=e}pop(){let a=this.a,out=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].t<a[c].t)c++;if(a[c].t>=last.t)break;a[i]=a[c];i=c}a[i]=last}return out}peek(){return this.a[0]}}
export function simulateLine(line,{hours=8,seed=42}={}){
 if(!Number.isFinite(hours)||hours<=0||hours>168||!Number.isInteger(seed))throw Error('Orizont/seed invalid.');
 const end=hours*3600,rng=random(seed),ev=new Heap(),stations=line.stations.map(s=>({...s,q:[],slots:Array.from({length:s.capacity},()=>({state:'idle',job:null})),busy:0,blocked:0,qArea:0,maxQ:0,count:0}));
 let t=0,arrived=0,done=0,steps=0;const leads=[],series=[];ev.push({t:0,type:'arrival'});for(let k=1;k<=80;k++)ev.push({t:end*k/80,type:'sample'});
 const start=(s,slot)=>{const j=s.q.shift();slot.state='busy';slot.job=j;const duration=s.cycle*(1+s.variation*(2*rng()-1));ev.push({t:t+duration,type:'finish',slot,s})};
 const pump=()=>{let changed=true,passes=0;while(changed){changed=false;if(++passes>stations.length*25+100)throw Error('Transferul nu converge.');for(let i=stations.length-1;i>=0;i--){const s=stations[i];for(const slot of s.slots)if(slot.state==='blocked'){
 if(i===stations.length-1){done++;leads.push(t-slot.job.born);s.count++;slot.state='idle';slot.job=null;changed=true}
 else{const next=stations[i+1];if(next.q.length<next.buffer){next.q.push(slot.job);next.maxQ=Math.max(next.maxQ,next.q.length);s.count++;slot.state='idle';slot.job=null;changed=true}}}
 for(const slot of s.slots)if(slot.state==='idle'&&s.q.length){start(s,slot);changed=true}
 }}};
 const integrate=dt=>{for(const s of stations){s.busy+=dt*s.slots.filter(x=>x.state==='busy').length;s.blocked+=dt*s.slots.filter(x=>x.state==='blocked').length;s.qArea+=dt*s.q.length}};
 while(ev.peek()&&ev.peek().t<=end){if(++steps>2000000)throw Error('Limita de 2 milioane de evenimente atinsă; mărește timpii sau redu orizontul.');const now=ev.peek().t;integrate(now-t);t=now;let sampled=false;
 while(ev.peek()&&Math.abs(ev.peek().t-t)<1e-8){const e=ev.pop();if(e.type==='arrival'){arrived++;stations[0].q.push({born:t});stations[0].maxQ=Math.max(stations[0].maxQ,stations[0].q.length);ev.push({t:t+line.arrival,type:'arrival'})}else if(e.type==='finish')e.slot.state='blocked';else sampled=true;}pump();if(sampled)series.push({t:t/3600,done,wip:arrived-done});}
 integrate(end-t);leads.sort((a,b)=>a-b);const sum=leads.reduce((a,b)=>a+b,0);return{lineId:line.id,arrived,done,wip:arrived-done,throughput:done/hours,leadMean:done?sum/done:null,leadP95:done?leads[Math.min(done-1,Math.floor(done*.95))]:null,series,stations:stations.map(s=>({id:s.id,count:s.count,busy:s.busy/(end*s.capacity),blocked:s.blocked/(end*s.capacity),idle:Math.max(0,1-(s.busy+s.blocked)/(end*s.capacity)),queue:s.qArea/end,maxQ:s.maxQ,nominal:3600*s.capacity/s.cycle}))};
}
export function run(model,options){validate(model);const lines=model.lines.map((l,i)=>simulateLine(l,{...options,seed:options.seed+i*1009}));return{lines,done:lines.reduce((a,l)=>a+l.done,0),wip:lines.reduce((a,l)=>a+l.wip,0),options,at:new Date().toISOString()};}
export function diagnose(line,options){const baseline=simulateLine(line,options);return line.stations.map(s=>{const test=structuredClone(line);test.stations.find(x=>x.id===s.id).cycle*=.8;const r=simulateLine(test,options);return{id:s.id,gain:r.done-baseline.done,percent:baseline.done?(r.done/baseline.done-1)*100:0}}).sort((a,b)=>b.gain-a.gain);}
