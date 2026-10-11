import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyModel,node,validateModel,migrate} from '../dist/model.js';
import {expandedNeeds,modelAudit,DIAGRAMS} from '../dist/mbse.js';
import {CATALOG,instantiate,createCell} from '../dist/catalog.js';
import {simulateNetwork} from '../dist/network.js';
import {renderEngineeringDiagram} from '../dist/diagram-renderer.js';
const edge=(type,from,to,q=1)=>({id:crypto.randomUUID(),type,from,to,quantity:q,weight:1,delay:0});
test('every industrial template is independently valid and cell templates simulate',()=>{
 for(const t of CATALOG){const m=emptyModel(),a=instantiate(t),b=instantiate(t);m.nodes.push(a,b);assert.notEqual(a.id,b.id);validateModel(m);a.attributes.push({name:'local',value:'1',unit:''});assert.notDeepEqual(a.attributes,b.attributes);
 if(['machine','robot'].includes(t.type)){const cell=emptyModel();createCell(cell,cell.diagrams[0],t);validateModel(cell,{simulation:true});assert.ok(simulateNetwork(cell).good>0,t.id);}}
});
test('two independent machines compete for one inherited operator; capacity change doubles output',()=>{
 const m=emptyModel();m.settings.hours=1;const person=node('person','Shared operator');m.nodes.push(person);
 for(let i=0;i<2;i++){const s=node('source','S'+i),o=node('operation','Op'+i),k=node('sink','K'+i),machine=node('machine','M'+i);s.params.interval=1;m.nodes.push(s,o,k,machine);m.edges.push(edge('flow',s.id,o.id),edge('flow',o.id,k.id),edge('requires',o.id,machine.id),edge('staffedBy',machine.id,person.id));}
 const a=simulateNetwork(m);assert.equal(a.good,60);assert.equal(a.resources.find(r=>r.id===person.id).utilization,1);person.params.capacity=2;assert.equal(simulateNetwork(m).good,120);
});
test('staffing quantities multiply by machines needed and add direct demand; invalid capacity rejected',()=>{
 const m=emptyModel();createCell(m,m.diagrams[0],CATALOG[0]);const op=m.nodes.find(n=>n.type==='operation'),machine=m.nodes.find(n=>n.type==='machine'),person=m.nodes.find(n=>n.type==='person');machine.params.capacity=2;person.params.capacity=4;m.edges.find(e=>e.type==='requires').quantity=2;m.edges.find(e=>e.type==='staffedBy').quantity=2;assert.equal(expandedNeeds(m,op).get(person.id),4);validateModel(m,{simulation:true});person.params.capacity=3;assert.throws(()=>validateModel(m,{simulation:true}),/capacitatea/);m.edges.push(edge('requires',op.id,person.id));assert.equal(expandedNeeds(m,op).get(person.id),5);
});
function portsModel(){const m=emptyModel(),a=node('block','Controller'),b=node('block','Actuator'),iface=node('interfaceBlock','Command interface');m.nodes.push(a,b,iface);a.ports.push({id:'a-port',name:'command',direction:'out',kind:'proxy',payload:'Command',typeRef:iface.id});b.ports.push({id:'b-port',name:'command',direction:'in',kind:'proxy',payload:'Command',typeRef:iface.id});m.edges.push({...edge('itemFlow',a.id,b.id),fromPort:'a-port',toPort:'b-port'});m.diagrams[0]={id:'ibd',kind:'ibd',name:'IBD',items:[{nodeId:a.id,x:40,y:40},{nodeId:b.id,x:400,y:40}]};return m}
test('port connections validate directions, payload, interface identity and dangling references',()=>{
 const m=portsModel();validateModel(m);const port=m.nodes[1].ports[0];port.direction='out';assert.throws(()=>validateModel(m),/Direcție/);port.direction='in';port.payload='Other';assert.throws(()=>validateModel(m),/flux incompatibile/);port.payload='Command';port.typeRef=m.nodes[0].id;assert.throws(()=>validateModel(m),/Interface/);port.typeRef=m.nodes[2].id;m.nodes[1].ports=[];assert.throws(()=>validateModel(m),/port lipsă/);
});
test('requirements audit and verify reject non-test origin',()=>{const m=emptyModel(),r=node('requirement','Rate'),t=node('testCase','Measure rate'),b=node('block','Machine');m.nodes.push(r,t,b);assert.equal(modelAudit(m).length,2);m.edges.push(edge('verify',t.id,r.id),edge('satisfies',b.id,r.id));validateModel(m);assert.equal(modelAudit(m).length,0);m.edges[0].from=b.id;assert.throws(()=>validateModel(m),/verify/)});
test('v2 migration adds engineering metadata without changing existing IDs or fields',()=>{const old=emptyModel();old.nodes.push(node('machine','Mill','mill'));delete old.nodes[0].ports;delete old.library;const next=migrate(old);assert.equal(next.nodes[0].id,'mill');assert.deepEqual(next.nodes[0].ports,[]);assert.deepEqual(next.library,[]);assert.equal(old.library,undefined);validateModel(next)});
test('renderer escapes user content, includes ports and relation hit targets in every supported view',()=>{const m=portsModel();m.nodes[0].name='<script>alert(1)</script>';m.edges[0].label='<img src=x>';const svg=renderEngineeringDiagram(m,m.diagrams[0]);assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('<img'));assert.match(svg,/data-port="a-port"/);assert.match(svg,/data-edge=/);for(const [kind,spec]of Object.entries(DIAGRAMS)){if(spec.status==='planned')continue;const d={...m.diagrams[0],kind};assert.match(renderEngineeringDiagram(m,d),/<svg/);}});
