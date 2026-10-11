import{run,diagnose}from './engine.js';
self.onmessage=({data})=>{try{const result=run(data.model,data.options);const ranks={};for(const [i,line]of data.model.lines.entries())ranks[line.id]=diagnose(line,{...data.options,seed:data.options.seed+i*1009});self.postMessage({result,ranks});}catch(e){self.postMessage({error:e.message})}};
