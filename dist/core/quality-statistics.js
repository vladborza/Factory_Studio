// Observation window clips accounting intervals; dynamics and random draws never reset.
export function windowKPIs(result,model){
 const start=model.settings.warmupSeconds||0,end=model.settings.hours*3600,duration=end-start;
 const events=result.audit.events,byId=new Map(model.nodes.map(n=>[n.id,n]));
 const parameter=(n,k)=>n.bindings?.[k]?model.variables.find(v=>v.id===n.bindings[k]).value:n.params[k];
 const units=new Map(),attempts=new Map(),firstAttempts=new Map(),resources={},operations={};
 let good=0,scrap=0,energy=0,materialCost=0,resourceCost=0,operationCost=0,reworkLoad=0,reworkEvents=0,firstCount=0,firstPass=0,cleanGood=0;
 const leads=[];
 for(const e of events){
  if(e.type==='arrival')units.set(e.unit,{born:e.time,reworked:false});
  if(e.type==='phase_start'&&e.phase===0){const key=JSON.stringify([e.station,e.unit]);attempts.set(key,(attempts.get(key)||0)+1);}
  if(e.type==='operation_end'){const key=JSON.stringify([e.station,e.unit]);if(!firstAttempts.has(key)){firstAttempts.set(key,{eligible:e.time>=start,failed:false});if(e.time>=start)firstCount++;}}
  if(e.type==='rework_route'){units.get(e.unit).reworked=true;if(e.time>=start)reworkEvents++;}
  if(e.type==='rework_route'||e.type==='scrap'){const key=JSON.stringify([e.station,e.unit]),a=firstAttempts.get(key);if(a&&!a.failed&&attempts.get(key)===1){a.failed=true;}}
  if(e.time>=start&&e.type==='unit_good'){good++;leads.push(e.time-units.get(e.unit).born);if(!units.get(e.unit).reworked)cleanGood++;}
  if(e.time>=start&&e.type==='scrap')scrap++;
  if(e.time>=start&&e.type==='material_consume')materialCost+=e.quantity*parameter(byId.get(e.material),'unitCost');
  if(e.type==='state_interval'){
   const dt=Math.max(0,e.end-Math.max(start,e.time));if(!dt)continue;
   const n=byId.get(e.entity),capacity=parameter(n,'capacity');
   if(e.category==='resource'){resources[e.entity]=(resources[e.entity]||0)+dt*e.occupied/(duration*capacity);resourceCost+=dt*e.occupied/3600*parameter(n,'cost');}
   else{operations[e.entity]=(operations[e.entity]||0)+dt*(e.counts.busy||0)/(duration*capacity);energy+=dt*(e.counts.busy||0)/3600*parameter(n,'power');operationCost+=dt*((e.counts.busy||0)+(e.counts.down||0)+(e.heldWait||0))/3600*parameter(n,'cost');}
  }
 }
 for(const a of firstAttempts.values())if(a.eligible&&!a.failed)firstPass++;
 // Reprocessing load is actual busy seconds on second/subsequent visits, not routing counts.
 const visit=new Map(),active=new Map();
 for(const e of events){const channel=JSON.stringify([e.station,e.channel]);
  if(e.type==='phase_start'){if(e.phase===0){const key=JSON.stringify([e.station,e.unit]);visit.set(key,(visit.get(key)||0)+1);}active.set(channel,{at:e.time,unit:e.unit,repeat:(visit.get(JSON.stringify([e.station,e.unit]))||0)>1,busy:true});}
  if(['phase_end','failure','repair'].includes(e.type)){const a=active.get(channel);if(a?.repeat&&a.busy)reworkLoad+=Math.max(0,e.time-Math.max(start,a.at));if(a){a.at=e.time;a.busy=e.type==='repair';if(e.type==='phase_end')active.delete(channel);}}
 }
 for(const a of active.values())if(a.repeat&&a.busy)reworkLoad+=Math.max(0,end-Math.max(start,a.at));
 const totalCost=materialCost+resourceCost+operationCost,terminal=good+scrap;
 return{metrics:{good,scrap,wip:result.wip,throughput:good/(duration/3600),leadMean:good?leads.reduce((a,b)=>a+b,0)/good:null,energy,materialCost,resourceCost,operationCost,totalCost,costPerGood:good?totalCost/good:null,firstPassYield:firstCount?firstPass/firstCount:null,rolledThroughputYield:terminal?cleanGood/terminal:null,reworkLoad,reworkEvents,scrapRate:terminal?scrap/terminal:null},resources,operations,denominators:{firstAttempts:firstCount,terminalUnits:terminal,completedUnits:good,unfinishedWip:result.wip},window:{start,end,duration}};
}
