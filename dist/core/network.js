import {windowKPIs} from './quality-statistics.js';
import {describe} from './inference.js';
import {createEventLog,inspectEventLog,STATES} from './event-log.js';
import {nativePhases,phaseRequirements,samplePhaseSeconds} from './native-phases.js';
import {METRICS,summarizeRuns} from './statistics.js';
import {phasePlan,isHuman} from './phases.js';
import {expandedNeeds} from './mbse.js';
import{PROCESS,POOLS,effective,validateModel}from './model.js';
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
class Heap{constructor(){this.a=[];this.seq=0}push(e){e.seq=this.seq++;const less=(a,b)=>a.t<b.t||(a.t===b.t&&a.seq<b.seq);let a=this.a,i=a.length;a.push(e);while(i){let p=(i-1)>>1;if(!less(e,a[p]))break;a[i]=a[p];i=p}a[i]=e}pop(){let a=this.a,out=a[0],last=a.pop();const less=(a,b)=>a.t<b.t||(a.t===b.t&&a.seq<b.seq);if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&less(a[c+1],a[c]))c++;if(!less(a[c],last))break;a[i]=a[c];i=c}a[i]=last}return out}peek(){return this.a[0]}}
export function simulateNetwork(model,settings=model.settings,{audit=false,eventLimit=500000}={}){const warnings=validateModel(model,{simulation:true});const end=settings.hours*3600,ev=new Heap();const trace=[];let traceTruncated=false;let t=0,arrived=0,good=0,scrap=0,inTransit=0,steps=0,materialCost=0;
 const ledger=createEventLog(audit,model,settings,eventLimit),emit=(type,data={})=>ledger.emit(t,type,data);let unitSequence=0;const jobs=new Map();
 const context=(n,s)=>({station:n.id,channel:n.slots.indexOf(s)+1,unit:s.job?.id,phase:s.phase,phaseName:n.plan[s.phase]?.name});
 const code=(n,key)=>n.quality?.[key]||'UNSPECIFIED';
 const all=new Map(model.nodes.map(n=>[n.id,{...n,p:effective(model,n),rng:random(settings.seed^hash(n.id)),q:[],reserved:0,slots:[],phaseWait:0,busy:0,down:0,blocked:0,queueTime:0,resourceWait:0,materialWait:0,calendarWait:0,maxQueue:0,count:0,used:0,useTime:0,consumed:0}]));
 const operations=[...all.values()].filter(n=>PROCESS.includes(n.type)),sources=[...all.values()].filter(n=>n.type==='source'),pools=[...all.values()].filter(n=>POOLS.includes(n.type)),materials=[...all.values()].filter(n=>n.type==='material');
 for(const n of all.values()){n.out=model.edges.filter(e=>e.type==='flow'&&e.from===n.id);n.needs=new Map();n.bom=new Map();for(const e of model.edges.filter(e=>e.from===n.id)){const map=e.type==='requires'?n.needs:e.type==='consumes'?n.bom:null;if(map)map.set(e.to,(map.get(e.to)||0)+e.quantity)}n.needs=expandedNeeds(model,n);n.plan=phasePlan(n);n.native=nativePhases(n);if(n.native)n.phaseNeeds=n.plan.map(p=>phaseRequirements(model,n,p));n.people=new Map([...n.needs].filter(([id])=>isHuman(all.get(id))));n.fixed=new Map([...n.needs].filter(([id])=>!isHuman(all.get(id))));if(PROCESS.includes(n.type))n.slots=Array.from({length:n.p.capacity},()=>({state:'idle',job:null,remaining:0}));if(n.type==='material')n.stock=n.p.stock;}
 const isOn=n=>!n.p.on||!n.p.off||(t%(n.p.on+n.p.off))<n.p.on-1e-9;
 const ready=n=>{if(!isOn(n))return 'calendar';for(const[id,q]of [...n.fixed,...(n.native?n.phaseNeeds[0]:(n.plan[0].kind==='manual'?n.people:[]))]){const r=all.get(id);if(!isOn(r)||r.used+q>r.p.capacity)return 'resource'}for(const[id,q]of n.bom)if(all.get(id).stock<q)return 'material';return ''};
 const streams=new Map();
 const draw=(n,kind)=>{if(!settings.crn)return n.rng();let owner='operation:'+n.id;if(kind==='failure'||kind==='repair'){const id=[...n.fixed.keys()].filter(id=>['machine','robot','hardware'].includes(all.get(id).type)).sort()[0];if(id)owner='resource:'+id;}const key=owner+':'+kind;if(!streams.has(key))streams.set(key,random(settings.seed^hash(key)));return streams.get(key)();};
 const choose=n=>{let v=draw(n,'route')*n.out.reduce((a,e)=>a+e.weight,0);for(const e of n.out){v-=e.weight;if(v<=0)return e}return n.out.at(-1)};
 const scheduleSegment=(n,slot)=>{const untilFailure=n.p.mtbf>0&&(!n.native||n.plan[slot.phase].kind==='automatic')?-Math.log(Math.max(1e-12,1-draw(n,'failure')))*n.p.mtbf:Infinity;if(untilFailure<slot.remaining){slot.remaining-=untilFailure;ev.push({t:t+untilFailure,type:'fail',n,slot})}else ev.push({t:t+slot.remaining,type:'finish',n,slot})};
 const traceState=(n,s)=>{
  if(s.stateAt===undefined||t<=s.stateAt)return;
  if(trace.length<2000)trace.push({operation:n.id,name:n.name,channel:n.slots.indexOf(s)+1,phase:n.plan[s.phase]?.name||'',kind:n.plan[s.phase]?.kind||'',state:s.state,start:s.stateAt,end:t,jobBorn:s.job?.born,resources:[...(s.fixedHeld?n.fixed.keys():[]),...(s.peopleHeld?n.people.keys():[]),...(s.phaseHeld?.keys()||[])],...(n.native?{resourceQuantities:Object.fromEntries([...(s.fixedHeld?n.fixed:[]),...(s.phaseHeld||[])])}:{})});
  else traceTruncated=true;
 };
 const state=(n,s,value)=>{traceState(n,s);if(s.state==='blocked'&&value!=='blocked')emit('unblock',context(n,s));if(value==='blocked')emit('block',context(n,s));s.state=value;s.stateAt=t};
 const changeUse=(needs,delta,n,s)=>{for(const[id,q]of needs){const r=all.get(id);r.used+=delta*q;emit(delta>0?'resource_reserve':'resource_release',{...context(n,s),resource:id,quantity:q});if(r.used<0||r.used>r.p.capacity)throw Error('Invariant ressource: '+r.name)}};
 const releasePeople=(n,s)=>{if(s.peopleHeld){changeUse(n.people,-1,n,s);s.peopleHeld=false}};
 const releasePhase=(n,s)=>{if(s.phaseHeld){changeUse(s.phaseHeld,-1,n,s);s.phaseHeld=null}};
 const release=(n,s)=>{releasePhase(n,s);releasePeople(n,s);if(s.fixedHeld){changeUse(n.fixed,-1,n,s);s.fixedHeld=false}};
 const canPhase=(n,s)=>n.native?[...n.phaseNeeds[s.phase]].every(([id,q])=>{const r=all.get(id);return isOn(r)&&r.used+q<=r.p.capacity}):n.plan[s.phase].kind!=='manual'||s.peopleHeld||[...n.people].every(([id,q])=>{const r=all.get(id);return isOn(r)&&r.used+q<=r.p.capacity});
 const beginPhase=(n,s)=>{
  const phase=n.plan[s.phase],manual=phase.kind==='manual';
  emit('phase_start',{...context(n,s),kind:phase.kind});
  if(n.native){
   state(n,s,'busy');s.phaseHeld=n.phaseNeeds[s.phase];changeUse(s.phaseHeld,1,n,s);
   let speed=1,latency=0;for(const[id]of [...n.fixed,...s.phaseHeld])speed*=all.get(id).p.speed;
   for(const[id]of s.phaseHeld)latency+=all.get(id).p.latency;
   if(s.phase===0)for(const[id]of n.fixed)latency+=all.get(id).p.latency;
   s.remaining=(samplePhaseSeconds(phase,()=>draw(n,'duration'))+(s.phase===0?n.p.setup:0))/speed+latency;
   if(s.remaining<1e-6)throw Error('Durată prea mică după factorii de viteză.');
   scheduleSegment(n,s);return;
  }
  let latency=0,speed=1;
  state(n,s,'busy');
  if(manual&&!s.peopleHeld){changeUse(n.people,1,n,s);s.peopleHeld=true;for(const[id]of n.people)latency+=all.get(id).p.latency}
  for(const[id]of [...n.fixed,...(manual?n.people:[])])speed*=all.get(id).p.speed;
  if(s.phase===0)for(const[id]of n.fixed)latency+=all.get(id).p.latency;
  s.remaining=(n.p.cycle*phase.fraction*s.variation+(s.phase===0?n.p.setup:0))/speed+latency;
  if(s.remaining<1e-6)throw Error('Durată prea mică după factorii de viteză.');
  scheduleSegment(n,s);
 };
 const start=(n,s)=>{
  s.job=n.q.shift();s.job.visits??=Object.create(null);s.job.visitOrder??=Object.create(null);if(s.job.visitOrder[n.id]===undefined)s.job.visitOrder[n.id]=Object.keys(s.job.visitOrder).length;if(s.job.visits[n.id]&&(n.type==='inspection'||n.plan.some(p=>p.kind==='inspect')))emit('retest',{station:n.id,unit:s.job.id,code:code(n,'reworkCode')});s.job.visits[n.id]=(s.job.visits[n.id]||0)+1;s.phase=0;s.stateAt=t;s.peopleHeld=false;s.fixedHeld=true;s.variation=n.native?1:1+n.p.variation*(2*draw(n,'duration')-1);s.phaseHeld=null;
  changeUse(n.fixed,1,n,s);
  for(const[id,q]of n.bom){const r=all.get(id);r.stock-=q;r.consumed+=q;materialCost+=q*r.p.unitCost;emit('material_consume',{...context(n,s),material:id,quantity:q})}
  beginPhase(n,s);
 };
 const transfer=job=>{const e=job.edge,d=all.get(e.to);if(d.type!=='sink'&&d.q.length+d.reserved>=d.p.buffer)return false;if(d.type!=='sink')d.reserved++;inTransit++;emit('transfer',{unit:job.id,edge:e.id,to:d.id,arrivalTime:t+e.delay});ev.push({t:t+e.delay,type:'deliver',n:d,job});return true};
 const pump=()=>{for(const n of sources){while(n.q.length&&transfer(n.q[0]))n.q.shift()}for(const n of operations){for(const s of n.slots)if(s.state==='blocked'&&transfer(s.job)){state(n,s,'idle');s.job=null}for(const s of n.slots)if(s.state==='phaseWait'&&canPhase(n,s))beginPhase(n,s);for(const s of n.slots)if(s.state==='idle'&&n.q.length&&!ready(n))start(n,s)}};
 const leads=[],series=[];for(const n of sources)ev.push({t:0,type:'source',n});for(const n of [...operations,...pools])if(n.p.on&&n.p.off){let wake=n.p.on+n.p.off;while(wake<=end){ev.push({t:wake,type:'wake',calendarNode:n,calendarState:'on'});wake+=n.p.on+n.p.off}let stop=n.p.on;while(stop<end){ev.push({t:stop,type:'wake',calendarNode:n,calendarState:'off'});stop+=n.p.on+n.p.off}}
 for(let i=1;i<=100;i++)ev.push({t:end*i/100,type:'sample'});
 for(const n of [...operations,...pools])emit('calendar_on',{entity:n.id});
 const held=(n,s)=>[...(s.fixedHeld?n.fixed:[]),...(s.peopleHeld?n.people:[]),...(s.phaseHeld||[])];
 const classify=(n,s)=>s.state==='phaseWait'?'waiting-for-resource':s.state!=='idle'?s.state:!isOn(n)?'off-shift':!n.q.length?'starved':({resource:'waiting-for-resource',material:'waiting-for-material',calendar:'off-shift'}[ready(n)]||'idle');
 function recordIntervals(dt){if(!audit||dt<=0)return;
  const resourceCounts=new Map(pools.map(n=>[n.id,Object.fromEntries(STATES.map(k=>[k,0]))]));
  for(const n of operations){const counts=Object.fromEntries(STATES.map(k=>[k,0]));let heldWait=0;
   for(const slot of n.slots){const kind=classify(n,slot);counts[kind]++;if(slot.state==='phaseWait')heldWait++;
    if(slot.accountedState!==kind){if(slot.accountedState==='starved')emit('starvation_end',{station:n.id,channel:n.slots.indexOf(slot)+1});if(kind==='starved')emit('starvation_start',{station:n.id,channel:n.slots.indexOf(slot)+1});slot.accountedState=kind;}
    for(const[id,q]of held(n,slot))resourceCounts.get(id)[slot.state==='down'?'down':slot.state==='phaseWait'?'waiting-for-resource':'busy']+=q;
   }
   emit('state_interval',{entity:n.id,category:'operation',end:t+dt,counts,heldWait,queue:n.q.length,resourceWait:!!(n.q.length&&n.slots.some(s=>s.state==='idle')&&ready(n)==='resource'),materialWait:!!(n.q.length&&n.slots.some(s=>s.state==='idle')&&ready(n)==='material'),calendarWait:!!(n.q.length&&n.slots.some(s=>s.state==='idle')&&ready(n)==='calendar')});
  }
  for(const n of pools){const counts=resourceCounts.get(n.id);counts[isOn(n)?'idle':'off-shift']+=n.p.capacity-n.used;emit('state_interval',{entity:n.id,category:'resource',end:t+dt,counts,occupied:n.used});}
 }
 function integrate(dt){recordIntervals(dt);for(const n of operations){n.busy+=dt*n.slots.filter(s=>s.state==='busy').length;n.down+=dt*n.slots.filter(s=>s.state==='down').length;n.blocked+=dt*n.slots.filter(s=>s.state==='blocked').length;n.phaseWait+=dt*n.slots.filter(s=>s.state==='phaseWait').length;n.queueTime+=dt*n.q.length;if(n.q.length&&n.slots.some(s=>s.state==='idle')){const r=ready(n);if(r)n[r+'Wait']+=dt;}}for(const n of pools)n.useTime+=dt*n.used;}
 while(ev.peek()&&ev.peek().t<=end){if(++steps>2000000)throw Error('Limită 2 milioane evenimente: redu orizontul sau complexitatea.');const e=ev.pop();integrate(e.t-t);t=e.t;
 if(e.type==='wake'&&e.calendarNode)emit('calendar_'+e.calendarState,{entity:e.calendarNode.id});
 if(e.type==='source'){arrived++;if(arrived-good-scrap>250000)throw Error('WIP peste 250.000: verifică alimentarea sau stocurile.');e.n.count++;const job={id:'unit-'+(++unitSequence),born:t,edge:choose(e.n)};if(audit)jobs.set(job.id,job);emit('arrival',{station:e.n.id,unit:job.id});e.n.q.push(job);if(!e.n.p.limit||e.n.count<e.n.p.limit)ev.push({t:t+e.n.p.interval,type:'source',n:e.n});}
 else if(e.type==='deliver'){inTransit--;emit('delivery',{unit:e.job.id,station:e.n.id,queueSize:e.n.type==='sink'?0:e.n.q.length+1});if(e.n.type==='sink'){good++;e.n.count++;leads.push(t-e.job.born);emit('unit_good',{station:e.n.id,unit:e.job.id});jobs.delete(e.job.id)}else{e.n.reserved--;e.n.q.push(e.job);e.n.maxQueue=Math.max(e.n.maxQueue,e.n.q.length);}}
 else if(e.type==='finish'){emit('phase_end',context(e.n,e.slot));if(e.slot.phase+1<e.n.plan.length){traceState(e.n,e.slot);e.slot.stateAt=t;if(e.n.native)releasePhase(e.n,e.slot);e.slot.phase++;if(e.n.plan[e.slot.phase].kind==='automatic')releasePeople(e.n,e.slot);state(e.n,e.slot,'phaseWait');if(canPhase(e.n,e.slot))beginPhase(e.n,e.slot);pump();continue;}traceState(e.n,e.slot);e.slot.stateAt=t;release(e.n,e.slot);e.n.count++;emit('operation_end',context(e.n,e.slot));if(draw(e.n,'quality')<e.n.p.scrap){scrap++;if(e.n.type==='inspection'||e.n.plan.some(p=>p.kind==='inspect'))emit('inspection_result',{...context(e.n,e.slot),result:'fail',code:code(e.n,'scrapCode')});emit('scrap',{...context(e.n,e.slot),code:code(e.n,'scrapCode')});jobs.delete(e.slot.job.id);state(e.n,e.slot,'idle');e.slot.job=null}else{for(const edge of model.edges.filter(x=>x.type==='produces'&&x.from===e.n.id)){const mat=all.get(edge.to);mat.stock+=edge.quantity;mat.produced=(mat.produced||0)+edge.quantity;emit('material_produce',{...context(e.n,e.slot),material:edge.to,quantity:edge.quantity})}state(e.n,e.slot,'blocked');e.slot.job.edge=choose(e.n);const route=e.slot.job.edge,isRework=route.rework||(e.slot.job.visitOrder[route.to]!==undefined&&e.slot.job.visitOrder[route.to]<=e.slot.job.visitOrder[e.n.id]);emit('route',{...context(e.n,e.slot),edge:route.id,to:route.to});if(isRework)emit('rework_route',{...context(e.n,e.slot),edge:route.id,to:route.to,code:route.reasonCode||code(e.n,'reworkCode')});if(e.n.type==='inspection'||e.n.plan.some(p=>p.kind==='inspect'))emit('inspection_result',{...context(e.n,e.slot),result:isRework?'fail':'pass',code:isRework?(route.reasonCode||code(e.n,'reworkCode')):null})}}
 else if(e.type==='fail'){emit('failure',{...context(e.n,e.slot),code:code(e.n,'downtimeCode')});emit('downtime_start',{...context(e.n,e.slot),code:code(e.n,'downtimeCode')});state(e.n,e.slot,'down');const repair=-Math.log(Math.max(1e-12,1-draw(e.n,'repair')))*e.n.p.mttr;ev.push({t:t+repair,type:'repair',n:e.n,slot:e.slot});}
 else if(e.type==='repair'){emit('repair',{...context(e.n,e.slot),code:code(e.n,'downtimeCode')});emit('downtime_end',{...context(e.n,e.slot),code:code(e.n,'downtimeCode')});state(e.n,e.slot,'busy');scheduleSegment(e.n,e.slot)}
 pump();if(e.type==='sample')emit('sample',{good,wip:arrived-good-scrap});if(e.type==='sample')series.push({hour:t/3600,good,wip:arrived-good-scrap});
 }
 integrate(end-t);t=end;for(const n of operations)for(const s of n.slots)if(s.job)traceState(n,s);const actualWip=inTransit+sources.reduce((a,n)=>a+n.q.length,0)+operations.reduce((a,n)=>a+n.q.length+n.slots.filter(s=>s.job).length,0);if(actualWip!==arrived-good-scrap)throw Error('Eroare internă de conservare a pieselor.');
 leads.sort((a,b)=>a-b);const energy=operations.reduce((a,n)=>a+n.busy/3600*n.p.power,0),resourceCost=pools.reduce((a,n)=>a+n.useTime/3600*n.p.cost,0),operationCost=operations.reduce((a,n)=>a+(n.busy+n.down+n.phaseWait)/3600*n.p.cost,0);
 const result={trace,traceTruncated,outputs:[...all.values()].filter(n=>n.type==='sink').map(n=>({id:n.id,name:n.name,good:n.count})),arrived,good,scrap,wip:actualWip,inTransit,throughput:good/settings.hours,leadMean:good?leads.reduce((a,b)=>a+b,0)/good:null,leadP95:good?leads[Math.min(good-1,Math.floor(.95*good))]:null,energy,materialCost,resourceCost,operationCost,totalCost:materialCost+resourceCost+operationCost,series,warnings,operations:operations.map(n=>({id:n.id,name:n.name,count:n.count,busy:n.busy/(end*n.p.capacity),down:n.down/(end*n.p.capacity),blocked:n.blocked/(end*n.p.capacity),phaseWait:n.phaseWait/(end*n.p.capacity),phaseWaitSeconds:n.phaseWait,idle:Math.max(0,1-(n.busy+n.down+n.blocked+n.phaseWait)/(end*n.p.capacity)),queue:n.queueTime/end,maxQueue:n.maxQueue,resourceWait:n.resourceWait,materialWait:n.materialWait,calendarWait:n.calendarWait})),resources:pools.map(n=>({id:n.id,name:n.name,utilization:n.useTime/(end*n.p.capacity),cost:n.useTime/3600*n.p.cost})),materials:materials.map(n=>({id:n.id,name:n.name,initial:n.p.stock,produced:n.produced||0,remaining:n.stock,consumed:n.consumed})),settings:{...settings},events:steps};
 if(audit){for(const job of jobs.values())emit('unit_wip',{unit:job.id});emit('run_end',{result:structuredClone(result)});const integrity=inspectEventLog(ledger.events,result);if(!integrity.ok)throw Error('Event integrity failed: '+integrity.errors.join('; '));result.audit={schema:1,events:ledger.events,integrity};}
 return result;
}
export function replicate(model){
 validateModel(model,{simulation:true});const runs=[],audits=[],resourceRuns=[],operationRuns=[],denominators=[],seeds=[];let first,eventCount=0,serializedBytes=0;
 const started=Date.now(),level=model.settings.confidence??.95;
 for(let i=0;i<model.settings.replications;i++){
  if(Date.now()-started>45000)throw Error('Experiment compute budget 45 s exceeded; reduce horizon/replications.');
  const seed=model.settings.seed+i*100003;seeds.push(seed);
  const result=simulateNetwork(model,{...model.settings,seed},{audit:true,eventLimit:200000-eventCount});
  const observed=windowKPIs(result,model);
  eventCount+=result.audit.events.length;
  serializedBytes+=new TextEncoder().encode(JSON.stringify(result.audit)).byteLength;
  if(serializedBytes>32*1024*1024)throw Error('Experiment log budget 32 MiB exceeded; reduce horizon/replications.');
  if(!first)first=result;audits.push(result.audit);runs.push(observed.metrics);resourceRuns.push(observed.resources);operationRuns.push(observed.operations);denominators.push(observed.denominators);
 }
 const summary=summarizeRuns(runs,level);
 const entities=records=>Object.fromEntries([...new Set(records.flatMap(r=>Object.keys(r)))].map(id=>[id,describe(records.map(r=>r[id]),level)]));
 return{first,runs,audits,summary,utilization:{resources:entities(resourceRuns),operations:entities(operationRuns)},denominators,seeds,analysisVersion:'statistics-1',confidence:level,window:{warmupSeconds:model.settings.warmupSeconds||0,horizonSeconds:model.settings.hours*3600},randomMode:model.settings.crn?'crn-streams-v1':'legacy-node-stream',warnings:model.settings.warmupSeconds?['Warm-up discards the start of the observation window. Do not use it for a shift that begins empty unless that exclusion is intended.']:[],mean:summary.good.mean,ci95:summary.good.ci95,engineVersion:model.settings.crn?'0.7.0-crn1':model.nodes.some(nativePhases)?'0.6.0':'0.5.0',at:new Date().toISOString()};
}
