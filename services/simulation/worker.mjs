import{parentPort,workerData}from'node:worker_threads';import{replicate}from'../../dist/core/network.js';
try{parentPort.postMessage({result:replicate(workerData)})}catch(e){parentPort.postMessage({error:e.message})}
