import {validateModel,uid} from '../../core/model.js';
export function createConnection(model,{type,from,to,fromPort,toPort}){
 if(!from||!to)throw Error('Selectează sursa și destinația.');
 if(model.edges.some(e=>e.type===type&&e.from===from&&e.to===to&&(e.fromPort||'')===(fromPort||'')&&(e.toPort||'')===(toPort||''))&&type!=='message')throw Error('Această conexiune există deja. Selecteaz-o pentru editare.');
 const edge={id:uid('edge'),type,from,to,weight:1,delay:0,quantity:1,order:model.edges.filter(e=>e.type==='message').length+1,...(fromPort?{fromPort,toPort}:{})};
 validateModel({...model,edges:[...model.edges,edge]});return edge;
}
