const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),context={window:{},setTimeout,console};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'assets/stochastic.js'),'utf8'),context);const S=context.window.StochasticLab;
let checks=0;function ok(x,msg){assert.ok(x,msg);checks++;}function close(a,b,tol=1e-10){ok(Math.abs(a-b)<tol,`${a} ≈ ${b}`);}
const cfg={n:128,m:1500,p:.3,epsilon:.1,seed:20261022},fast={yieldTask:()=>Promise.resolve()};
(async()=>{
 // Independently enumerate every outcome of eight Bernoulli trials.
 for(const p of [0,.1,.3,.5,.9,1]){
  const brute=Array(9).fill(0);for(let mask=0;mask<256;mask++){let k=0,w=1;for(let i=0;i<8;i++){const bit=(mask>>i)&1;k+=bit;w*=bit?p:1-p;}brute[k]+=w;}
  const law=S.binomial(8,p);law.forEach((q,k)=>close(q,brute[k]));
 }
 for(const p of [0,.00001,.3,.5,.99999,1]){const law=S.binomial(8192,p);close(law.reduce((a,b)=>a+b,0),1);close(law.reduce((a,b,k)=>a+k*b,0),8192*p,1e-7);ok(law.every(x=>Number.isFinite(x)&&x>=0),'stable high-n law');}
 const r=S.pmf('rademacher',.3,3);close(r[0].prob,1/8);close(r[1].prob,3/8);ok(r.map(x=>x.score).join(',')==='-3,-1,1,3','Rademacher parity');
 for(const model of ['bernoulli','rademacher'])for(const n of [8,32,128]){
  const law=S.pmf(model,.3,n),mean=law.reduce((a,r)=>a+r.score*r.prob,0),variance=law.reduce((a,r)=>a+(r.score-mean)**2*r.prob,0),t=S.theory(model,.3,n);
  close(mean,t.total.mean);close(variance,t.total.variance);close(t.average.variance,t.total.variance/n**2);close(t.normalized.variance,t.total.variance/n);
 }
 close(S.normalCDF(0),.5);close(S.normalCDF(1.95996398454),.975,1e-7);close(S.normalCDF(-3),.001349898,1e-7);
 // A jump exactly at zero differs by 1/2 on each side; ties must be grouped.
 close(S.cdfDistance([{score:0,prob:1}],0,1),.5);close(S.cdfDistance(S.empiricalPMF([0,0,0]),0,1),.5);
 const rand=S.fromState([1,2,3,4]);close(rand(),11520/2**32);close(rand(),0);close(rand(),5927040/2**32);
 assert.throws(()=>S.fromState([0,0,0,0]));checks++;
 const run=await S.simulate(cfg,fast),repeat=await S.simulate(cfg,fast);ok(JSON.stringify(run)===JSON.stringify(repeat),'seed repeats every result');
 for(const model of ['bernoulli','rademacher']){
  const data=run.models[model];for(let a=0;a<8;a++){const path=data.paths[a];for(let i=1;i<path.length;i++)ok(model==='bernoulli'?[0,1].includes(path[i]-path[i-1]):[-1,1].includes(path[i]-path[i-1]),'valid increment');for(const endpoint of data.endpoints)ok(endpoint.values[a]===path[endpoint.n],'checkpoint equals path prefix');}
  for(let i=0;i<data.endpoints.length;i++){
   const e=data.endpoints[i],s=data.summaries[i],hist=S.histogram(model,cfg.p,e.n,e.values);close(hist.bins.reduce((a,b)=>a+b.observed,0),1);close(hist.bins.reduce((a,b)=>a+b.exact,0)+hist.omitted,1);ok(s.exactTail<=s.bound+1e-12,'Chebyshev bounds exact probability');
   const mean=Array.from(e.values).reduce((a,b)=>a+b,0)/cfg.m;close(mean,s.total.mean);const independentVariance=Array.from(e.values).reduce((a,b)=>a+(b-mean)**2,0)/(cfg.m-1);close(independentVariance,s.total.variance,1e-8);
  }
  const last=data.summaries.at(-1),t=last.theory;ok(Math.abs(last.total.mean-t.total.mean)<6*Math.sqrt(t.total.variance/cfg.m),'Monte Carlo mean within conservative sampling tolerance');ok(Math.abs(last.total.variance/t.total.variance-1)<.16,'sample variance near theory');
 }
 const extended=await S.simulate({...cfg,n:256,m:1510},fast);for(const model of ['bernoulli','rademacher']){ok(Array.from(run.models[model].paths[0]).every((x,i)=>x===extended.models[model].paths[0][i]),'path prefix preserved across n and m');ok(Array.from(run.models[model].endpoints.at(-1).values).every((x,i)=>x===extended.models[model].endpoints.find(e=>e.n===128).values[i]),'all attacker prefixes preserved');}
 for(const p of [0,1]){const d=await S.simulate({...cfg,p,m:10,n:16},fast),s=d.models.bernoulli.summaries.at(-1);close(s.total.mean,16*p);close(s.total.variance,0);ok(s.empiricalD===null&&s.exactD===null&&s.exactTail===0,'degenerate CLT and LLN');}
 const odd=await S.simulate({...cfg,n:17,m:10},fast);ok(odd.models.rademacher.endpoints.at(-1).values.every(x=>Math.abs(x)%2===1),'odd-n parity');
 const a=S.aggregate('bernoulli',.3,4,new Int32Array([1,2,3]));close(a.total,6);close(a.expected,3.6);close(a.variance,2.52);close(a.rateSE,Math.sqrt(.21/12));
 ok(!S.outside(6,10,.5,.1)&&S.outside(7,10,.5,.1),'strict epsilon boundary with roundoff tolerance');
 ok(await S.simulate(cfg,{...fast,cancelled:()=>true})===null,'cancelled run produces no partial result');
 let stop=false;ok(await S.simulate({...cfg,n:2048,m:130},{...fast,progress:()=>{stop=true;},cancelled:()=>stop})===null,'cancel between batches');
 for(const patch of [{n:0},{n:8193},{m:1},{m:5001},{p:-.1},{p:1.1},{p:''},{epsilon:0},{epsilon:1e-8},{seed:-1},{seed:''}]){assert.throws(()=>S.config({...cfg,...patch}));checks++;}
 console.log(`PASS · ${checks} Lesson 3 checks (exhaustive PMFs, scaling, CDF jumps, sampling, prefixes, endpoints and cancellation).`);
 const display=await S.simulate({...cfg,n:2048,m:2000},fast);for(const model of ['bernoulli','rademacher'])console.log(model,JSON.stringify(display.models[model].summaries.map(s=>({n:s.n,varianceAverage:s.average.variance,tail:s.tail,empiricalD:s.empiricalD,exactD:s.exactD}))));
})().catch(e=>{console.error(e);process.exitCode=1;});
