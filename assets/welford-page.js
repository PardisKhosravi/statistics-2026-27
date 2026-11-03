(()=>{
  'use strict';const {$,esc,download}=UI,W=WelfordLab,{f}=Plots4;
  let values=[],state=W.empty(),rows=[],timer=null,dirty=false;
  function stop(){clearInterval(timer);timer=null;$('play').textContent='Play slowly';}
  function controls(){const end=state.n>=values.length;for(const id of ['next','all','play'])$(id).disabled=dirty||end;$('export-trace').disabled=!rows.length||dirty;}
  function render(){
    $('count-out').textContent=state.n;$('mean-out').textContent=state.n?f(state.mean):'—';$('ss-out').textContent=f(state.SS);$('variance-out').textContent=f(W.sampleVariance(state)??NaN);
    $('trace-rows').innerHTML=rows.map(r=>`<tr><td>${r.n}</td><td>${f(r.x)}</td><td>${f(r.delta)}</td><td>${f(r.mean)}</td><td>${f(r.SS)}</td><td>${f(r.SS/r.n)}</td><td>${f(r.variance??NaN)}</td></tr>`).join('');
    const r=rows.at(-1);$('moves').innerHTML=r?`<div><small>01 · Old-mean deviation</small>δ = ${f(r.x)} − ${f(r.oldMean)} = ${f(r.delta)}</div><div><small>02 · Update the mean</small>M = ${f(r.oldMean)} + ${f(r.delta)} / ${r.n} = ${f(r.mean)}</div><div><small>03 · Update corrected SS</small>SS = ${f(r.oldSS)} + ${f(r.delta)} × (${f(r.x)} − ${f(r.mean)}) = ${f(r.SS)}</div>`:'<p class="note">Choose Next observation to start the trace.</p>';
    if(r){const b=W.twoPass(values.slice(0,state.n));$('reference-check').textContent=`Two-pass mean: ${f(b.mean)}; SS: ${f(b.SS)}; sample variance: ${f(b.variance??NaN)}. Absolute SS difference: ${f(Math.abs(b.SS-state.SS))}. ${state.n===1?'Sample variance is undefined with one observation.':''}`;}
    else $('reference-check').textContent='No observations yet. The mean and sample variance are undefined; SS is initialized to zero.';
    controls();
  }
  function step(){if(dirty||state.n>=values.length){stop();return;}const x=values[state.n],oldMean=state.mean,oldSS=state.SS,delta=x-oldMean;W.push(state,x);rows.push({...state,x,oldMean,oldSS,delta,variance:W.sampleVariance(state)});render();$('trace-status').textContent=`Processed ${state.n} of ${values.length} observations.${state.n===values.length?' Complete.':''}`;if(state.n===values.length)stop();}
  function load(){stop();$('trace-error').textContent='';try{const next=W.parse($('sequence').value);values=next;state=W.empty();rows=[];dirty=false;$('trace-status').textContent=`Loaded ${values.length} observations. Reveal the calculation with Next observation.`;render();}catch(e){dirty=true;$('trace-error').textContent=e.message;$('trace-status').textContent='Correct the sequence and load it again.';controls();}}
  function stability(){const r=W.stability(Number($('offset').value));$('stability-rows').innerHTML=[['Exact reference (translation invariance)',r.reference],['Welford',r.welford],['Two-pass deviations',r.twoPass],['Naive squared-sum subtraction',r.naive]].map(([name,x])=>`<tr><td>${esc(name)}</td><td>${f(x)}</td><td>${f(Math.abs(x-r.reference))}</td></tr>`).join('');}
  $('load').addEventListener('click',load);$('next').addEventListener('click',step);$('all').addEventListener('click',()=>{stop();while(!dirty&&state.n<values.length)step();});$('play').addEventListener('click',()=>{if(timer){stop();return;}$('play').textContent='Pause';step();if(state.n<values.length)timer=setInterval(step,700);});$('reset').addEventListener('click',load);
  $('sequence').addEventListener('input',()=>{dirty=true;stop();$('trace-status').textContent='Sequence changed. Load it to replace the stored trace.';controls();});$('offset').addEventListener('change',stability);
  $('export-trace').addEventListener('click',()=>{if(!dirty&&rows.length)download('welford-trace.csv','k,score,old_mean,delta,new_mean,SS,descriptive_variance,sample_variance\n'+rows.map(r=>[r.n,r.x,r.oldMean,r.delta,r.mean,r.SS,r.SS/r.n,r.variance??''].join(',')).join('\n'));});
  window.addEventListener('pagehide',stop);load();stability();
})();
