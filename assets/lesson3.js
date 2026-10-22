(() => {
  'use strict';
  const {$,esc,download}=UI,S=StochasticLab;
  const colors=['#b51f65','#6941c6','#087c83','#b45610','#244e91','#71492e','#465c23','#30152d'];
  const inputIds=['systems','attackers-count','probability','epsilon','seed'];
  let result=null,busy=false,cancelled=false,stale=false,resizeTimer;
  const f=x=>x===null||!Number.isFinite(x)?'N/A':Math.abs(x)>=10000?x.toExponential(3):Math.abs(x)>0&&Math.abs(x)<.001?x.toExponential(3):Number(x.toFixed(5)).toLocaleString('en-US',{maximumFractionDigits:5});
  const pc=x=>x>0&&x<.000001?(x*100).toExponential(2)+'%':(x*100).toFixed(x>0&&x<.0001?6:3)+'%';
  function snapshot(){if(!result)return;const c=result.config;$('snapshot').textContent=`Stored experiment: n max = ${c.n.toLocaleString()}, m = ${c.m.toLocaleString()}, Bernoulli p = ${c.p}, Rademacher P(+1) = 0.5, ε = ${c.epsilon}, seed = ${c.seed}. ${stale?'Inputs changed; run again to update.':''}`;}
  function frame(target,options) {
    const w=Math.max(290,Math.min(1100,$(target).clientWidth||640)),h=250,L=66,R=18,T=18,B=48,pw=w-L-R,ph=h-T-B;
    let {xmin,xmax,ymin,ymax,logX=false,logY=false,xticks=null,percent=false,xlabel='',ylabel='',title=''}=options;
    if(xmin===xmax){xmin-=.5;xmax+=.5;}if(ymin===ymax){ymin-=.5;ymax+=.5;}
    const tx=x=>logX?Math.log10(x):x,ty=y=>logY?Math.log10(y):y;
    const X=x=>L+(tx(x)-tx(xmin))/(tx(xmax)-tx(xmin))*pw,Y=y=>h-B-(ty(y)-ty(ymin))/(ty(ymax)-ty(ymin))*ph;
    const tick=x=>{if(x===0)return '0';if(Math.abs(x)>=1000||Math.abs(x)<.001)return x.toExponential(1);return String(Number(x.toPrecision(3)));};
    let body=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;
    for(let i=0;i<=4;i++){const v=logY?10**(ty(ymin)+(ty(ymax)-ty(ymin))*i/4):ymin+(ymax-ymin)*i/4,y=Y(v);body+=`<path d="M${L} ${y}H${w-R}" class="plot-grid"/><text x="${L-8}" y="${y+4}" text-anchor="end" class="plot-tick">${esc(percent?(v*100).toFixed(0)+'%':tick(v))}</text>`;}
    const ticks=xticks||Array.from({length:5},(_,i)=>logX?10**(tx(xmin)+(tx(xmax)-tx(xmin))*i/4):xmin+(xmax-xmin)*i/4);
    for(const x of ticks){body+=`<text x="${X(x)}" y="${h-B+20}" text-anchor="middle" class="plot-tick">${esc(tick(x))}</text>`;}
    body+=`<text x="${L}" y="12" class="plot-label">${esc(ylabel)}</text><text x="${L+pw/2}" y="${h-5}" text-anchor="middle" class="plot-label">${esc(xlabel)}</text>`;
    return {X,Y,w,h,L,R,T,B,body,finish:content=>{$(target).innerHTML=body+content+'</svg>';}};
  }
  function lines(target,series,options={}) {
    const valid=series.flatMap(s=>s.points).filter(([x,y])=>Number.isFinite(y)&&(!options.logY||y>0));
    if(!valid.length){$(target).innerHTML='<p>No positive variances to plot: this model is deterministic.</p>';return;}
    let ymin=Math.min(...valid.map(r=>r[1])),ymax=Math.max(...valid.map(r=>r[1]));
    if(options.logY){ymin/=1.25;ymax*=1.25;}else{ymin=options.zero?0:Math.min(0,ymin);ymax=Math.max(ymax,.00001)*1.12;}
    const g=frame(target,{xmin:result.sizes[0],xmax:result.sizes.at(-1),ymin,ymax,xticks:result.sizes,logX:true,...options});let out='';
    for(const s of series){let segment=[];const flush=()=>{if(segment.length)out+=`<path class="plot-curve" stroke="${s.color}" ${s.dash?'stroke-dasharray="6 4"':''} d="${segment.map(([x,y],i)=>(i?'L':'M')+g.X(x)+','+g.Y(y)).join(' ')}"/>`;segment=[];};
      for(const [x,y] of s.points){if(!Number.isFinite(y)||(options.logY&&y<=0)){flush();continue;}segment.push([x,y]);out+=`<circle cx="${g.X(x)}" cy="${g.Y(y)}" r="3" fill="${s.color}"><title>${esc(s.name)}; n=${x}; ${f(y)}</title></circle>`;}flush();
    }g.finish(out);
  }
  function pathValue(score,i,key){return key==='total'?score:key==='average'?score/i:score/Math.sqrt(i);}
  function trajectory(model,key,n) {
    const data=result.models[model],{mu}=S.moments(model,result.config.p),epsilon=result.config.epsilon;
    let low=0,high=0;
    const mean=i=>key==='total'?i*mu:key==='average'?mu:Math.sqrt(i)*mu;
    for(const path of data.paths)for(let i=1;i<=n;i++){const v=pathValue(path[i],i,key);low=Math.min(low,v);high=Math.max(high,v);}
    high=Math.max(high,mean(n));if(key==='average'){low=Math.min(low,mu-epsilon);high=Math.max(high,mu+epsilon);}
    const pad=Math.max((high-low)*.08,.02),g=frame('path-'+key,{xmin:0,xmax:n,ymin:low-pad,ymax:high+pad,xlabel:'System i',ylabel:{total:'Sᵢ',average:'Sᵢ / i',normalized:'Sᵢ / √i'}[key],title:`${model}: ${key} trajectories of first ${data.paths.length} attackers`});let out='';
    if(key==='average')out+=`<rect x="${g.X(0)}" y="${g.Y(mu+epsilon)}" width="${g.X(n)-g.X(0)}" height="${g.Y(mu-epsilon)-g.Y(mu+epsilon)}" fill="#f3eeff"/>`;
    for(let a=0;a<data.paths.length;a++){
      const path=data.paths[a],stride=Math.max(1,Math.ceil(n/250)),indices=new Set([1,n]);
      for(let start=1;start<=n;start+=stride){let min=start,max=start;for(let i=start;i<Math.min(n+1,start+stride);i++){if(pathValue(path[i],i,key)<pathValue(path[min],min,key))min=i;if(pathValue(path[i],i,key)>pathValue(path[max],max,key))max=i;}indices.add(min);indices.add(max);}
      const points=[...indices].sort((a,b)=>a-b);out+=`<path class="path-trace" stroke="${colors[a]}" d="${points.map((i,j)=>(j?'L':'M')+g.X(i)+','+g.Y(pathValue(path[i],i,key))).join(' ')}"><title>Attacker ${a+1}</title></path>`;
    }
    const refs=Array.from({length:101},(_,j)=>1+(n-1)*j/100);out+=`<path class="plot-curve" stroke="#6941c6" stroke-dasharray="7 5" d="${refs.map((i,j)=>(j?'L':'M')+g.X(i)+','+g.Y(mean(i))).join(' ')}"><title>Theoretical mean</title></path>`;g.finish(out);
  }
  function drawHistogram(target,bins,{title,xlabel,normal=false}) {
    const mapped=bins.map(b=>({...b,target:normal?S.normalCDF(b.hi)-S.normalCDF(b.lo):b.exact}));
    const max=Math.max(...mapped.flatMap(b=>[b.observed,b.target]),.001)*1.15;
    const g=frame(target,{xmin:bins[0].lo,xmax:bins.at(-1).hi,ymin:0,ymax:max,percent:true,xlabel,ylabel:'Bin probability',title});let out='',curve=[];
    for(const b of mapped){const x=g.X(b.lo),width=g.X(b.hi)-x;out+=`<rect x="${x+width*.06}" y="${g.Y(b.observed)}" width="${width*.88}" height="${g.Y(0)-g.Y(b.observed)}" fill="#b51f65"><title>${f(b.lo)} to ${f(b.hi)}: observed ${pc(b.observed)}; ${normal?'normal':'exact'} ${pc(b.target)}</title></rect>`;curve.push([g.X((b.lo+b.hi)/2),g.Y(b.target)]);}
    out+=`<path class="plot-curve" stroke="#6941c6" d="${curve.map(([x,y],i)=>(i?'L':'M')+x+','+y).join(' ')}"/>`;
    for(const [x,y] of curve)out+=`<circle cx="${x}" cy="${y}" r="2.5" fill="#6941c6"/>`;g.finish(out);
  }
  function drawCLT(model,n,values) {
    const {mu,variance:v}=S.moments(model,result.config.p);
    const summaries=result.models[model].summaries;
    if(!v){for(const id of ['clt-hist','cdf-chart','clt-distance'])$(id).innerHTML='<p>Bernoulli p = 0 or 1: variance is zero. Z is undefined; the scores are deterministic.</p>';$('clt-rows').innerHTML='';return;}
    const sd=Math.sqrt(n*v),z=Array.from(values,x=>(x-n*mu)/sd);
    let low=-4,high=4;for(const x of z){low=Math.min(low,Math.floor(x*2)/2);high=Math.max(high,Math.ceil(x*2)/2);}
    const width=(high-low)/24,bins=Array.from({length:24},(_,i)=>({lo:low+i*width,hi:low+(i+1)*width,observed:0}));
    for(const x of z)bins[Math.min(23,Math.max(0,Math.floor((x-low)/width)))].observed+=1/z.length;
    drawHistogram('clt-hist',bins,{normal:true,title:'Standardized scores compared with standard normal bin probabilities',xlabel:'Zₙ'});
    const g=frame('cdf-chart',{xmin:low,xmax:high,ymin:0,ymax:1,percent:true,xlabel:'Standardized score z',ylabel:'Cumulative probability',title:'Empirical standardized-score CDF and standard normal CDF'});
    let path=`M${g.X(low)},${g.Y(0)}`,cum=0;
    for(const r of S.empiricalPMF(z)){path+=`H${g.X(r.score)}V${g.Y(cum+=r.prob)}`;}path+=`H${g.X(high)}`;
    let out=`<path class="plot-curve" stroke="#b51f65" d="${path}"/>`;
    out+=`<path class="plot-curve" stroke="#6941c6" stroke-dasharray="5 3" d="${Array.from({length:161},(_,i)=>{const x=low+(high-low)*i/160;return (i?'L':'M')+g.X(x)+','+g.Y(S.normalCDF(x));}).join(' ')}"/>`;g.finish(out);
    lines('clt-distance',[{name:'Empirical distance',color:colors[0],points:summaries.map(s=>[s.n,s.empiricalD])},{name:'Exact distance',color:colors[1],dash:true,points:summaries.map(s=>[s.n,s.exactD])}],{zero:true,xlabel:'Systems n · logarithmic scale',ylabel:'CDF distance',title:'Empirical and exact finite-n normal approximation distances'});
    $('clt-rows').innerHTML=summaries.map(s=>`<tr><td>${s.n}</td><td>${f((s.total.mean-s.n*mu)/Math.sqrt(s.n*v))}</td><td>${f(s.total.variance/(s.n*v))}</td><td>${f(s.empiricalD)}</td><td>${f(s.exactD)}</td></tr>`).join('');
  }
  function render() {
    if(!result)return;
    const cfg=result.config,model=$('view-model').value,n=Number($('view-n').value),data=result.models[model],endpoint=data.endpoints.find(e=>e.n===n),summary=data.summaries.find(s=>s.n===n),{mu,variance:v}=S.moments(model,cfg.p);
    snapshot();
    $('path-legend').innerHTML=data.paths.map((_,i)=>`<span><i style="--swatch:${colors[i]}"></i>Attacker ${i+1}</span>`).join('');
    for(const key of ['total','average','normalized'])trajectory(model,key,n);
    $('distribution-caption').textContent=`${model==='bernoulli'?'Bernoulli (p = '+cfg.p+')':'Symmetric Rademacher'}; n = ${n}; ${cfg.m.toLocaleString()} attacker endpoints. Use the checkpoint selector to compare increasing n.`;
    const hist=S.histogram(model,cfg.p,n,endpoint.values);
    for(const key of ['total','average','normalized']){const scale=key==='total'?1:key==='average'?1/n:1/Math.sqrt(n);drawHistogram('hist-'+key,hist.bins.map(b=>({...b,lo:b.lo*scale,hi:b.hi*scale})),{title:`${model}: ${key} score distribution at n=${n}`,xlabel:{total:'Sₙ',average:'Sₙ / n',normalized:'Sₙ / √n'}[key]});}
    $('histogram-note').textContent=`Identical lattice bins rescaled for each quantity. The displayed window covers every observed endpoint and at least the theoretical mean ±4 SD where possible. Exact probability outside the window: ${pc(hist.omitted)}; it is not renormalized away. Bin edges lie halfway between lattice points.`;
    const names={total:'Sₙ',average:'Sₙ / n',normalized:'Sₙ / √n'};
    $('moment-rows').innerHTML=data.summaries.map(s=>['total','average','normalized'].map(key=>`<tr${s.n===n?' class="selected"':''}><td>${s.n}</td><td>${names[key]}</td><td>${f(s[key].mean)}</td><td>${f(s.theory[key].mean)}</td><td>${f(s[key].variance)}</td><td>${f(s.theory[key].variance)}</td></tr>`).join('')).join('');
    lines('variance-chart',['total','average','normalized'].flatMap((key,i)=>[{name:names[key]+' observed',color:colors[i],points:data.summaries.map(s=>[s.n,s[key].variance])},{name:names[key]+' theory',color:colors[i],dash:true,points:data.summaries.map(s=>[s.n,s.theory[key].variance])}]),{logY:true,xlabel:'Systems n · logarithmic scale',ylabel:'Variance · log scale',title:'Three normalizations: measured variance versus theoretical variance'});
    lines('lln-chart',[{name:'Observed outside fraction',color:colors[0],points:data.summaries.map(s=>[s.n,s.tail])},{name:'Exact tail probability',color:colors[1],points:data.summaries.map(s=>[s.n,s.exactTail])},{name:'Chebyshev bound',color:colors[2],dash:true,points:data.summaries.map(s=>[s.n,s.bound])}],{zero:true,percent:true,ymax:1,xlabel:'Systems n · logarithmic scale',ylabel:'Outside-band probability',title:'Law of large numbers: observed and exact outside-band probabilities with Chebyshev bound'});
    $('lln-rows').innerHTML=data.summaries.map(s=>`<tr><td>${s.n}</td><td>${Math.round(s.tail*cfg.m)} / ${cfg.m}</td><td>${pc(s.tail)}</td><td>${pc(s.exactTail)}</td><td>${pc(Math.sqrt(s.exactTail*(1-s.exactTail)/cfg.m))}</td><td>${pc(s.bound)}</td></tr>`).join('');
    $('clt-explanation').textContent=model==='rademacher'?'Displayed model: Rademacher. The required Sₙ/√n is already Zₙ, with theoretical mean 0 and variance 1.':'Displayed model: Bernoulli. This section adds the centered and standardized Zₙ. The uncentered Sₙ/√n remains visible in the required three-distribution comparison above.';
    drawCLT(model,n,endpoint.values);
    const a=S.aggregate(model,cfg.p,n,endpoint.values);$('aggregate-total').textContent=f(a.total);$('aggregate-expected').textContent=f(a.expected);$('aggregate-sd').textContent=f(Math.sqrt(a.variance));$('aggregate-rate').textContent=f(a.perAttempt);
    const ms=[...new Set([50,200,1000,cfg.m].filter(m=>m<=cfg.m))].sort((a,b)=>a-b);
    $('attacker-rows').innerHTML=ms.map(m=>S.aggregate(model,cfg.p,n,endpoint.values.subarray(0,m))).map(a=>`<tr><td>${a.m}</td><td>${f(a.total)}</td><td>${f(a.expected)}</td><td>${f(a.perAttacker)}</td><td>${f(a.perAttempt)}</td><td>${f(a.rateSE)}</td></tr>`).join('');
    const first=data.summaries[0],last=data.summaries.at(-1);
    $('measured-conclusion').textContent=`In this ${model} run (seed ${cfg.seed}, m = ${cfg.m}), the observed variance of Sₙ/n changed from ${f(first.average.variance)} at n = ${first.n} to ${f(last.average.variance)} at n = ${last.n}; theory predicts ${f(first.theory.average.variance)} and ${f(last.theory.average.variance)}. With ε = ${cfg.epsilon}, the observed outside-band fraction changed from ${pc(first.tail)} to ${pc(last.tail)}. `+(v?`The empirical normal-CDF distance changed from ${f(first.empiricalD)} to ${f(last.empiricalD)}, while the exact finite-n distance changed from ${f(first.exactD)} to ${f(last.exactD)}. These measured values illustrate the model; they do not prove the limit theorems.`:'The Bernoulli scores are deterministic here, so the variance is zero and the CLT standardization is undefined.');
  }
  function controls() {
    $('run').disabled=busy;$('new-seed').disabled=busy;$('cancel').disabled=!busy;
    for(const id of inputIds)$(id).disabled=busy;
    for(const id of ['view-model','view-n'])$(id).disabled=busy||!result;
    for(const id of ['export-summary','export-endpoints','export-paths'])$(id).disabled=busy||!result||stale;
  }
  async function run(newSeed=false) {
    if(busy)return;
    if(newSeed){const a=new Uint32Array(1);crypto.getRandomValues(a);$('seed').value=String(a[0]);}
    $('simulation-error').textContent='';
    let cfg;try{cfg=S.config({n:$('systems').value,m:$('attackers-count').value,p:$('probability').value,epsilon:$('epsilon').value,seed:$('seed').value});}catch(e){$('simulation-error').textContent=e.message;$('run-status').textContent='Correct the inputs and run again. Previous results, if any, describe their stored settings.';return;}
    if(result&&JSON.stringify(cfg)!==JSON.stringify(result.config)){stale=true;$('results').classList.add('stale');snapshot();}
    busy=true;cancelled=false;controls();$('simulation-progress').value=0;$('run-status').textContent='Simulating both models…';await new Promise(r=>setTimeout(r,0));
    try{const next=await S.simulate(cfg,{cancelled:()=>cancelled,progress:p=>{$('simulation-progress').value=p;$('run-status').textContent=`Simulating: ${Math.round(p*100)}% of attacker trajectories completed…`;}});
      if(!next){$('run-status').textContent='Cancelled. Previous completed results, if any, are preserved.';return;}
      result=next;stale=false;$('results').classList.remove('stale');$('view-n').innerHTML=result.sizes.map(n=>`<option value="${n}"${n===cfg.n?' selected':''}>n = ${n.toLocaleString()}</option>`).join('');
      render();$('run-status').textContent=`Completed both models: ${(2*cfg.m*cfg.n).toLocaleString()} increments; ${cfg.m.toLocaleString()} attackers per model. All displayed results are calculated from this stored experiment.`;
    }catch(e){$('simulation-error').textContent=e.message;$('run-status').textContent='Simulation failed. Previous completed results, if any, are preserved.';}
    finally{busy=false;controls();}
  }
  function summaryCSV(){const rows=['model,p,seed,m,epsilon,n,quantity,observed_mean,theory_mean,observed_unbiased_variance,theory_variance,outside_fraction,exact_outside_probability,chebyshev_bound,empirical_normal_cdf_distance,exact_normal_cdf_distance'];const c=result.config;for(const model of ['bernoulli','rademacher'])for(const s of result.models[model].summaries)for(const k of ['total','average','normalized'])rows.push([model,model==='bernoulli'?c.p:.5,c.seed,c.m,c.epsilon,s.n,k,s[k].mean,s.theory[k].mean,s[k].variance,s.theory[k].variance,s.tail,s.exactTail,s.bound,s.empiricalD??'',s.exactD??''].join(','));return rows.join('\n');}
  function endpointsCSV(){const rows=['model,p,seed,m,n,attacker,total,average,normalized_total,centered_standardized'];const c=result.config;for(const model of ['bernoulli','rademacher']){const {mu,variance:v}=S.moments(model,c.p);for(const e of result.models[model].endpoints)e.values.forEach((s,a)=>rows.push([model,model==='bernoulli'?c.p:.5,c.seed,c.m,e.n,a+1,s,s/e.n,s/Math.sqrt(e.n),v?(s-e.n*mu)/Math.sqrt(e.n*v):''].join(',')));}return rows.join('\n');}
  function pathsCSV(){const rows=['model,p,seed,attacker,system_i,total,average,normalized_total'];const c=result.config;for(const model of ['bernoulli','rademacher'])result.models[model].paths.forEach((path,a)=>{for(let i=1;i<=c.n;i++)rows.push([model,model==='bernoulli'?c.p:.5,c.seed,a+1,i,path[i],path[i]/i,path[i]/Math.sqrt(i)].join(','));});return rows.join('\n');}
  $('run').addEventListener('click',()=>run());$('new-seed').addEventListener('click',()=>run(true));$('cancel').addEventListener('click',()=>{cancelled=true;});
  for(const id of ['view-model','view-n'])$(id).addEventListener('change',render);
  for(const id of inputIds)$(id).addEventListener('input',()=>{stale=true;$('results').classList.add('stale');$('run-status').textContent='Inputs changed. Run both models to update. Displayed results still refer to the stored experiment.';controls();snapshot();});
  for(const [id,name,build] of [['export-summary','summary',summaryCSV],['export-endpoints','endpoints',endpointsCSV],['export-paths','paths',pathsCSV]])$(id).addEventListener('click',()=>{if(result&&!busy&&!stale)download('lesson3-'+name+'.csv',build());});
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(result&&!busy)render();},200);});
  controls();run();
})();
