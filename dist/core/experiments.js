export const EXPERIMENT_SCHEMA=1;
// Wall-clock run completion is metadata, never part of the deterministic payload.
export function deterministicResult(result){const copy=JSON.parse(JSON.stringify(result));delete copy.at;return copy;}
export function createExperiment(model,result,{id=crypto.randomUUID(),timestamp=new Date().toISOString()}={}){
 return{schema:EXPERIMENT_SCHEMA,id,name:model.name,timestamp,model:JSON.parse(JSON.stringify(model)),parameters:JSON.parse(JSON.stringify(model.settings)),seeds:[...result.seeds],engineVersion:result.engineVersion,analysisVersion:result.analysisVersion,results:deterministicResult(result)};
}
export function validateExperiment(e){if(!e||e.schema!==EXPERIMENT_SCHEMA||typeof e.id!=='string'||!e.model||!e.parameters||!Array.isArray(e.seeds)||!e.results||e.engineVersion!==e.results.engineVersion||e.analysisVersion!==e.results.analysisVersion||JSON.stringify(e.parameters)!==JSON.stringify(e.model.settings)||JSON.stringify(e.seeds)!==JSON.stringify(e.results.seeds))throw Error('Invalid experiment snapshot or metadata.');return e;}
export function compareReplay(experiment,result){validateExperiment(experiment);if(result.engineVersion!==experiment.engineVersion||result.analysisVersion!==experiment.analysisVersion)return{identical:false,reason:'Engine/analysis version changed; exact replay is not guaranteed.'};const identical=JSON.stringify(deterministicResult(result))===JSON.stringify(experiment.results);return{identical,reason:identical?'Bit-identical deterministic results.':'Results differ from the archived experiment.'};}
export function openExperimentStore(factory=globalThis.indexedDB){
 if(!factory)return Promise.reject(Error('IndexedDB unavailable. Export the experiment JSON to preserve it.'));
 return new Promise((resolve,reject)=>{
  const request=factory.open('factory-studio-experiments',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('experiments',{keyPath:'id'});
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(Error('Experiment database upgrade blocked by another tab.'));
  request.onsuccess=()=>{const db=request.result;
   const execute=(mode,fn)=>new Promise((resolve,reject)=>{const tx=db.transaction('experiments',mode),req=fn(tx.objectStore('experiments'));let value;req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Experiment transaction aborted.'));});
   resolve({save:e=>{validateExperiment(e);return execute('readwrite',s=>s.put(e));},list:()=>execute('readonly',s=>s.getAll()).then(list=>list.sort((a,b)=>b.timestamp.localeCompare(a.timestamp))),get:id=>execute('readonly',s=>s.get(id)),close:()=>db.close()});
  };
 });
}
