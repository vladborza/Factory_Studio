import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {example,validateModel} from '../dist/core/model.js';
import {replicate} from '../dist/core/network.js';
import {CATALOG,instantiate} from '../dist/features/library/catalog.js';
import {createConnection} from '../dist/features/diagrams/connections.js';
import {createModelServer} from '../services/models/server.mjs';
import {createSimulationServer} from '../services/simulation/server.mjs';
import {createCatalogServer} from '../services/catalog/server.mjs';
import {createServer} from '../services/gateway.mjs';
const listen=async server=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port};
const close=server=>new Promise(r=>server.close(r));

test('commercial specifications retain original values and isolated editable instances',()=>{
 const templates=CATALOG.filter(t=>t.commercial);assert.equal(templates.length,15);
 for(const t of templates){const a=instantiate(t),b=instantiate(t);assert.ok(a.specs.length);const original=a.specs[0].referenceValue;a.specs[0].value+=1;assert.equal(b.specs[0].value,original);assert.equal(a.specs[0].referenceValue,original);assert.match(a.specs[0].source,/^https:\/\//);assert.ok(Object.values(a.calibration).every(p=>p.status!=='manufacturer'));}
});
test('direct connections validate endpoints, prevent duplicates and leave rejected models untouched',()=>{
 const m=example(),before=m.edges.length;
 assert.throws(()=>createConnection(m,{type:'flow',from:'src',to:'prep'}),/există deja/);
 assert.throws(()=>createConnection(m,{type:'flow',from:'src',to:'plc'}));
 assert.equal(m.edges.length,before);
 const e=createConnection(m,{type:'requires',from:'build',to:'plc'});m.edges.push(e);validateModel(m);
});
test('measurement imports reject invalid samples and forged means',()=>{
 const m=example();m.observations=[{operation:'prep',samples:[58,62],mean:60,count:2,note:'QA',at:new Date().toISOString()}];validateModel(m);
 m.observations[0].mean=50;assert.throws(()=>validateModel(m),/Măsurare/);
 m.observations='bad';assert.throws(()=>validateModel(m),/Istoric/);
});
test('Docker APIs integrate catalog, deterministic simulation and persistent revision-safe models',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'factory-v04-'));
 const catalog=createCatalogServer(),simulation=createSimulationServer();let models=createModelServer({directory});let gateway;
 try{
 const urls={catalog:await listen(catalog),simulation:await listen(simulation),models:await listen(models)};
 gateway=createServer({services:urls});const base=await listen(gateway),m=example();m.settings.hours=.1;m.settings.replications=1;
 const json={headers:{'Content-Type':'application/json'}};
 assert.equal((await (await fetch(base+'/api/config')).json()).mode,'docker');
 assert.equal((await (await fetch(base+'/api/catalog')).json()).items.length,CATALOG.length);
 const run=await fetch(base+'/api/simulations',{...json,method:'POST',body:JSON.stringify({model:m})});assert.equal(run.status,200);const actual=(await run.json()).result,expected=replicate(m);delete actual.at;delete expected.at;assert.deepEqual(actual,expected);
 const put=(revision)=>fetch(base+'/api/models/qa',{...json,method:'PUT',body:JSON.stringify({model:m,expectedRevision:revision})});
 assert.equal((await put(0)).status,200);
 const simultaneous=await Promise.all([put(1),put(1)]);assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
 assert.equal((await (await fetch(base+'/api/models/qa')).json()).revision,2);
 assert.equal((await (await fetch(base+'/api/models')).json()).items.length,1);
 const bad=await fetch(base+'/api/simulations',{...json,method:'POST',body:'{'});assert.equal(bad.status,400);
 assert.equal((await fetch(base+'/api/models/qa',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/models/qa',{method:'PUT',body:'{}'})).status,415);
 await close(models);models=createModelServer({directory});const restart=await listen(models);assert.equal((await (await fetch(restart+'/api/models/qa')).json()).revision,2);
 }finally{await Promise.all([catalog,simulation,models,gateway].filter(Boolean).map(close));await rm(directory,{recursive:true,force:true})}
});
