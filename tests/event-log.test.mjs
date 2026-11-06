import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulateNetwork,replicate} from '../dist/core/network.js';
import {inspectEventLog,eventCSV,validateQuality} from '../dist/core/event-log.js';
import {line,sharedOperator,finiteBuffer,rework,materialConsumption,section8,edge} from './fixtures/audit-models.mjs';
import {node,migrate} from '../dist/core/model.js';
import {setNativePhases} from '../dist/core/native-phases.js';
import {filterEvents,eventLogView} from '../dist/features/simulation/events.js';
const run=m=>simulateNetwork(m,m.settings,{audit:true});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

for(const[name,fixture]of Object.entries({deterministic:()=>line([60,90,45]),sharedOperator,finiteBuffer,rework,materialConsumption,section8})){
 test('ledger: all integrity checks and numeric compatibility on '+name,()=>{
  const m=fixture(),before=JSON.stringify(m),r=run(m),legacy=simulateNetwork(m);
  assert.ok(r.audit.integrity.ok,JSON.stringify(r.audit.integrity.errors));
  assert.deepEqual(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='audit')),legacy);
  assert.equal(JSON.stringify(m),before);
  assert.ok(inspectEventLog(JSON.parse(JSON.stringify(r.audit.events))).ok);
  for(const states of Object.values(r.audit.integrity.states))near(Object.values(states).reduce((a,b)=>a+b,0),m.settings.hours*3600);
 });
}
test('ledger: deliberate corruption of reservations, terminals, materials, states and codes fails',()=>{
 const m=materialConsumption();m.settings.hours=.02;m.nodes.push(node('person','Operator','person'));m.edges.push(edge('requires','op0','person'));m.nodes[1].params.scrap=1;
 const r=run(m);
 const edits=[
  log=>{log.find(e=>e.type==='resource_reserve').quantity=2;},
  log=>{log.find(e=>e.type==='scrap').unit='nonexistent';},
  log=>{log.find(e=>e.type==='material_consume').quantity=3;},
  log=>{log.find(e=>e.type==='state_interval').end+=1;},
  log=>{delete log.find(e=>e.type==='scrap').code;}
 ];
 for(const edit of edits){const log=structuredClone(r.audit.events);edit(log);assert.equal(inspectEventLog(log).ok,false);}
});
test('ledger: snapshot and seed reproduce identical log; stochastic seed changes it',()=>{
 const m=line([10],{limit:6,hours:.1});Object.assign(m.nodes[1].params,{variation:.3,mtbf:15,mttr:3});
 const a=run(m);assert.deepEqual(run(JSON.parse(JSON.stringify(m))).audit.events,a.audit.events);
 m.settings.seed++;const b=run(m);assert.notDeepEqual(b.audit.events,a.audit.events);
 assert.notDeepEqual(b.audit.events.filter(e=>e.type==='phase_end').map(e=>e.time),a.audit.events.filter(e=>e.type==='phase_end').map(e=>e.time));
});
test('ledger: scrap without codes produces counted UNSPECIFIED warning',()=>{
 const m=line([10],{limit:3,hours:.1});m.nodes[1].params.scrap=1;
 const r=run(m);assert.equal(r.scrap,3);assert.equal(r.audit.integrity.quality.scrap.UNSPECIFIED,3);assert.equal(r.audit.integrity.unspecified,3);assert.match(r.audit.integrity.warnings[0],/UNSPECIFIED/);
});
test('ledger: configured inspection rework, retest and repeated material consumption',()=>{
 const m=rework();m.nodes[1].type='inspection';m.qualityCodes=[{code:'RETEST',name:'Test anomaly',class:'defect',severity:'major',originStation:'op0'}];m.nodes[1].quality={reworkCode:'RETEST'};
 const mat=node('material','Consumable','kit');Object.assign(mat.params,{stock:100,unitCost:2});m.nodes.push(mat);m.edges.push(edge('consumes','op0','kit'));
 const r=run(m),events=r.audit.events;
 assert.equal(r.good,4);assert.equal(r.audit.integrity.rework,13);assert.equal(r.audit.integrity.quality.rework.RETEST,13);assert.equal(events.filter(e=>e.type==='retest').length,13);
 assert.equal(events.filter(e=>e.type==='inspection_result'&&e.result==='fail').length,13);assert.equal(events.filter(e=>e.type==='inspection_result'&&e.result==='pass').length,4);
 assert.equal(r.audit.integrity.material.kit.consumed,17);assert.equal(r.audit.integrity.unspecified,0);assert.deepEqual(migrate(m).qualityCodes,m.qualityCodes);
});
test('ledger: native phases, failure state, calendar and resource capacity accounting',()=>{
 const m=line([130],{limit:3,hours:.1});const op=m.nodes[1];
 m.nodes.push(node('machine','CNC','cnc'),node('person','Operator','person'));m.edges.push(edge('requires','op0','cnc'));
 setNativePhases(op,[['load',20,['person']],['automatic',100,[]],['unload',10,['person']]].map(([kind,value,ids])=>({name:kind,kind,duration:{value,unit:'s',provenance:'ASSUMPTION',note:'Test'},distribution:{type:'constant',relativeHalfRange:0},inheritPeople:false,resources:ids.map(resourceId=>({resourceId,quantity:1}))})));
 Object.assign(op.params,{mtbf:10,mttr:5});Object.assign(m.nodes.at(-1).params,{on:40,off:40});
 const r=run(m);assert.ok(r.audit.integrity.ok);assert.ok(r.audit.events.some(e=>e.type==='downtime_start'));assert.ok(r.audit.events.some(e=>e.type==='downtime_end'));assert.ok(r.audit.events.some(e=>e.type==='calendar_off'));
 assert.equal(r.audit.integrity.states.person.down,0);assert.ok(r.audit.integrity.states.cnc.down>0);
});
test('ledger: all replications retain independently inspectable logs and exports escape data',()=>{
 const m=line([20],{limit:4,hours:.1});m.settings.replications=2;const r=replicate(m);
 assert.equal(r.audits.length,2);assert.ok(r.audits.every(a=>inspectEventLog(a.events).ok));
 assert.match(eventLogView(r),/data-ledger-type/);assert.match(eventLogView(r),/State timeline/);
 assert.equal(filterEvents(r.audits[0].events,'arrival','unit-1').length,1);
 assert.match(eventCSV([{seq:0,time:0,type:'=malicious',code:'a"b'}]),/'=malicious/);assert.match(eventCSV([{code:'a"b'}]),/a""b/);
});
test('quality: invalid codes and mappings rejected; optional fields preserve old JSON',()=>{
 const m=line([10]);validateQuality(m);m.nodes[1].quality={scrapCode:'MISSING'};assert.throws(()=>validateQuality(m),/Unknown/);delete m.nodes[1].quality;
 m.qualityCodes=[{code:'X',name:'Fault',class:'defect',severity:'major',originStation:'missing'}];assert.throws(()=>validateQuality(m),/origin/);
});
test('ledger: a forward route after rework is not counted as another rework incident',()=>{
 const m=line([10,10],{limit:4,hours:.2});m.edges.push(edge('flow','op1','op0'));
 const r=run(m),returns=r.audit.events.filter(e=>e.type==='rework_route');
 assert.ok(returns.length>0);assert.ok(returns.every(e=>e.station==='op1'&&e.to==='op0'));
 assert.equal(r.good,4);assert.ok(r.audit.integrity.ok);
});
test('quality: codes that match object property names remain valid counted codes',()=>{
 const m=line([10],{limit:2,hours:.1});m.nodes[1].params.scrap=1;
 m.qualityCodes=[{code:'constructor',name:'Fault',class:'defect',severity:'major',originStation:'op0'}];m.nodes[1].quality={scrapCode:'constructor'};
 const r=run(m);assert.equal(r.audit.integrity.quality.scrap.constructor,2);assert.ok(r.audit.integrity.ok);
});
