(() => {
  const {$,esc,download}=UI,{fmt,measure}=Lab5,A=Normal5,refs=Normal5Reference;
  const cdfFmt=p=>p!==null&&p>0&&p>=.9999?p.toPrecision(17):fmt(p,15);
  let current;
  function bell(z){
    const edge=Math.max(4.2,Math.abs(z)+.65),L=40,R=571,B=205;
    const X=x=>L+(x+edge)*(R-L)/(2*edge),Y=x=>B-390*A.density(x);
    const path=(a,b)=>Array.from({length:181},(_,j)=>{const x=a+(b-a)*j/180;return (j?'L':'M')+X(x)+' '+Y(x);}).join(' ');
    const curve=path(-edge,edge),shade=path(-edge,z)+'L'+X(z)+' '+B+'H'+L+'Z';
    return `<svg class="lab5-plot" viewBox="0 0 600 247" role="img" aria-label="Standard normal density with the area left of z = ${z} shaded"><path d="${shade}" fill="#f2c3da"/><path class="lab5-axis" d="M${L} ${B}H${R}"/><path d="${curve}" class="lab5-curve"/><path d="M${X(z)} 29V${B}" stroke="#a82c69" stroke-dasharray="5 4"/><text x="${X(z)}" y="21" text-anchor="middle">z = ${fmt(z,6)}</text><text x="${X(0)}" y="230" text-anchor="middle">0</text><text x="${R}" y="230" text-anchor="end">standardized score</text></svg>`;
  }
  function row(name,v,ref){
    if(!v)return `<tr><th scope="row">${name}</th><td colspan="5">Series demonstration is limited to |z| ≤ 4.</td></tr>`;
    const valid=v.tail>=0&&v.tail<=.5;
    return `<tr><th scope="row">${name}</th><td>${cdfFmt(v.cdf)}${valid?'':' <span class="lab5-error">invalid probability</span>'}</td><td>${fmt(v.tail,11)}</td><td>${ref?fmt(Math.abs(v.cdf-Number(ref.cdf))):'—'}</td><td>${ref?fmt(Math.abs(v.tail-Number(ref.tail))/Number(ref.tail)):'—'}</td><td>${v.work} · ${esc(v.detail)}</td></tr>`;
  }
  function render(){
    const raw=$('z').value,z=Number(raw),n=Number($('simpson-n').value),m=Number($('series-m').value);
    if(raw===''||!Number.isFinite(z)||Math.abs(z)>8){
      current=null;$('cdf-feedback').textContent='Enter a finite z between −8 and 8.';$('cdf-feedback').classList.add('lab5-error');$('cdf-results').hidden=true;
      $('cdf-bench').disabled=$('cdf-export').disabled=true;$('cdf-timing').textContent='Enter a valid z before timing.';return;
    }
    $('cdf-results').hidden=false;$('cdf-bench').disabled=$('cdf-export').disabled=false;$('cdf-feedback').classList.remove('lab5-error');
    const c=A.cody(z),ref=refs.find(r=>r.z===z);
    $('cdf-feedback').textContent=ref?'Independent reference available for this test point.':'Custom point: use a preset for an independent error comparison.';
    $('bell').innerHTML=bell(z);$('cdf-value').textContent=cdfFmt(c.cdf);$('tail-value').textContent=fmt(c.tail,12);
    $('tail-label').textContent=z<0?'Left tail Φ(z)':'Right tail 1 − Φ(z)';
    $('selected-ref').textContent=ref?cdfFmt(Number(ref.cdf)):'—';
    $('cdf-rows').innerHTML=row('Cody rational approximation',c,ref)+row('Composite Simpson',A.simpson(z,n),ref)+row('erf power series',A.series(z,m),ref);
    const data=refs.map(r=>{
      const x=r.z,a=A.cody(x),b=A.simpson(x,n),s=A.series(x,m);
      return {...r,cody:a.cdf,simpson:b.cdf,series:s?.cdf??null,codyTail:a.tail,simpsonTail:b.tail,seriesTail:s?.tail??null};
    });
    $('validation-rows').innerHTML=data.map(r=>`<tr><th scope="row">${r.z}</th><td>${cdfFmt(Number(r.cdf))}</td><td>${r.nist===null?'—':Number(r.nist).toFixed(5)}</td><td>${fmt(Math.abs(r.cody-Number(r.cdf)))}</td><td>${fmt(Math.abs(r.simpson-Number(r.cdf)))}</td><td>${r.series===null?'—':fmt(Math.abs(r.series-Number(r.cdf)))}</td><td>${fmt(Math.abs(r.simpsonTail-Number(r.tail))/Number(r.tail))}</td></tr>`).join('');
    const probe=ref&&z!==0?ref:refs.find(r=>r.z===-3);
    const Ns=[8,16,32,64,128,256,512,1024,2048],q=Number(probe.tail);
    const trace=Ns.map(j=>[j,Math.abs(A.simpson(probe.z,j).tail-q)/q]);
    const err=Math.abs(A.cody(probe.z).tail-q)/q;
    $('probe-note').textContent=`Convergence probe z = ${probe.z}. The error measures the smaller tail, so rounding Φ near one does not hide it.`;
    Plots4.lines('cdf-convergence',[{name:'Simpson',color:'#b51f65',markers:true,points:trace},{name:'Cody baseline',color:'#6941c6',dash:true,points:Ns.map(j=>[j,err])}],{logX:true,logY:true,xlabel:'Simpson subintervals',ylabel:'Relative tail error',title:'Simpson convergence and fixed Cody approximation error'});
    $('cdf-convergence-rows').innerHTML=trace.map(([j,e])=>`<tr><td>${j}</td><td>${j+1}</td><td>${fmt(e)}</td><td>${fmt(err)}</td></tr>`).join('');
    $('cdf-timing').textContent='Run timing to compare all three methods on the same center-to-tail test batch.';
    current={data,n,m};
  }
  for(const id of ['z','simpson-n','series-m'])$(id).addEventListener(id==='z'?'input':'change',render);
  document.querySelectorAll('[data-z]').forEach(btn=>btn.addEventListener('click',()=>{$('z').value=btn.dataset.z;render();}));
  $('cdf-bench').addEventListener('click',()=>{
    const {n,m}=current,points=[-4,-3,-1.96,-.5,.5,1.96,3,4];
    const batch=fn=>()=>points.reduce((s,z)=>s+fn(z).tail,0);
    $('cdf-timing').textContent='Median per batch of eight points on this device: Cody '+measure(batch(A.cody),100)+'; Simpson '+measure(batch(z=>A.simpson(z,n)),100)+'; series '+measure(batch(z=>A.series(z,m)),100)+'.';
  });
  $('cdf-export').addEventListener('click',()=>download('normal-cdf-validation.csv','z,high_precision_cdf,high_precision_small_tail,nist_cdf,cody_cdf,simpson_cdf,series_cdf,cody_small_tail,simpson_small_tail,series_small_tail,simpson_n,series_terms\n'+current.data.map(r=>[r.z,r.cdf,r.tail,r.nist,r.cody,r.simpson,r.series,r.codyTail,r.simpsonTail,r.seriesTail,current.n,current.m].join(',')).join('\n')));
  render();
})();
