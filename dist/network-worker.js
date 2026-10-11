import{replicate}from './network.js';
self.onmessage=({data})=>{try{self.postMessage({result:replicate(data.model)})}catch(e){self.postMessage({error:e.message})}};
