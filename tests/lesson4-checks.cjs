const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');const root=path.resolve(__dirname,'..'),c={window:{},setTimeout};vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(root,'assets/stochastic.js'),'utf8'),c);c.StochasticLab=c.window.StochasticLab;vm.runInContext(fs.readFileSync(path.join(root,'assets/welford.js'),'utf8'),c);const W=c.window.WelfordLab;
let checks=0;function ok(x,msg){assert.ok(x,msg);checks++;}function close(a,b,tol=1e-10){ok(Math.abs(a-b)<tol,`${a} ≈ ${b}`);}
(async()=>{
 const state=W.empty();ok(W.sampleVariance(state)===null&&W.descriptiveVariance(state)===null,'empty undefined variances');
 const values=[4,6,8,5];for(let i=0;i<values.length;i++){W.push(state,values[i]);const direct=W.twoPass(values.slice(0,i+1));close(state.mean,direct.mean);close(state.SS,direct.SS);if(i)close(W.sampleVariance(state),direct.variance);else ok(W.sampleVariance(state)===null,'one observation variance undefined');}
 close(state.mean,5.75);close(state.SS,8.75);close(W.sampleVariance(state),35/12);close(W.descriptiveVariance(state),35/16);
 for(const offset of [0,1e6,1e9,1e12]){const s=W.stability(offset);close(s.welford,8.75);close(s.twoPass,8.75);}
 for(const data of [[0,0,0],[10,10,10],[0,10],[.1,.2,.3,.4],[10,0,9,1,8,2,7,3,6,4,5]]){const a=W.batch(data),b=W.twoPass(data);close(a.mean,b.mean);close(a.SS,b.SS);}
 ok(Array.from(W.parse(' , 1, 2; 3 ')).join(',')==='1,2,3','separator parsing does not add zeroes');for(const s of ['',', ; ','NaN','Infinity','-1','11',Array(201).fill(1).join(',')]){assert.throws(()=>W.parse(s));checks++;}
 // Exact population moments from all eleven equally likely scores.
 close(Array.from({length:11},(_,x)=>x).reduce((a,x)=>a+x/11,0),5);close(Array.from({length:11},(_,x)=>(x-5)**2/11).reduce((a,b)=>a+b),10);close(Array.from({length:11},(_,x)=>(x-5)**4/11).reduce((a,b)=>a+b),178);
 // Exhaustively enumerate n=2 and n=3; compute reference statistics independently.
 for(const n of [2,3]){let count=0,sumM=0,sumV=0,sumM2=0,sumV2=0,sumBiased=0;
  for(let code=0;code<11**n;code++){let k=code;const a=[];for(let i=0;i<n;i++){a.push(k%11);k=Math.floor(k/11);}const sum=a.reduce((x,y)=>x+y,0),sumSquares=a.reduce((x,y)=>x+y*y,0),mean=sum/n,ss=(n*sumSquares-sum*sum)/n,v=ss/(n-1),w=W.batch(a);close(w.mean,mean);close(w.SS,ss);sumM+=mean;sumV+=v;sumM2+=mean*mean;sumV2+=v*v;sumBiased+=ss/n;count++;}
  const t=W.theory(n);close(sumM/count,5);close(sumV/count,10);close(sumM2/count-25,t.varMean,1e-9);close(sumV2/count-100,t.varVariance,1e-8);close(sumBiased/count,t.biasedMean);
 }
 let draws=0;const candidates=[4294967295,22];close(W.draw(()=>candidates[draws++]/2**32),0);ok(draws===2,'rejects uint32 modulo-bias tail');
 const cfg={n:300,m:1500,seed:20261103},fast={yieldTask:()=>Promise.resolve()},run=await W.simulate(cfg,fast),again=await W.simulate(cfg,fast);ok(JSON.stringify(run)===JSON.stringify(again),'reproducible samples');
 for(let a=0;a<run.paths.length;a++){const p=run.paths[a];ok(Number.isNaN(p.variances[1]),'first variance missing');for(let k=1;k<=cfg.n;k++)ok(p.scores[k]>=0&&p.scores[k]<=10&&Number.isInteger(p.scores[k]),'bounded integer score');for(const e of run.endpoints){const direct=W.twoPass(Array.from(p.scores.slice(1,e.n+1)));close(e.means[a],direct.mean);close(e.variances[a],direct.variance,1e-9);}}
 for(let j=0;j<run.sizes.length;j++){const e=run.endpoints[j],s=run.summaries[j],a=W.twoPass(Array.from(e.means)),b=W.twoPass(Array.from(e.variances));close(s.meanMeans,a.mean);close(s.meanVariances,b.mean);close(s.varMeans,a.variance);close(s.varVariances,b.variance);ok(Math.abs(s.meanMeans-5)<6*s.seGrandMean,'grand mean sampling diagnostic');ok(Math.abs(s.meanVariances-10)<6*s.seGrandVariance,'grand variance sampling diagnostic');}
 const more=await W.simulate({...cfg,n:301,m:1501},fast);for(let j=0;j<run.sizes.length;j++)ok(Array.from(run.endpoints[j].means).every((x,a)=>x===more.endpoints[j].means[a]),'all existing means preserve prefixes across n and m');
 ok(await W.simulate(cfg,{...fast,cancelled:()=>true})===null,'cancellation discards partial simulation');for(const bad of [{n:1},{n:8193},{m:1},{m:5001},{seed:-1},{seed:''}]){assert.throws(()=>W.config({...cfg,...bad}));checks++;}
 console.log(`PASS · ${checks} Lesson 4 numerical checks (including exhaustive n=2,3 enumeration and independent two-pass references).`);
 const demo=await W.simulate({n:1000,m:2000,seed:20261103},fast);console.log('Default observations:',JSON.stringify(demo.summaries.map(s=>({n:s.n,meanMeans:s.meanMeans,meanVariances:s.meanVariances,varMeans:s.varMeans,varVariances:s.varVariances}))));
})().catch(e=>{console.error(e);process.exitCode=1;});
