import {expandedNeeds} from './mbse.js';
export const PHASE_TYPES = {load:'Încărcare',automatic:'Automat',unload:'Descărcare','walk/transfer':'Deplasare / transfer',inspect:'Inspecție',wait:'Așteptare'};
const processes = ['operation','inspection','transport'];
const pools = ['machine','robot','tool','hardware','sensor','software','person','team','utility'];
const human = n => ['person','team'].includes(n?.type);
export const nativePhases = n => n.phaseVersion === 2;

// Schema 1 is the exact historical execution contract, including RNG consumption.
// Schema 2 is opt-in; migration never silently changes physical assumptions.
export function migratePhaseSchema(model) {
  for (const n of model.nodes.filter(n => processes.includes(n.type))) {
    if (n.phaseVersion === undefined) {
      n.phaseVersion = 1;
      if(n.phases===undefined){n.legacyImplicitPhase=true;n.phases=[{name:'Ciclu complet',kind:'manual',fraction:1}];}
    }
  }
  return model;
}
export function phaseRequirements(model, n, phase) {
  const needs = new Map();
  const add = (id,q) => needs.set(id,(needs.get(id)||0)+q);
  if (phase.inheritPeople) for (const [id,q] of expandedNeeds(model,n))
    if (human(model.nodes.find(x=>x.id===id))) add(id,q);
  for (const r of phase.resources) {
    add(r.resourceId,r.quantity);
    for (const e of model.edges.filter(e=>e.type==='staffedBy'&&e.from===r.resourceId)) add(e.to,r.quantity*e.quantity);
  }
  return needs;
}
export function demandWarnings(model,n) {
  const direct=new Set(model.edges.filter(e=>e.type==='requires'&&e.from===n.id).map(e=>e.to));
  const inherited=new Set(model.edges.filter(e=>e.type==='staffedBy'&&direct.has(e.from)).map(e=>e.to));
  const duplicate=[...direct].filter(id=>inherited.has(id));
  const messages=duplicate.map(id=>`${n.name}: dublă contabilizare directă + moștenită pentru ${model.nodes.find(x=>x.id===id)?.name||id}; cantitățile se adună.`);
  if(nativePhases(n)) for(const p of n.phases){
    const explicit=new Set(p.resources.map(r=>r.resourceId));
    const inheritedPhase=new Set(model.edges.filter(e=>e.type==='staffedBy'&&explicit.has(e.from)).map(e=>e.to));
    if(p.inheritPeople)for(const[id]of expandedNeeds(model,n))if(human(model.nodes.find(x=>x.id===id)))inheritedPhase.add(id);
    for(const id of explicit)if(inheritedPhase.has(id))messages.push(`${n.name} / ${p.name}: dublă contabilizare explicită + moștenită pentru ${model.nodes.find(x=>x.id===id)?.name||id}.`);
  }
  return messages;
}
export function validateNativePhases(n) {
  if(!processes.includes(n.type)||!Array.isArray(n.phases)||n.phases.length<1||n.phases.length>20)throw Error('Definește 1–20 faze native pe operații.');
  for(const p of n.phases){
    if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!Object.hasOwn(PHASE_TYPES,p.kind))throw Error('Tip/nume de fază invalid.');
    const d=p.duration;
    if(!d||d.unit!=='s'||!Number.isFinite(d.value)||d.value<.01||d.value>86400||!['MEASURED','SPEC','ASSUMPTION'].includes(d.provenance)||typeof d.note!=='string'||!d.note.trim())throw Error('Durata fazei necesită valoare 0,01–86400 s și proveniență documentată.');
    if(!p.distribution||!['constant','uniform'].includes(p.distribution.type)||!Number.isFinite(p.distribution.relativeHalfRange)||p.distribution.relativeHalfRange<0||p.distribution.relativeHalfRange>.9||p.distribution.type==='constant'&&p.distribution.relativeHalfRange!==0)throw Error('Distribuție invalidă: constant sau uniform ±0–0,9.');
    if(typeof p.inheritPeople!=='boolean'||!Array.isArray(p.resources)||p.resources.length>500)throw Error('Resurse de fază invalide.');
    const ids=new Set();for(const r of p.resources){if(!r||typeof r.resourceId!=='string'||ids.has(r.resourceId)||!Number.isInteger(r.quantity)||r.quantity<1)throw Error('Necesar de fază invalid/duplicat.');ids.add(r.resourceId);}
  }
  if(n.phases.reduce((s,p)=>s+p.duration.value,0)>86400)throw Error('Ciclul nominal depășește 86400 s.');
}
export function validatePhaseResources(model,effective) {
  const byId=new Map(model.nodes.map(n=>[n.id,n]));
  const persistent=new Set();
  for(const n of model.nodes.filter(n=>processes.includes(n.type)))for(const[id]of expandedNeeds(model,n))if(!human(byId.get(id)))persistent.add(id);
  for(const n of model.nodes.filter(nativePhases)) for(const p of n.phases){
    for(const r of p.resources)if(!pools.includes(byId.get(r.resourceId)?.type))throw Error(`${n.name}: resursă de fază lipsă sau descriptivă.`);
    for(const[id,q]of phaseRequirements(model,n,p)){
      if(persistent.has(id))throw Error(`${n.name}: regulă anti-deadlock — resursa ${id} este rezervată pe secvență; nu poate fi cerută și per fază.`);
      if(q>effective(model,byId.get(id)).capacity)throw Error(`${n.name}: necesarul fazei depășește capacitatea ${id}.`);
    }
    if(p.kind==='automatic'&&[...phaseRequirements(model,n,p)].some(([id])=>human(byId.get(id))))throw Error('Faza automatic nu poate rezerva operatori; folosește load/unload/inspect.');
  }
}
export function setNativePhases(n,phases) {
  const candidate={...n,phaseVersion:2,phases:structuredClone(phases)};
  validateNativePhases(candidate);
  n.phaseVersion=2;delete n.legacyImplicitPhase;n.phases=candidate.phases;
  n.params.cycle=phases.reduce((s,p)=>s+p.duration.value,0);
  delete n.bindings.cycle;
}
export function samplePhaseSeconds(phase,rng) {
  return phase.duration.value*(phase.distribution.type==='uniform'?1+phase.distribution.relativeHalfRange*(2*rng()-1):1);
}
