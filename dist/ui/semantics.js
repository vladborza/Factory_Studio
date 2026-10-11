export const FAMILIES={
 structure:{label:'Structură',color:'#52657A',tint:'#F0F3F7',icon:'▦'},
 machine:{label:'Utilaje',color:'#2563EB',tint:'#EFF5FF',icon:'▣'},
 automation:{label:'Automatizare',color:'#6254C7',tint:'#F3F1FF',icon:'⌘'},
 software:{label:'Software & date',color:'#8646B5',tint:'#F8F1FC',icon:'{}'},
 people:{label:'Personal',color:'#087F8C',tint:'#ECF8FA',icon:'♙'},
 process:{label:'Procese',color:'#9A6700',tint:'#FFF8E8',icon:'→'},
 logistics:{label:'Materiale & logistică',color:'#986044',tint:'#FBF3ED',icon:'▤'},
 test:{label:'Testare',color:'#146C80',tint:'#EDF7FA',icon:'◎'},
 mbse:{label:'MBSE',color:'#5865A0',tint:'#F1F3FB',icon:'◇'}
};
export const LEVELS={M:{label:'M · Mission',color:'#6D4AA5',tint:'#F6F1FC'},O:{label:'O · Operational',color:'#087F8C',tint:'#ECF8FA'},F:{label:'F · Functional',color:'#9A6700',tint:'#FFF8E8'},L:{label:'L · Logical',color:'#2563EB',tint:'#EFF5FF'},T:{label:'T · Technical',color:'#52657A',tint:'#F0F3F7'},none:{label:'Nivel neatribuit',color:'#697586',tint:'#F5F6F8'}};
export function family(type){return ['factory','line','assembly','subassembly','package','block','part'].includes(type)?'structure':['machine','tool','utility'].includes(type)?'machine':['robot','hardware','sensor'].includes(type)?'automation':['software','interface','interfaceBlock','signal','dataType'].includes(type)?'software':['person','team','actor'].includes(type)?'people':['operation','activity','action','decision','state','initial','final','fork'].includes(type)?'process':['material','transport','source','sink','buffer'].includes(type)?'logistics':['inspection','testCase'].includes(type)?'test':'mbse'}
export function appearance(n,mode='family'){const f=FAMILIES[family(n.type)];return mode==='moflt'?{...(LEVELS[n.moflt]||LEVELS.none),icon:f.icon}:f}
