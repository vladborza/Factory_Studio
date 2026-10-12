import {METRICS,summarizeRuns} from './statistics.js';
import {phasePlan,isHuman} from './phases.js';
import {expandedNeeds} from './mbse.js';
import{PROCESS,POOLS,effective,validateModel}from './model.js';
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
class Heap{constructor(){this.a=[];this.seq=0}push(e){e.seq=this.seq++;const less=(a,b)=>a.t<b.t||(a.t===b.t&&a.seq<b.seq);let a=this.a,i=a.length;a.push(e);while(i){let p=(i-1)>>1;if(!less(e,a[p]))break;a[i]=a[p];i=p}a[i]=e}pop(){let a=this.a,out=a[0],last=a.pop();const less=(a,b)=>a.t<b.t||(a.t===b.t&&a.seq<b.seq);if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&less(a[c+1],a[c]))c++;if(!less(a[c],last))break;a[i]=a[c];i=c}a[i]=last}return out}peek(){return this.a[0]}}
export function simulateNetwork(model,settings=model.settings){const warnings=validateModel(model,{simulation:true});const end=settings.hours*3600,ev=new Heap();const trace=[];let traceTruncated=false;let t=0,arrived=0,good=0,scrap=0,inTransit=0,steps=0,materialCost=0;
 const all=new Map(model.nodes.map(n=>[n.id,{...n,p:effective(model,n),rng:random(settings.seed^hash(n.id)),q:[],reserved:0,slots:[],phaseWait:0,busy:0,down:0,blocked:0,queueTime:0,resourceWait:0,materialWait:0,calendarWait:0,maxQueue:0,count:0,used:0,useTime:0,consumed:0}]));
 const operations=[...all.values()].filter(n=>PROCESS.includes(n.type)),sources=[...all.values()].filter(n=>n.type==='source'),pools=[...all.values()].filter(n=>POOLS.includes(n.type)),materials=[...all.values()].filter(n=>n.type==='material');
 for(const n of all.values()){n.out=model.edges.filter(e=>e.type==='flow'&&e.from===n.id);n.needs=new Map();n.bom=new Map();for(const e of model.edges.filter(e=>e.from===n.id)){const map=e.type==='requires'?n.needs:e.type==='consumes'?n.bom:null;if(map)map.set(e.to,(map.get(e.to)||0)+e.quantity)}n.needs=expandedNeeds(model,n);n.plan=phasePlan(n);n.people=new Map([...n.needs].filter(([id])=>isHuman(all.get(id))));n.fixed=new Map([...n.needs].filter(([id])=>!isHuman(all.get(id))));if(PROCESS.includes(n.type))n.slots=Array.from({length:n.p.capacity},()=>({state:'idle',job:null,remaining:0}));if(n.type==='material')n.stock=n.p.stock;}
 const isOn=n=>!n.p.on||!n.p.off||(t%(n.p.on+n.p.off))<n.p.on-1e-9;
 const ready=n=>{if(!isOn(n))return 'calendar';for(const[id,q]of [...n.fixed,...(n.plan[0].kind==='manual'?n.people:[])]){const r=all.get(id);if(!isOn(r)||r.used+q>r.p.capacity)return 'resource'}for(const[id,q]of n.bom)if(all.get(id).stock<q)return 'material';return ''};
 const choose=n=>{let v=n.rng()*n.out.reduce((a,e)=>a+e.weight,0);for(const e of n.out){v-=e.weight;if(v<=0)return e}return n.out.at(-1)};
 const scheduleSegment=(n,slot)=>{const untilFailure=n.p.mtbf>0?-Math.log(Math.max(1e-12,1-n.rng()))*n.p.mtbf:Infinity;if(untilFailure<slot.remaining){slot.remaining-=untilFailure;ev.push({t:t+untilFailure,type:'fail',n,slot})}else ev.push({t:t+slot.remaining,type:'finish',n,slot})};
 const traceState=(n,s)=>{
  if(s.stateAt===undefined||t<=s.stateAt)return;
  if(trace.length<2000)trace.push({operation:n.id,name:n.name,channel:n.slots.indexOf(s)+1,phase:n.plan[s.phase]?.name||'',kind:n.plan[s.phase]?.kind||'',state:s.state,start:s.stateAt,end:t,jobBorn:s.job?.born,resources:[...(s.fixedHeld?n.fixed.keys():[]),...(s.peopleHeld?n.people.keys():[])]});
  else traceTruncated=true;
 };
 const state=(n,s,value)=>{traceState(n,s);s.state=value;s.stateAt=t};
 const changeUse=(needs,delta)=>{for(const[id,q]of needs){const r=all.get(id);r.used+=delta*q;if(r.used<0||r.used>r.p.capacity)throw Error('Invariant ressource: '+r.name)}};
 const releasePeople=(n,s)=>{if(s.peopleHeld){changeUse(n.people,-1);s.peopleHeld=false}};
 const release=(n,s)=>{releasePeople(n,s);if(s.fixedHeld){changeUse(n.fixed,-1);s.fixedHeld=false}};
 const canPhase=(n,s)=>n.plan[s.phase].kind!=='manual'||s.peopleHeld||[...n.people].every(([id,q])=>{const r=all.get(id);return isOn(r)&&r.used+q<=r.p.capacity});
 const beginPhase=(n,s)=>{
  const phase=n.plan[s.phase],manual=phase.kind==='manual';
  let latency=0,speed=1;
  state(n,s,'busy');
  if(manual&&!s.peopleHeld){changeUse(n.people,1);s.peopleHeld=true;for(const[id]of n.people)latency+=all.get(id).p.latency}
  for(const[id]of [...n.fixed,...(manual?n.people:[])])speed*=all.get(id).p.speed;
  if(s.phase===0)for(const[id]of n.fixed)latency+=all.get(id).p.latency;
  s.remaining=(n.p.cycle*phase.fraction*s.variation+(s.phase===0?n.p.setup:0))/speed+latency;
  if(s.remaining<1e-6)throw Error('Durată prea mică după factorii de viteză.');
  scheduleSegment(n,s);
 };
 const start=(n,s)=>{
  s.job=n.q.shift();s.phase=0;s.stateAt=t;s.peopleHeld=false;s.fixedHeld=true;s.variation=1+n.p.variation*(2*n.rng()-1);
  changeUse(n.fixed,1);
  for(const[id,q]of n.bom){const r=all.get(id);r.stock-=q;r.consumed+=q;materialCost+=q*r.p.unitCost}
  beginPhase(n,s);
 };
 const transfer=job=>{const e=job.edge,d=all.get(e.to);if(d.type!=='sink'&&d.q.length+d.reserved>=d.p.buffer)return false;if(d.type!=='sink')d.reserved++;inTransit++;ev.push({t:t+e.delay,type:'deliver',n:d,job});return true};
 const pump=()=>{for(const n of sources){while(n.q.length&&transfer(n.q[0]))n.q.shift()}for(const n of operations){for(const s of n.slots)if(s.state==='blocked'&&transfer(s.job)){state(n,s,'idle');s.job=null}for(const s of n.slots)if(s.state==='phaseWait'&&canPhase(n,s))beginPhase(n,s);for(const s of n.slots)if(s.state==='idle'&&n.q.length&&!ready(n))start(n,s)}};
 const leads=[],series=[];for(const n of sources)ev.push({t:0,type:'source',n});for(const n of [...operations,...pools])if(n.p.on&&n.p.off){let wake=n.p.on+n.p.off;while(wake<=end){ev.push({t:wake,type:'wake'});wake+=n.p.on+n.p.off}let stop=n.p.on;while(stop<end){ev.push({t:stop,type:'wake'});stop+=n.p.on+n.p.off}}
 for(let i=1;i<=100;i++)ev.push({t:end*i/100,type:'sample'});
 function integrate(dt){for(const n of operations){n.busy+=dt*n.slots.filter(s=>s.state==='busy').length;n.down+=dt*n.slots.filter(s=>s.state==='down').length;n.blocked+=dt*n.slots.filter(s=>s.state==='blocked').length;n.phaseWait+=dt*n.slots.filter(s=>s.state==='phaseWait').length;n.queueTime+=dt*n.q.length;if(n.q.length&&n.slots.some(s=>s.state==='idle')){const r=ready(n);if(r)n[r+'Wait']+=dt;}}for(const n of pools)n.useTime+=dt*n.used;}
 while(ev.peek()&&ev.peek().t<=end){if(++steps>2000000)throw Error('Limită 2 milioane evenimente: redu orizontul sau complexitatea.');const e=ev.pop();integrate(e.t-t);t=e.t;
 if(e.type==='source'){arrived++;if(arrived-good-scrap>250000)throw Error('WIP peste 250.000: verifică alimentarea sau stocurile.');e.n.count++;e.n.q.push({born:t,edge:choose(e.n)});if(!e.n.p.limit||e.n.count<e.n.p.limit)ev.push({t:t+e.n.p.interval,type:'source',n:e.n});}
 else if(e.type==='deliver'){inTransit--;if(e.n.type==='sink'){good++;e.n.count++;leads.push(t-e.job.born)}else{e.n.reserved--;e.n.q.push(e.job);e.n.maxQueue=Math.max(e.n.maxQueue,e.n.q.length);}}
 else if(e.type==='finish'){if(e.slot.phase+1<e.n.plan.length){traceState(e.n,e.slot);e.slot.stateAt=t;e.slot.phase++;if(e.n.plan[e.slot.phase].kind==='automatic')releasePeople(e.n,e.slot);state(e.n,e.slot,'phaseWait');if(canPhase(e.n,e.slot))beginPhase(e.n,e.slot);pump();continue;}traceState(e.n,e.slot);e.slot.stateAt=t;release(e.n,e.slot);e.n.count++;if(e.n.rng()<e.n.p.scrap){scrap++;state(e.n,e.slot,'idle');e.slot.job=null}else{for(const edge of model.edges.filter(x=>x.type==='produces'&&x.from===e.n.id)){const mat=all.get(edge.to);mat.stock+=edge.quantity;mat.produced=(mat.produced||0)+edge.quantity}state(e.n,e.slot,'blocked');e.slot.job.edge=choose(e.n)}}
 else if(e.type==='fail'){state(e.n,e.slot,'down');const repair=-Math.log(Math.max(1e-12,1-e.n.rng()))*e.n.p.mttr;ev.push({t:t+repair,type:'repair',n:e.n,slot:e.slot});}
 else if(e.type==='repair'){state(e.n,e.slot,'busy');scheduleSegment(e.n,e.slot)}
 pump();if(e.type==='sample')series.push({hour:t/3600,good,wip:arrived-good-scrap});
 }
 integrate(end-t);t=end;for(const n of operations)for(const s of n.slots)if(s.job)traceState(n,s);const actualWip=inTransit+sources.reduce((a,n)=>a+n.q.length,0)+operations.reduce((a,n)=>a+n.q.length+n.slots.filter(s=>s.job).length,0);if(actualWip!==arrived-good-scrap)throw Error('Eroare internă de conservare a pieselor.');
 leads.sort((a,b)=>a-b);const energy=operations.reduce((a,n)=>a+n.busy/3600*n.p.power,0),resourceCost=pools.reduce((a,n)=>a+n.useTime/3600*n.p.cost,0),operationCost=operations.reduce((a,n)=>a+(n.busy+n.down+n.phaseWait)/3600*n.p.cost,0);
 return{trace,traceTruncated,outputs:[...all.values()].filter(n=>n.type==='sink').map(n=>({id:n.id,name:n.name,good:n.count})),arrived,good,scrap,wip:actualWip,inTransit,throughput:good/settings.hours,leadMean:good?leads.reduce((a,b)=>a+b,0)/good:null,leadP95:good?leads[Math.min(good-1,Math.floor(.95*good))]:null,energy,materialCost,resourceCost,operationCost,totalCost:materialCost+resourceCost+operationCost,series,warnings,operations:operations.map(n=>({id:n.id,name:n.name,count:n.count,busy:n.busy/(end*n.p.capacity),down:n.down/(end*n.p.capacity),blocked:n.blocked/(end*n.p.capacity),phaseWait:n.phaseWait/(end*n.p.capacity),phaseWaitSeconds:n.phaseWait,idle:Math.max(0,1-(n.busy+n.down+n.blocked+n.phaseWait)/(end*n.p.capacity)),queue:n.queueTime/end,maxQueue:n.maxQueue,resourceWait:n.resourceWait,materialWait:n.materialWait,calendarWait:n.calendarWait})),resources:pools.map(n=>({id:n.id,name:n.name,utilization:n.useTime/(end*n.p.capacity),cost:n.useTime/3600*n.p.cost})),materials:materials.map(n=>({id:n.id,name:n.name,initial:n.p.stock,produced:n.produced||0,remaining:n.stock,consumed:n.consumed})),settings:{...settings},events:steps};
}
export function replicate(model){
 validateModel(model,{simulation:true});const runs=[];let first;
 for(let i=0;i<model.settings.replications;i++){
  const result=simulateNetwork(model,{...model.settings,seed:model.settings.seed+i*100003});
  if(!first)first=result;
  runs.push(Object.fromEntries(Object.keys(METRICS).map(k=>[k,result[k]])));
 }
 const summary=summarizeRuns(runs);
 return{first,runs,summary,mean:summary.good.mean,ci95:summary.good.ci95,engineVersion:'0.5.0',at:new Date().toISOString()};
}
