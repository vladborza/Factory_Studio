import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
export function createServer({services={catalog:process.env.CATALOG_URL,simulation:process.env.SIMULATION_URL,models:process.env.MODELS_URL}}={}){return http.createServer(async(req,res)=>{
 const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 try{
  const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),docker=['catalog','simulation','models'].every(key=>Boolean(services[key]));
  if(pathname==='/healthz'&&['GET','HEAD'].includes(req.method))return send(200,{status:'ok',version:'0.5.0',storage:docker?'docker-model-service':'browser-local'});
  if(pathname==='/api/config'&&req.method==='GET')return send(200,{mode:docker?'docker':'browser',version:'0.5.0'});
  if(pathname.startsWith('/api/')){
   const service=pathname==='/api/catalog'?'catalog':pathname==='/api/simulations'?'simulation':/^\/api\/models(?:\/[\w-]{1,80})?$/.test(pathname)?'models':null;
   if(!service||!services[service])return send(404,{error:'Serviciu indisponibil în acest mod.'});
   if(!['GET','POST','PUT'].includes(req.method))return send(405,{error:'Metodă invalidă.'});
   const writes=['POST','PUT'].includes(req.method);if(writes){if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'application/json required'});if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'Cross-origin writes rejected'});}
   let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>10_000_000)return send(413,{error:'Maximum 10 MB'});chunks.push(c)}
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),65_000);res.on('close',()=>controller.abort());
   try{const upstream=await fetch(services[service]+pathname,{method:req.method,headers:{'Content-Type':'application/json'},body:writes?Buffer.concat(chunks):undefined,signal:controller.signal});res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await upstream.text())}finally{clearTimeout(timer)}return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname)),relative=path.relative(root,target);if(relative.startsWith('..')||path.isAbsolute(relative)||pathname.includes('\\')||pathname.includes('\0')){res.writeHead(403);res.end();return}
  const content=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
 }catch(e){if(!res.headersSent){if(req.url.startsWith('/api/'))send(502,{error:'Serviciul nu răspunde. Verifică starea containerelor.'});else{res.writeHead(404);res.end('Not found')}}else res.end()}
})}
