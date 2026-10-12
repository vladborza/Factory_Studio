import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../dist/core/statistics.js';
import {replicate} from '../dist/core/network.js';
import {example} from '../dist/core/model.js';
import {scenariosView} from '../dist/features/scenarios/view.js';
test('sample statistics match hand calculation and exclude missing observations',()=>{
 const s=summarize([1,2,3,null]);assert.equal(s.n,3);assert.equal(s.mean,2);assert.equal(s.min,1);assert.equal(s.max,3);assert.ok(Math.abs(s.ci95-4.303/Math.sqrt(3))<1e-10);
 assert.equal(summarize([7]).ci95,null);assert.deepEqual(summarize([null]),{n:0,mean:null,ci95:null,min:null,max:null});
});
test('every replication contributes to WIP, energy and cost; summary survives JSON export',()=>{
 const m=example();m.settings.hours=.1;m.settings.replications=3;m.nodes.find(n=>n.id==='test').params.variation=.8;
 const r=replicate(m);assert.equal(r.engineVersion,'0.5.0');
 for(const key of ['wip','energy','totalCost','throughput'])assert.equal(r.summary[key].mean,r.runs.reduce((sum,run)=>sum+run[key],0)/3);
 assert.deepEqual(JSON.parse(JSON.stringify(r)).summary,r.summary);
 const view=scenariosView({m,result:r,baseline:{model:m,result:r}});assert.ok(view.includes('WIP mediu'));assert.ok(!view.includes('WIP (replicarea 1)'));
});
