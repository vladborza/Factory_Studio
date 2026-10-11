import {createServer} from './services/gateway.mjs';
import {pathToFileURL} from 'node:url';
export {createServer};
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';createServer().listen(port,host,()=>console.log(`Factory Studio: http://${host}:${port}`));}
