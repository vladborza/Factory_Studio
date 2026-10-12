const studentT=[0,12.706,4.303,3.182,2.776,2.571,2.447,2.365,2.306,2.262,2.228,2.201,2.179,2.160,2.145,2.131,2.120,2.110,2.101,2.093];
export const METRICS={good:['Produse bune','buc'],wip:['WIP final','buc'],scrap:['Rebut','buc'],throughput:['Debit','buc/h'],leadMean:['Lead time mediu al pieselor finalizate','s'],energy:['Energie în procesare','kWh'],materialCost:['Cost materiale','EUR'],resourceCost:['Cost resurse','EUR'],operationCost:['Cost operații','EUR'],totalCost:['Cost total modelat','EUR']};
export function summarize(values){
 const valid=values.filter(Number.isFinite),n=valid.length;
 if(!n)return{n:0,mean:null,ci95:null,min:null,max:null};
 const mean=valid.reduce((s,x)=>s+x,0)/n,variance=n>1?valid.reduce((s,x)=>s+(x-mean)**2,0)/(n-1):null;
 return{n,mean,ci95:variance===null?null:studentT[n-1]*Math.sqrt(variance/n),min:Math.min(...valid),max:Math.max(...valid)};
}
export function summarizeRuns(runs){return Object.fromEntries(Object.keys(METRICS).map(k=>[k,summarize(runs.map(r=>r[k]))]));}
