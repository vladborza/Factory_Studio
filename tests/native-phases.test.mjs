import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyModel,node,migrate,validateModel} from '../dist/core/model.js';
import {simulateNetwork} from '../dist/core/network.js';
import {setNativePhases,samplePhaseSeconds,demandWarnings} from '../dist/core/native-phases.js';
import {renderInspector} from '../dist/features/diagrams/inspector.js';
import {phaseRow} from '../dist/features/diagrams/phases.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const edge=(type,from,to)=>({id:`${type}-${from}-${to}`,type,from,to,quantity:1,weight:1,delay:0});
const phase=(kind,seconds,resources=[])=>({name:kind,kind,duration:{value:seconds,unit:'s',provenance:'ASSUMPTION',note:'Independent reference schedule'},distribution:{type:'constant',relativeHalfRange:0},inheritPeople:false,resources:resources.map(resourceId=>({resourceId,quantity:1}))});
function cnc(count=2,horizon=150){
 const m=emptyModel();m.settings={hours:horizon/3600,seed:42,replications:1};m.nodes.push(node('person','Operator','person'));
 for(let i=0;i<count;i++){
  const source=node('source','Orders','s'+i),op=node('operation','CNC','op'+i),machine=node('machine','Machine','m'+i),sink=node('sink','Product','k'+i);
  source.params.limit=1;setNativePhases(op,[phase('load',20,['person']),phase('automatic',100),phase('unload',10,['person'])]);
  m.nodes.push(source,op,machine,sink);m.edges.push(edge('flow',source.id,op.id),edge('flow',op.id,sink.id),edge('requires',op.id,machine.id));
 }
 return m;
}
function noDoubleBooking(r,m){
 assert.equal(r.traceTruncated,false);
 for(const resource of m.nodes.filter(n=>n.params.capacity)){
  const intervals=r.trace.filter(x=>x.resourceQuantities?.[resource.id]);
  const events=intervals.flatMap(x=>[{t:x.start,q:x.resourceQuantities[resource.id]},{t:x.end,q:-x.resourceQuantities[resource.id]}]).sort((a,b)=>a.t-b.t||a.q-b.q);
  let used=0;for(const e of events){used+=e.q;assert.ok(used>=0&&used<=resource.params.capacity,resource.id+' capacity violation');}assert.equal(used,0);
 }
}
test('native: CNC demand is 30 operator seconds and 130 machine seconds',()=>{
 const m=cnc(1,130),r=simulateNetwork(m);assert.equal(r.good,1);
 near(r.resources.find(x=>x.id==='person').utilization*130,30);
 near(r.resources.find(x=>x.id==='m0').utilization*130,130);
 assert.deepEqual(r.trace.filter(x=>x.state==='busy').map(x=>[x.kind,x.start,x.end]),[['load',0,20],['automatic',20,120],['unload',120,130]]);
 noDoubleBooking(r,m);
});
test('native: two CNCs match independent schedule, exact operator intervals and no double booking',()=>{
 const m=cnc(),r=simulateNetwork(m);
 // Hand schedule: L0 0–20, L1 20–40, A0 20–120, A1 40–140,
 // U0 120–130, U1 140–150. No scheduling algorithm used as oracle.
 assert.equal(r.good,2);assert.equal(r.wip,0);
 assert.deepEqual(r.trace.filter(x=>x.resources.includes('person')).map(x=>[x.operation,x.start,x.end]),[['op0',0,20],['op1',20,40],['op0',120,130],['op1',140,150]]);
 near(r.resources.find(x=>x.id==='person').utilization,60/150);noDoubleBooking(r,m);
});
test('native: automatic repair retains machine but no operator; trace accounts for usage',()=>{
 const m=cnc(2,200);for(const n of m.nodes.filter(n=>n.type==='operation'))Object.assign(n.params,{mtbf:5,mttr:10});
 const r=simulateNetwork(m),repairs=r.trace.filter(x=>x.state==='down');assert.ok(repairs.length>0);
 for(const x of repairs){assert.equal(x.kind,'automatic');assert.ok(!x.resources.includes('person'));assert.ok(x.resources.includes(x.operation==='op0'?'m0':'m1'));}
 for(const resource of r.resources)near(resource.utilization*200,r.trace.reduce((s,x)=>s+(x.resourceQuantities?.[resource.id]||0)*(x.end-x.start),0));
 assert.equal(r.arrived,r.good+r.scrap+r.wip);noDoubleBooking(r,m);
});
test('native: phase waits hold machine, acquire all transient resources together',()=>{
 const m=cnc(2,200);const ops=m.nodes.filter(n=>n.type==='operation');
 setNativePhases(ops[0],[phase('load',10,['person']),phase('automatic',10),phase('unload',10,['person'])]);
 setNativePhases(ops[1],[phase('inspect',100,['person']),phase('wait',10)]);
 const r=simulateNetwork(m);near(r.operations.find(x=>x.id==='op0').phaseWaitSeconds,90);
 const wait=r.trace.find(x=>x.operation==='op0'&&x.state==='phaseWait');assert.deepEqual(wait.resources,['m0']);near(wait.start,20);near(wait.end,110);noDoubleBooking(r,m);
});
test('native: constant/uniform phase distributions and provenance validation',()=>{
 const p=phase('walk/transfer',20);assert.equal(samplePhaseSeconds(p,()=>{throw Error('constant must not draw');}),20);
 p.distribution={type:'uniform',relativeHalfRange:.25};assert.equal(samplePhaseSeconds(p,()=>0),15);assert.equal(samplePhaseSeconds(p,()=>.5),20);assert.equal(samplePhaseSeconds(p,()=>1),25);
 const m=cnc(1);setNativePhases(m.nodes.find(n=>n.id==='op0'),[p]);assert.deepEqual(simulateNetwork(m),simulateNetwork(m));
 p.duration.provenance='UNKNOWN';assert.throws(()=>setNativePhases(m.nodes.find(n=>n.id==='op0'),[p]),/proveniență/);
});
test('native: deadlock partition, dangling references, automatic operator and capacity rejected',()=>{
 const m=cnc();const op=m.nodes.find(n=>n.id==='op0');op.phases[0].resources=[{resourceId:'m1',quantity:1}];assert.throws(()=>validateModel(m),/anti-deadlock/);
 op.phases[0].resources=[{resourceId:'missing',quantity:1}];assert.throws(()=>validateModel(m),/lipsă/);
 op.phases[0].resources=[{resourceId:'person',quantity:2}];assert.throws(()=>validateModel(m),/capacitatea/);
 op.phases[0].resources=[];op.phases[1].resources=[{resourceId:'person',quantity:1}];assert.throws(()=>validateModel(m),/automatic/);
});
test('native: direct plus inherited demand warning is explicit in inspector',()=>{
 const m=cnc(1);m.nodes[0].params.capacity=3;m.edges.push(edge('requires','op0','person'),edge('staffedBy','m0','person'));
 const op=m.nodes.find(n=>n.id==='op0');op.phases[0].inheritPeople=true;
 assert.ok(demandWarnings(m,op).some(x=>x.includes('directă + moștenită')));
 assert.ok(renderInspector({m,selected:'op0'}).includes('dublă contabilizare'));
});
test('migration: frozen pre-change outputs remain identical, migration versioned and idempotent',()=>{
 const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-phase-baseline.json',import.meta.url),'utf8'));
 for(const {model,result} of cases){
  assert.deepEqual(simulateNetwork(model),result);
  const migrated=migrate(model);assert.deepEqual(migrate(migrated),migrated);
  assert.ok(migrated.nodes.filter(n=>['operation','inspection','transport'].includes(n.type)).every(n=>n.phaseVersion===1&&n.phases.length===1));
  assert.deepEqual(simulateNetwork(migrated),result);
 }
});
test('native: JSON roundtrip preserves phases; editor exposes types, resources and provenance safely',()=>{
 const m=cnc(),op=m.nodes.find(n=>n.id==='op0');op.phases[0].name='<img onerror=alert(1)>';
 const restored=migrate(JSON.parse(JSON.stringify(m)));assert.deepEqual(simulateNetwork(restored),simulateNetwork(m));
 const html=phaseRow(op.phases[0],0,m.nodes);assert.ok(html.includes('walk/transfer'));assert.ok(html.includes('phase-resource-0-person'));assert.ok(html.includes('MEASURED'));assert.ok(html.includes('data-phase-down'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
});
