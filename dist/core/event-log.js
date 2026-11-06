export const STATES=['busy','idle','blocked','starved','waiting-for-resource','waiting-for-material','down','off-shift'];
export function validateQuality(m){
 const codes=m.qualityCodes||[];
 if(!Array.isArray(codes)||codes.length>500)throw Error('Quality codes: maximum 500 entries.');
 const ids=new Set(['UNSPECIFIED']);
 for(const c of codes){if(!c||typeof c.code!=='string'||!c.code.trim()||ids.has(c.code)||['name','class','severity'].some(k=>typeof c[k]!=='string'||!c[k].trim())||typeof c.originStation!=='string'||c.originStation&&!m.nodes.some(n=>n.id===c.originStation&&['operation','inspection','transport'].includes(n.type)))throw Error('Invalid quality code or origin station.');ids.add(c.code);}
 for(const n of m.nodes)if(n.quality){if(typeof n.quality!=='object'||Array.isArray(n.quality))throw Error('Invalid quality mapping.');for(const k of ['scrapCode','reworkCode','downtimeCode'])if(n.quality[k]!==undefined&&!ids.has(n.quality[k]))throw Error('Unknown quality code: '+n.quality[k]);}
 for(const e of m.edges){if(e.rework!==undefined&&typeof e.rework!=='boolean')throw Error('Rework must be boolean.');if(e.reasonCode!==undefined&&!ids.has(e.reasonCode))throw Error('Unknown route reason code.');}
}
export function createEventLog(enabled,model,settings,limit=500000){
 const events=[];
 const emit=(time,type,data={})=>{if(!enabled)return;if(events.length>=limit)throw Error('Complete event budget exceeded. Reduce replications/horizon/model; results were not silently truncated.');events.push({seq:events.length,time,type,...data});};
 if(enabled)emit(0,'run_start',{schema:1,timeUnit:'s',seed:settings.seed,horizon:settings.hours*3600,model:structuredClone(model),settings:{...settings}});
 return {events,emit};
}
const zeros=()=>Object.fromEntries(STATES.map(s=>[s,0]));
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b));

