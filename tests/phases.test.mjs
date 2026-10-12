import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyModel,node,validateModel,migrate} from '../dist/core/model.js';
import {simulateNetwork} from '../dist/core/network.js';
import {setPhaseDurations} from '../dist/core/phases.js';
import {renderInspector} from '../dist/features/diagrams/inspector.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fixture(rows=[20,100,10],seconds=150){
 const m=emptyModel();m.settings={hours:seconds/3600,seed:42,replications:1};
 const person=node('person','Operator','person');m.nodes.push(person);
 const edge=(type,from,to)=>m.edges.push({id:type+from+to,type,from,to,quantity:1,weight:1,delay:0});
 for(let i=0;i<2;i++){
  const s=node('source','Orders','s'+i),o=node('operation','CNC cycle '+i,'op'+i),machine=node('machine','CNC '+i,'m'+i),sink=node('sink','Output','k'+i);
  s.params.limit=1;
  setPhaseDurations(o,rows.map((seconds,j)=>({name:['Load','Auto','Unload'][j],kind:j===1?'automatic':'manual',seconds})),'Hand-calculated fixture');
  m.nodes.push(s,o,machine,sink);edge('flow',s.id,o.id);edge('flow',o.id,sink.id);edge('requires',o.id,machine.id);edge('staffedBy',machine.id,person.id);
 }
 return m;
}
test('two CNCs finish at 130/150s with one operator; human occupies exactly 60s',()=>{
 const m=fixture(),before=JSON.stringify(m),r=simulateNetwork(m);
 assert.equal(r.good,2);assert.equal(r.wip,0);near(r.resources.find(x=>x.id==='person').utilization,60/150);
 near(r.resources.find(x=>x.id==='m0').utilization,130/150);near(r.resources.find(x=>x.id==='m1').utilization,130/150);
 assert.equal(r.trace.find(x=>x.operation==='op0'&&x.phase==='Unload').end,130);
 assert.equal(r.trace.find(x=>x.operation==='op1'&&x.phase==='Unload').end,150);
 assert.ok(r.trace.filter(x=>x.kind==='automatic').every(x=>!x.resources.includes('person')));
 assert.equal(JSON.stringify(m),before);assert.deepEqual(simulateNetwork(m),r);
 for(const o of r.operations)near(o.busy+o.down+o.blocked+o.phaseWait+o.idle,1);
});
test('machine remains held while waiting 90 seconds for operator mid-cycle',()=>{
 const m=fixture([10,10,10],140);
 setPhaseDurations(m.nodes.find(n=>n.id==='op1'),[{name:'Long manual',kind:'manual',seconds:100},{name:'Auto',kind:'automatic',seconds:10}],'Fixture');
 const r=simulateNetwork(m),op=r.operations.find(x=>x.id==='op0');
 near(op.phaseWaitSeconds,90);near(r.resources.find(x=>x.id==='m0').utilization,120/140);
 const wait=r.trace.find(x=>x.operation==='op0'&&x.state==='phaseWait');
 assert.deepEqual(wait.resources,['m0']);near(wait.start,20);near(wait.end,110);
 const human=r.trace.filter(x=>x.resources.includes('person')).sort((a,b)=>a.start-b.start);
 for(let i=1;i<human.length;i++)assert.ok(human[i].start>=human[i-1].end);
});
test('legacy cycles keep whole-cycle operator reservation',()=>{
 const m=fixture();for(const n of m.nodes)delete n.phases;
 const r=simulateNetwork(m);assert.equal(r.good,1);near(r.resources.find(x=>x.id==='person').utilization,1);
});
test('phase-boundary calendar waits retain machine; ongoing automatic phase continues',()=>{
 const m=fixture([10,10,10],140);m.nodes=m.nodes.filter(n=>!['s1','op1','m1','k1'].includes(n.id));m.edges=m.edges.filter(e=>m.nodes.some(n=>n.id===e.from)&&m.nodes.some(n=>n.id===e.to));
 Object.assign(m.nodes[0].params,{on:15,off:85});
 const r=simulateNetwork(m);assert.equal(r.good,1);near(r.operations[0].phaseWaitSeconds,80);near(r.resources.find(x=>x.id==='m0').utilization,110/140);
});
test('failures, horizon truncation and rework conserve jobs and resource occupation',()=>{
 const m=fixture([20,100,10],80);m.nodes.find(n=>n.id==='op0').params.mtbf=12;m.nodes.find(n=>n.id==='op0').params.mttr=6;
 const r=simulateNetwork(m);assert.equal(r.arrived,r.good+r.scrap+r.wip);assert.equal(r.wip,2);
 for(const resource of r.resources){assert.ok(resource.utilization>=0&&resource.utilization<=1);const time=r.trace.filter(x=>x.resources.includes(resource.id)).reduce((s,x)=>s+x.end-x.start,0);near(time/80,resource.utilization)}
});
test('phase profile survives JSON migration and variable scales total cycle',()=>{
 const m=fixture();m.variables.push({id:'v',name:'Cycle',unit:'s',value:260});m.nodes.find(n=>n.id==='op0').bindings.cycle='v';
 const restored=migrate(JSON.parse(JSON.stringify(m)));validateModel(restored);assert.equal(simulateNetwork(restored).outputs.find(x=>x.id==='k0').good,0);
 const invalid=structuredClone(m);invalid.nodes.find(n=>n.id==='op0').phases[0].fraction=.9;assert.throws(()=>validateModel(invalid),/proporțiile/);
 invalid.nodes.find(n=>n.id==='op0').phases=[];assert.throws(()=>validateModel(invalid),/1–20/);
 const op=m.nodes.find(n=>n.id==='op0');assert.throws(()=>setPhaseDurations(op,[{name:'X',kind:'manual',seconds:0}],'bad'),/pozitive/);
});
test('phase inspector escapes names and exposes edit/reset actions',()=>{
 const m=fixture();m.nodes.find(n=>n.id==='op0').phases[0].name='<img onerror=alert(1)>';
 const view=renderInspector({m,selected:'op0'});assert.ok(view.includes('data-action="edit-phases"'));assert.ok(view.includes('data-action="clear-phases"'));assert.ok(!view.includes('<img'));assert.ok(view.includes('&lt;img'));
});
