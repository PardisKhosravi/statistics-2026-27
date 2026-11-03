/* Shared numerical core for both Lesson 4 exercises. No UI or network calls. */
window.WelfordLab = (()=>{
  'use strict';
  const empty=()=>({n:0,mean:0,SS:0});
  function push(state,x) {
    const delta = x - state.mean;
    state.mean += delta / ++state.n;
    state.SS += delta * (x - state.mean);
  }
  const sampleVariance=s=>s.n>1?s.SS/(s.n-1):null;
  const descriptiveVariance=s=>s.n?s.SS/s.n:null;
  function batch(values) {const s=empty();for(const x of values)push(s,x);return s;}
  function twoPass(values) {if(!values.length)return {n:0,mean:null,SS:0,variance:null};const mean=values.reduce((a,b)=>a+b,0)/values.length,SS=values.reduce((a,x)=>a+(x-mean)**2,0);return {n:values.length,mean,SS,variance:values.length>1?SS/(values.length-1):null};}
  function parse(text) {const tokens=text.trim().split(/[\s,;]+/).filter(Boolean);if(!tokens.length||tokens.length>200)throw Error('Enter between 1 and 200 scores, separated by commas or spaces.');const a=tokens.map(Number);if(a.some(x=>!Number.isFinite(x)||x<0||x>10))throw Error('Every score must be a finite number between 0 and 10.');return a;}
  function stability(offset) {const base=[4,6,8,5],values=base.map(x=>x+offset),w=batch(values),sum=values.reduce((a,b)=>a+b,0),squares=values.reduce((a,b)=>a+b*b,0);return {offset,reference:twoPass(base).SS,welford:w.SS,twoPass:twoPass(values).SS,naive:squares-sum*sum/values.length};}
  const population={mu:5,variance:10,fourth:178};
  function theory(n) {if(n<2)throw Error('Sample variance requires n ≥ 2.');return {mean:5,variance:10,varMean:10/n,varVariance:(178-(n-3)/(n-1)*100)/n,biasedMean:10*(n-1)/n};}
  // Rejection sampling removes the tiny modulo bias of uint32 -> 11 categories.
  function draw(random) {let r;do{r=Math.floor(random()*4294967296);}while(r>=4294967292);return r%11;}
  function config(o) {const n=StochasticLab.integer(o.n,2,8192,'Systems n'),m=StochasticLab.integer(o.m,2,5000,'Hackers m'),seed=StochasticLab.integer(o.seed,0,4294967295,'Seed');return {n,m,seed};}
  function checkpoints(n) {return [...new Set([2,5,10,30,100,300,1000,3000,8192].filter(x=>x<=n).concat(n))].sort((a,b)=>a-b);}
  function summarize(e,m) {const a=batch(e.means),b=batch(e.variances),t=theory(e.n);return {n:e.n,meanMeans:a.mean,meanVariances:b.mean,varMeans:sampleVariance(a),varVariances:sampleVariance(b),meanBiased:b.mean*(e.n-1)/e.n,theory:t,seGrandMean:Math.sqrt(t.varMean/m),seGrandVariance:Math.sqrt(t.varVariance/m)};}
  async function simulate(input,{progress=()=>{},cancelled=()=>false,yieldTask=()=>new Promise(r=>setTimeout(r,0))}={}) {
    const cfg=config(input),sizes=checkpoints(cfg.n),endpoints=sizes.map(n=>({n,means:new Float64Array(cfg.m),variances:new Float64Array(cfg.m)})),paths=[],batchSize=Math.max(1,Math.floor(150000/cfg.n));
    for(let a=0;a<cfg.m;a++) {
      if(cancelled())return null;
      const random=StochasticLab.rng((cfg.seed^0x51f15e)>>>0,'sampling',a),s=empty();let cp=0;
      const path=a<6?{scores:new Uint8Array(cfg.n+1),means:new Float64Array(cfg.n+1),variances:new Float64Array(cfg.n+1)}:null;
      if(path)path.variances[1]=NaN;
      for(let k=1;k<=cfg.n;k++) {
        const x=draw(random);push(s,x);
        if(path){path.scores[k]=x;path.means[k]=s.mean;if(k>1)path.variances[k]=sampleVariance(s);}
        if(k===sizes[cp]){endpoints[cp].means[a]=s.mean;endpoints[cp].variances[a]=sampleVariance(s);cp++;}
      }
      if(path)paths.push(path);
      if((a+1)%batchSize===0){progress((a+1)/cfg.m);await yieldTask();}
    }
    if(cancelled())return null;progress(1);return {config:cfg,sizes,endpoints,paths,summaries:endpoints.map(e=>summarize(e,cfg.m))};
  }
  return {empty,push,batch,twoPass,parse,sampleVariance,descriptiveVariance,stability,population,theory,draw,config,checkpoints,simulate};
})();
