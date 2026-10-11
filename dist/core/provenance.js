import {fields,PROCESS,POOLS} from './model.js';
export function calibrationIssues(m){return m.nodes.flatMap(n=>Object.entries(n.calibration||{}).filter(([,v])=>v.status==='required').map(([key])=>({id:n.id,key,text:n.name+': '+key+' necesită date de proces'})))}
export function initializeProvenance(n){n.specs??=[];n.calibration??={};for(const key of fields(n.type)){if(!n.calibration[key])n.calibration[key]={status:['capacity','speed','latency','on','off','limit','stock','buffer'].includes(key)?'assumption':'required',note:'Configurație de model; nu specificație de producător.'}}return n}
export function validateProvenance(m){
 if(m.observations!==undefined){
  if(!Array.isArray(m.observations)||m.observations.length>1000)throw Error('Istoric de măsurători invalid.');
  for(const o of m.observations){
   if(!o||typeof o.operation!=='string'||typeof o.note!=='string'||o.note.length>10000||!Number.isFinite(Date.parse(o.at))||!Array.isArray(o.samples)||!o.samples.length||o.samples.length>1000||o.count!==o.samples.length||o.samples.some(v=>!Number.isFinite(v)||v<=0||v>86400)||!Number.isFinite(o.mean)||Math.abs(o.mean-o.samples.reduce((a,b)=>a+b,0)/o.samples.length)>1e-8)throw Error('Măsurare invalidă.');
  }
 }
for(const n of m.nodes){if(n.specs!==undefined){if(!Array.isArray(n.specs)||n.specs.length>100)throw Error('Specificații invalide.');const keys=new Set();for(const s of n.specs){if(!s||typeof s.key!=='string'||keys.has(s.key)||typeof s.name!=='string'||typeof s.unit!=='string'||!Number.isFinite(s.value)||!Number.isFinite(s.referenceValue)||typeof s.source!=='string'||!s.source.startsWith('https://'))throw Error('Specificație documentată invalidă.');keys.add(s.key)}}if(n.calibration!==undefined){if(!n.calibration||typeof n.calibration!=='object'||Array.isArray(n.calibration))throw Error('Calibrare invalidă.');for(const[k,v]of Object.entries(n.calibration))if(!fields(n.type).includes(k)||!v||!['required','assumption','measured','manufacturer'].includes(v.status)||typeof v.note!=='string')throw Error('Proveniență de parametru invalidă.');}}}