// Replays independently from DES counters. All failures are returned, never hidden.
export function inspectEventLog(events,expected){
 const errors=[];const check=(ok,message)=>{if(!ok&&errors.length<100)errors.push(message);};
 const header=events?.[0];if(header?.type!=='run_start'||!header.model)return{ok:false,errors:['Missing run_start snapshot.']};
 expected??=events.at(-1)?.result;
 const {model,settings,horizon}=header,params=n=>Object.fromEntries(Object.entries(n.params).map(([k,v])=>[k,n.bindings?.[k]?model.variables.find(x=>x.id===n.bindings[k])?.value:v]));
 const nodes=new Map(model.nodes.map(n=>[n.id,{...n,p:params(n)}]));
 const units=new Map(),used=new Map(),owners=new Map(),balances=new Map(),states=Object.create(null),lastEnd=Object.create(null),material=Object.create(null),operationCounts=Object.create(null),outputs=Object.create(null),quality={scrap:Object.create(null),rework:Object.create(null),downtime:Object.create(null)};
 let energy=0,resourceCost=0,operationCost=0,materialCost=0,lastTime=0;
 const leads=[],phaseOpen=new Map();let arrivals=0,good=0,scrap=0,wip=0,rework=0,unspecified=0,inTransit=0;const operationDetails=Object.create(null),resourceTime=Object.create(null);
 for(const n of nodes.values()){if(n.type==='material'){balances.set(n.id,n.p.stock);material[n.id]={initial:n.p.stock,consumed:0,produced:0,remaining:n.p.stock};}if(n.p.capacity!==undefined){states[n.id]=zeros();lastEnd[n.id]=0;if(['operation','inspection','transport'].includes(n.type))operationDetails[n.id]={queue:0,maxQueue:0,resourceWait:0,materialWait:0,calendarWait:0,phaseWaitSeconds:0};else resourceTime[n.id]=0;}}
 const addCode=(kind,code)=>{check(typeof code==='string'&&!!code,'Missing '+kind+' code');check(code==='UNSPECIFIED'||(model.qualityCodes||[]).some(c=>c.code===code),'Unknown code '+code);quality[kind][code]=(quality[kind][code]||0)+1;if(code==='UNSPECIFIED')unspecified++;};
 for(let i=0;i<events.length;i++){
  const e=events[i];check(e.seq===i&&Number.isFinite(e.time)&&e.time>=lastTime&&e.time<=horizon,'Invalid event sequence/time '+i);lastTime=e.time;
  if(e.type==='transfer')inTransit++;
  if(e.type==='delivery'){inTransit--;check(inTransit>=0,'Negative transit count');if(operationDetails[e.station])operationDetails[e.station].maxQueue=Math.max(operationDetails[e.station].maxQueue,e.queueSize);}
  if(e.type==='arrival'){check(!units.has(e.unit),'Duplicate unit '+e.unit);units.set(e.unit,{born:e.time,terminal:null});arrivals++;}
  if(['unit_good','scrap','unit_wip'].includes(e.type)){
   const u=units.get(e.unit);check(!!u&&!u.terminal,'Missing/duplicate terminal unit '+e.unit);
   if(u){u.terminal=e.type;if(e.type==='unit_good'){leads.push(e.time-u.born);good++;outputs[e.station]=(outputs[e.station]||0)+1;}else if(e.type==='scrap'){scrap++;addCode('scrap',e.code);}else wip++;}
  }
  if(e.type==='rework_route'){rework++;addCode('rework',e.code);check(units.has(e.unit),'Unknown rework unit');}
  if(e.type==='downtime_start')addCode('downtime',e.code);
  if(e.type==='downtime_end')check(typeof e.code==='string'&&!!e.code,'Missing downtime end code');
  if(e.type==='phase_start'){const key=e.station+':'+e.channel;check(!phaseOpen.has(key),'Overlapping phase '+key);phaseOpen.set(key,e);check(units.has(e.unit),'Unknown phase unit');}
  if(e.type==='phase_end'){const key=e.station+':'+e.channel;const p=phaseOpen.get(key);check(p?.unit===e.unit&&p?.phase===e.phase,'Unmatched phase end '+key);phaseOpen.delete(key);}
  if(e.type==='operation_end')operationCounts[e.station]=(operationCounts[e.station]||0)+1;
  if(e.type==='resource_reserve'||e.type==='resource_release'){
   const sign=e.type==='resource_reserve'?1:-1,n=nodes.get(e.resource),key=JSON.stringify([e.resource,e.station,e.channel,e.unit]);
   check(Number.isInteger(e.quantity)&&e.quantity>0&&!!n,'Invalid resource quantity');
   const next=(used.get(e.resource)||0)+sign*e.quantity,own=(owners.get(key)||0)+sign*e.quantity;
   check(own>=0,'Release without ownership '+key);owners.set(key,own);check(next>=0&&next<=n?.p.capacity,'Resource double-booking '+e.resource);used.set(e.resource,next);
  }
  if(e.type==='material_consume'||e.type==='material_produce'){
   const n=nodes.get(e.material),r=material[e.material];check(!!r&&Number.isInteger(e.quantity)&&e.quantity>0,'Invalid material event');
   if(r){const consume=e.type==='material_consume';r[consume?'consumed':'produced']+=e.quantity;r.remaining+=(consume?-1:1)*e.quantity;check(r.remaining>=0,'Negative material stock '+e.material);if(consume)materialCost+=e.quantity*n.p.unitCost;}
  }
  if(e.type==='state_interval'){
   const n=nodes.get(e.entity),capacity=n?.p.capacity;
   check(!!states[e.entity]&&near(e.time,lastEnd[e.entity])&&e.end>e.time&&e.end<=horizon,'State gap/overlap '+e.entity);
   check(Object.keys(e.counts).every(s=>STATES.includes(s))&&Object.values(e.counts).every(v=>Number.isFinite(v)&&v>=0)&&near(Object.values(e.counts).reduce((a,b)=>a+b,0),capacity),'Invalid state partition '+e.entity);
   if(states[e.entity]){const dt=e.end-e.time;for(const state of STATES)states[e.entity][state]+=dt*(e.counts[state]||0)/capacity;lastEnd[e.entity]=e.end;
    if(e.category==='operation'){const details=operationDetails[e.entity];details.queue+=dt*e.queue/horizon;details.resourceWait+=dt*(e.resourceWait?1:0);details.materialWait+=dt*(e.materialWait?1:0);details.calendarWait+=dt*(e.calendarWait?1:0);details.phaseWaitSeconds+=dt*e.heldWait;energy+=dt*(e.counts.busy||0)/3600*n.p.power;operationCost+=dt*((e.counts.busy||0)+(e.counts.down||0)+(e.heldWait||0))/3600*n.p.cost;}
    else{resourceTime[e.entity]+=dt*e.occupied;check(near(e.occupied,used.get(e.entity)||0),'Resource occupancy replay mismatch '+e.entity);resourceCost+=dt*e.occupied/3600*n.p.cost;}
   }
  }
 }
 for(const[id,u]of units)check(!!u.terminal,'Unit without terminal disposition '+id);
 for(const[id,s]of Object.entries(states)){check(near(lastEnd[id],horizon)&&near(Object.values(s).reduce((a,b)=>a+b,0),horizon),'State-time sum '+id);}
 check(events.at(-1)?.type==='run_end','Missing run_end');
 check(arrivals===good+scrap+wip,'Unit conservation');
 check(Object.values(quality.scrap).reduce((a,b)=>a+b,0)===scrap,'Scrap code counts');
 check(Object.values(quality.rework).reduce((a,b)=>a+b,0)===rework,'Rework code counts');
 leads.sort((a,b)=>a-b);
 const metrics={arrived:arrivals,good,scrap,wip,inTransit,throughput:good/settings.hours,leadMean:good?leads.reduce((a,b)=>a+b,0)/good:null,leadP95:good?leads[Math.min(good-1,Math.floor(.95*good))]:null,energy,materialCost,resourceCost,operationCost,totalCost:materialCost+resourceCost+operationCost};
 if(expected){for(const[k,v]of Object.entries(metrics))check(v===null?expected[k]===null:near(v,expected[k]),'KPI mismatch '+k);for(const r of expected.materials||[])for(const k of ['initial','consumed','produced','remaining'])check(near(r[k],material[r.id]?.[k]),'Material balance '+r.id+'/'+k);for(const o of expected.operations||[]){check(o.count===(operationCounts[o.id]||0),'Operation count '+o.id);const d=operationDetails[o.id];for(const k of ['queue','maxQueue','resourceWait','materialWait','calendarWait','phaseWaitSeconds'])check(near(o[k],d?.[k]),'Operation detail '+o.id+'/'+k);for(const k of ['busy','down','blocked'])check(near(o[k],states[o.id]?.[k]/horizon),'Operation state '+o.id+'/'+k);check(near(o.phaseWait,d.phaseWaitSeconds/(horizon*nodes.get(o.id).p.capacity)),'Phase wait '+o.id);check(near(o.idle,1-o.busy-o.down-o.blocked-o.phaseWait),'Idle residual '+o.id);}for(const r of expected.resources||[]){check(near(r.utilization,resourceTime[r.id]/(horizon*nodes.get(r.id).p.capacity)),'Resource utilization '+r.id);check(near(r.cost,resourceTime[r.id]/3600*nodes.get(r.id).p.cost),'Resource cost '+r.id);}for(const o of expected.outputs||[])check(o.good===(outputs[o.id]||0),'Output count '+o.id);}
 return {ok:errors.length===0,errors,metrics,states:Object.fromEntries(Object.entries(states)),material:Object.fromEntries(Object.entries(material)),quality:Object.fromEntries(Object.entries(quality).map(([k,v])=>[k,Object.fromEntries(Object.entries(v))])),rework,unspecified,warnings:unspecified?[`${unspecified} scrap/rework/downtime incidents use UNSPECIFIED; configure quality codes.`]:[],checks:['Resource capacity and ownership','Unit conservation and terminal uniqueness','Material balance and repeated consumption','State coverage and horizon sums','Defect/reason totals','Replayed KPI agreement']};
}
export function eventCSV(events){const cell=v=>{let s=typeof v==='object'?JSON.stringify(v):String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return [['seq','time_s','type','station','resource','unit','code','details'],...events.map(e=>[e.seq,e.time,e.type,e.station||e.entity,e.resource,e.unit,e.code,e])].map(row=>row.map(cell).join(',')).join('\r\n');}
