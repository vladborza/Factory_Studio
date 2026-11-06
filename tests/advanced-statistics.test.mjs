import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe,tCritical,difference} from '../dist/core/inference.js';
import {replicate,simulateNetwork} from '../dist/core/network.js';
import {validateModel,node} from '../dist/core/model.js';
import {line,rework,edge} from './fixtures/audit-models.mjs';
import {createExperiment,compareReplay,validateExperiment} from '../dist/core/experiments.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('inference: Student quantiles, configurable confidence and shrinkage',()=>{
 near(tCritical(.95,1),12.706204736,1e-7);near(tCritical(.95,10),2.228138852,1e-7);near(tCritical(.99,30),2.749995654,1e-7);
 const short=describe([9,11,9,11]),long=describe(Array.from({length:40},(_,i)=>i%2?11:9));
 assert.ok(long.confidence.halfWidth<short.confidence.halfWidth);near(long.mean,10);
 assert.ok(describe([9,11,9,11],.99).confidence.halfWidth>short.confidence.halfWidth);
 assert.equal(describe([null,2]).std,null);assert.equal(describe([null,2]).missing,1);
 assert.ok(difference(short,long).lower<0);
});
test('inference: known uniform processing mean is recovered by simulation CI',()=>{
 const m=line([60],{limit:1,hours:.05});m.nodes[1].params.variation=.2;Object.assign(m.settings,{replications:50,confidence:.999});
 const r=replicate(m),ci=r.summary.leadMean.confidence;
 assert.ok(ci.lower<=60&&ci.upper>=60,JSON.stringify(ci));assert.equal(r.summary.leadMean.n,50);
});
test('quality: known Bernoulli yield lies inside CI across independent replications',()=>{
 const m=line([.1],{limit:64,hours:.03});m.nodes[1].params.scrap=.2;Object.assign(m.settings,{replications:20,confidence:.999});
 const r=replicate(m);
 for(const k of ['firstPassYield','rolledThroughputYield']){const ci=r.summary[k].confidence;assert.ok(ci.lower<=.8&&ci.upper>=.8,JSON.stringify(ci));}
 const ci=r.summary.scrapRate.confidence;assert.ok(ci.lower<=.2&&ci.upper>=.2);
 assert.ok(r.denominators.every(d=>d.terminalUnits===64));
});
test('quality: rework busy seconds and yield denominators have independent hand checks',()=>{
 const m=rework();const r=replicate(m);assert.equal(r.runs[0].reworkEvents,13);near(r.runs[0].reworkLoad,130);
 assert.equal(r.denominators[0].firstAttempts,4);assert.equal(r.denominators[0].terminalUnits,4);
 assert.ok(r.runs[0].firstPassYield<1);assert.ok(r.runs[0].rolledThroughputYield<1);
});
test('warm-up: opt-in clips accounting, retains full completed lead age and final unfinished WIP',()=>{
 const m=line([10],{interval:10,hours:.02});const normal=replicate(m);assert.equal(normal.runs[0].good,7);assert.equal(normal.warnings.length,0);
 m.settings.warmupSeconds=25;const r=replicate(m);assert.equal(r.runs[0].good,5);near(r.runs[0].throughput,5/(47/3600));near(r.runs[0].leadMean,10);assert.equal(r.runs[0].wip,1);assert.ok(r.warnings[0].includes('Warm-up'));
 m.settings.warmupSeconds=72;assert.throws(()=>validateModel(m),/Warm-up/);
});
test('all entity utilization and cost-per-good use every replication; zero output is missing',()=>{
 const m=line([10],{limit:4,hours:.02});m.nodes[1].params.variation=.5;m.nodes.push(node('person','Operator','person'));m.nodes.at(-1).params.cost=12;m.edges.push(edge('requires','op0','person'));m.settings.replications=5;
 const r=replicate(m),values=r.audits.map(a=>a.integrity.metrics.resourceCost/(12*m.settings.hours));
 near(r.utilization.resources.person.mean,values.reduce((a,b)=>a+b,0)/5);assert.equal(r.utilization.resources.person.n,5);assert.equal(r.summary.costPerGood.n,5);
 m.nodes[1].params.scrap=1;const zero=replicate(m);assert.equal(zero.summary.costPerGood.n,0);assert.equal(zero.summary.costPerGood.missing,5);assert.equal(zero.summary.costPerGood.mean,null);
});
test('CRN: stable streams preserve unaffected operation duration draws across model edits',()=>{
 const m=line([30],{limit:3,hours:.1});m.settings.crn=true;m.nodes[1].params.variation=.2;
 const a=simulateNetwork(m,m.settings,{audit:true});const other=structuredClone(m);other.nodes[1].params.scrap=.5;
 const b=simulateNetwork(other,other.settings,{audit:true});
 const durations=r=>r.audit.events.filter(e=>e.type==='phase_end').map(e=>e.time-r.audit.events.find(s=>s.type==='phase_start'&&s.unit===e.unit&&s.station===e.station).time);
 assert.deepEqual(durations(a),durations(b));assert.deepEqual(a.audit.events,simulateNetwork(m,m.settings,{audit:true}).audit.events);
});
test('experiment: persisted JSON reload and rerun preserve deterministic results byte-for-byte',()=>{
 const m=line([20],{limit:3,hours:.1});Object.assign(m.settings,{replications:3,crn:true,confidence:.9});m.nodes[1].params.variation=.3;
 const result=replicate(m),e=createExperiment(m,result,{id:'fixture',timestamp:'2026-10-13T00:00:00.000Z'});
 const dir=mkdtempSync(join(tmpdir(),'factory-experiment-'));
 try{const file=join(dir,'experiment.json');writeFileSync(file,JSON.stringify(e));const loaded=validateExperiment(JSON.parse(readFileSync(file,'utf8')));assert.ok(compareReplay(loaded,replicate(loaded.model)).identical);assert.deepEqual(loaded.seeds,result.seeds);assert.equal(loaded.timestamp,e.timestamp);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test('limits: 50 replications allowed, 51 rejected and unsupported settings fail',()=>{
 const m=line([10],{limit:1,hours:.01});m.settings.replications=50;validateModel(m);m.settings.replications=51;assert.throws(()=>validateModel(m));m.settings.replications=1;m.settings.confidence=1;assert.throws(()=>validateModel(m),/Confidence/);
});
test('JSON ledger public dictionaries preserve strict equality across transport',()=>{
 const m=line([10],{limit:2,hours:.01}),r=replicate(m);assert.deepEqual(JSON.parse(JSON.stringify(r)),r);
});
