import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replicate} from '../dist/core/network.js';
import {migrate} from '../dist/core/model.js';
import {line} from './fixtures/audit-models.mjs';
import {setNativePhases} from '../dist/core/native-phases.js';

test('execution version preserves legacy contract and identifies native phase semantics',()=>{
 const m=line([60]);
 assert.equal(replicate(m).engineVersion,'0.5.0');
 assert.equal(replicate(migrate(m)).engineVersion,'0.5.0');
 setNativePhases(m.nodes.find(n=>n.id==='op0'),[{
  name:'Automatic',kind:'automatic',duration:{value:60,unit:'s',provenance:'ASSUMPTION',note:'Regression fixture'},
  distribution:{type:'constant',relativeHalfRange:0},inheritPeople:false,resources:[]
 }]);
 assert.equal(replicate(m).engineVersion,'0.6.0');
 assert.equal(replicate(migrate(m)).engineVersion,'0.6.0');
});

test('edited source files contain valid UTF-8 without common mojibake sequences',()=>{
 const paths=['core/model.js','core/network.js','core/phases.js','core/native-phases.js','studio.js',
  'features/diagrams/inspector.js','features/diagrams/phases.js','features/operator/view.js',
  'features/simulation/view.js','features/help/view.js'];
 for(const path of paths){
  const source=new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(new URL('../dist/'+path,import.meta.url)));
  assert.ok(!/[\u00c3\u00c4\u00c8\u00e2][\u0080-\u00bf\u0192\u017d\u203a\u2122\u20ac]/u.test(source),path);
  assert.ok(!source.includes('\ufffd'),path);
 }
});
