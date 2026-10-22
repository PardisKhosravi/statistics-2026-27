/* Lesson 3: finite-sample probability and reproducible Monte Carlo.
 * xoshiro128** transition: David Blackman / Sebastiano Vigna (CC0).
 * https://prng.di.unimi.it/xoshiro128starstar.c
 * Our mix32 seeding and per-attacker stream assignment are specified below.
 */
window.StochasticLab = (() => {
  'use strict';
  function integer(value,min,max,label) {
    const n=Number(value);if(value===''||!Number.isSafeInteger(n)||n<min||n>max)throw Error(`${label} must be an integer from ${min} to ${max}.`);return n;
  }
  function config(input) {
    const n=integer(input.n,16,8192,'Systems n'),m=integer(input.m,2,5000,'Attackers m'),seed=integer(input.seed,0,4294967295,'Seed');
    const p=Number(input.p),epsilon=Number(input.epsilon);
    if(input.p===''||!Number.isFinite(p)||p<0||p>1)throw Error('Bernoulli p must be between 0 and 1.');
    if(input.epsilon===''||!Number.isFinite(epsilon)||epsilon<.000001||epsilon>1)throw Error('Simulation tolerance ε must be between 0.000001 and 1.');
    return {n,m,seed,p,epsilon};
  }
  function mix32(x) {x=(x^(x>>>16))>>>0;x=Math.imul(x,0x21f0aaad);x=(x^(x>>>15))>>>0;x=Math.imul(x,0x735a2d97);return (x^(x>>>15))>>>0;}
  const rotl=(x,k)=>((x<<k)|(x>>>(32-k)))>>>0;
  function fromState(state) {
    let [a,b,c,d]=state.map(x=>x>>>0);if(!(a|b|c|d))throw Error('PRNG state must be nonzero.');
    return ()=>{const r=Math.imul(rotl(Math.imul(b,5),7),9)>>>0,t=b<<9;c^=a;d^=b;b^=c;a^=d;c^=t;d=rotl(d,11);return r/4294967296;};
  }
  function rng(seed,model,attacker) {
    const tag=model==='bernoulli'?0xa341316c:0xc8013ea4;
    const base=(seed^tag^Math.imul(attacker+1,0x9e3779b9))>>>0;
    const s=Array.from({length:4},(_,i)=>mix32((base+Math.imul(i+1,0x9e3779b9))>>>0));
    if(!s.some(Boolean))s[0]=1;return fromState(s);
  }
  const moments=(model,p)=>model==='bernoulli'?{mu:p,variance:p*(1-p)}:{mu:0,variance:1};
  function theory(model,p,n) {const {mu,variance:v}=moments(model,p);return {total:{mean:n*mu,variance:n*v},average:{mean:mu,variance:v/n},normalized:{mean:Math.sqrt(n)*mu,variance:v},mu,v};}
  function checkpoints(n) {return [...new Set([8,32,128,512,2048,8192].filter(x=>x<=n).concat(n))].sort((a,b)=>a-b);}
  function stats(values) {
    let mean=0,m2=0,k=0;for(const x of values){k++;const d=x-mean;mean+=d/k;m2+=d*(x-mean);}
    return {mean,variance:k>1?m2/(k-1):NaN,n:k};
  }
  // Stable finite-n Binomial probabilities, starting at the mode. No factorials.
  function binomial(n,p) {
    const a=new Float64Array(n+1);if(p===0){a[0]=1;return a;}if(p===1){a[n]=1;return a;}
    const mode=Math.min(n,Math.floor((n+1)*p));a[mode]=1;
    for(let k=mode;k>0;k--)a[k-1]=a[k]*k/(n-k+1)*(1-p)/p;
    for(let k=mode;k<n;k++)a[k+1]=a[k]*(n-k)/(k+1)*p/(1-p);
    const sum=a.reduce((x,y)=>x+y,0);return a.map(x=>x/sum);
  }
  function pmf(model,p,n) {const a=binomial(n,model==='bernoulli'?p:.5);return Array.from(a,(prob,k)=>({score:model==='bernoulli'?k:2*k-n,prob}));}
  function normalCDF(z) {
    if(z===0)return .5;if(z===Infinity)return 1;if(z===-Infinity)return 0;
    const x=Math.abs(z),t=1/(1+.2316419*x),density=Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
    const tail=density*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
    return z>0?1-tail:tail;
  }
  function cdfDistance(rows,mu,sd) {
    if(!sd)return null;let before=0,d=0;
    for(const row of rows){const phi=normalCDF((row.score-mu)/sd);d=Math.max(d,Math.abs(before-phi),Math.abs(before+row.prob-phi));before+=row.prob;}
    return d;
  }
  function empiricalPMF(values) {const map=new Map();for(const x of values)map.set(x,(map.get(x)||0)+1);return [...map].sort((a,b)=>a[0]-b[0]).map(([score,n])=>({score,prob:n/values.length}));}
  const outside=(score,n,mu,epsilon)=>Math.abs(score/n-mu)>epsilon+1e-12;
  function summarize(model,p,n,values,epsilon) {
    const t=theory(model,p,n),s=stats(values),exact=pmf(model,p,n),tail=values.reduce((k,x)=>k+Number(outside(x,n,t.mu,epsilon)),0)/values.length;
    return {n,m:values.length,theory:t,total:s,average:{mean:s.mean/n,variance:s.variance/(n*n)},normalized:{mean:s.mean/Math.sqrt(n),variance:s.variance/n},tail,exactTail:Math.max(0,Math.min(1,exact.reduce((sum,r)=>sum+(outside(r.score,n,t.mu,epsilon)?r.prob:0),0))),bound:t.v===0?0:Math.min(1,t.v/(n*epsilon*epsilon)),empiricalD:cdfDistance(empiricalPMF(values),n*t.mu,Math.sqrt(n*t.v)),exactD:cdfDistance(exact,n*t.mu,Math.sqrt(n*t.v))};
  }
  async function simulate(input,{progress=()=>{},cancelled=()=>false,yieldTask=()=>new Promise(r=>setTimeout(r,0))}={}) {
    const cfg=config(input),sizes=checkpoints(cfg.n),models={},batch=Math.max(1,Math.floor(250000/cfg.n));let done=0;
    for(const model of ['bernoulli','rademacher']) {
      const endpoints=sizes.map(n=>({n,values:new Int32Array(cfg.m)})),paths=[];
      for(let a=0;a<cfg.m;a++) {
        if(cancelled())return null;
        const random=rng(cfg.seed,model,a),path=a<8?new Int32Array(cfg.n+1):null;let sum=0,cp=0;
        for(let i=1;i<=cfg.n;i++) {
          const u=random();sum+=model==='bernoulli'?Number(u<cfg.p):(u<.5?1:-1);
          if(path)path[i]=sum;
          if(i===sizes[cp]){endpoints[cp].values[a]=sum;cp++;}
        }
        if(path)paths.push(path);done++;
        if((a+1)%batch===0){progress(done/(2*cfg.m));await yieldTask();}
      }
      models[model]={paths,endpoints,summaries:endpoints.map(e=>summarize(model,cfg.p,e.n,e.values,cfg.epsilon))};
    }
    if(cancelled())return null;progress(1);return {config:cfg,sizes,models};
  }
  function aggregate(model,p,n,values) {
    const {mu,variance:v}=moments(model,p),m=values.length,total=values.reduce((a,b)=>a+b,0);
    return {m,total,perAttacker:total/m,perAttempt:total/(m*n),expected:m*n*mu,variance:m*n*v,rateSE:Math.sqrt(v/(m*n))};
  }
  // Bins are groups of adjacent lattice values, identical under affine rescaling.
  function histogram(model,p,n,values) {
    const prob=model==='bernoulli'?p:.5,sd=Math.sqrt(n*prob*(1-prob));
    const ks=Array.from(values,s=>model==='bernoulli'?s:(s+n)/2);
    let low=Math.max(0,Math.floor(n*prob-4*sd)),high=Math.min(n,Math.ceil(n*prob+4*sd));
    for(const k of ks){low=Math.min(low,k);high=Math.max(high,k);}
    const width=Math.max(1,Math.ceil((high-low+1)/32)),buckets=[];
    for(let k=low;k<=high;k+=width)buckets.push({lo:k-.5,hi:Math.min(high,k+width-1)+.5,observed:0,exact:0});
    for(const k of ks)buckets[Math.floor((k-low)/width)].observed+=1/values.length;
    const mass=binomial(n,prob);let omitted=0;
    for(let k=0;k<=n;k++){if(k<low||k>high)omitted+=mass[k];else buckets[Math.floor((k-low)/width)].exact+=mass[k];}
    const convert=k=>model==='bernoulli'?k:2*k-n;
    return {bins:buckets.map(b=>({...b,lo:convert(b.lo),hi:convert(b.hi)})),omitted};
  }
  return {config,integer,mix32,fromState,rng,moments,theory,checkpoints,stats,binomial,pmf,normalCDF,cdfDistance,empiricalPMF,outside,summarize,simulate,aggregate,histogram};
})();
