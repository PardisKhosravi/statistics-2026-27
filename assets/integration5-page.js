(() => {
  const {$,esc,download}=UI,{fmt,measure}=Lab5,I=Integration5;
  let current;
  function plot(f,n,band){
    const L=51,R=496,T=24,B=219,W=R-L;
    const X=x=>L+W*(x-f.a)/(f.b-f.a),Y=y=>B-(B-T)*y/(f.max*1.08);
    let inside='';
    if(band) {
      inside+=`<rect x="${L}" y="${Y(band.hi)}" width="${W}" height="${Y(band.lo)-Y(band.hi)}" fill="#e9d7f4"/>`;
      inside+=band.parts.map(([a,b])=>`<path d="M${X(a)} ${Y(band.lo)}V${B+11}H${X(b)}V${Y(band.lo)}" stroke="#8846a0" stroke-dasharray="4 4" fill="none"/><path d="M${X(a)} ${B+11}H${X(b)}" stroke="#8846a0" stroke-width="5"/>`).join('');
    }else{
      const h=(f.b-f.a)/n;
      for(let j=0;j<n;j++) {
        const y=Y(f.fn(f.a+(j+.5)*h));
        inside+=`<rect x="${X(f.a+j*h)}" y="${y}" width="${W/n}" height="${B-y}" fill="#f2c3da" stroke="#a83970" stroke-width="0.7"/>`;
      }
    }
    const curve=Array.from({length:241},(_,j)=>{const x=f.a+(f.b-f.a)*j/240;return (j?'L':'M')+X(x)+' '+Y(f.fn(x));}).join(' ');
    return `<svg class="lab5-plot" viewBox="0 0 520 268" role="img" aria-label="${esc(band?'Selected height band and its preimage intervals':'Midpoint rectangles under '+f.label)}">${inside}<path class="lab5-axis" d="M${L} ${T}V${B}H${R}" fill="none"/><path class="lab5-curve" d="${curve}"/><text x="${L-8}" y="${Y(f.max)+5}" text-anchor="end">${fmt(f.max,4)}</text><text x="12" y="18">f(x)</text><text x="${L}" y="253" text-anchor="middle">${fmt(f.a,5)}</text><text x="${R}" y="253" text-anchor="middle">${fmt(f.b,5)}</text><text x="277" y="253" text-anchor="middle">x</text></svg>`;
  }
  function paintBand(){
    const {f,k,r}=current;
    const j=Math.max(0,Math.min(k-1,Number($('band').value)-1)),b=r.rows[j];
    $('band-out').textContent=`Band ${j+1} of ${k}`;
    $('range-plot').innerHTML=plot(f,0,b);
    $('band-info').innerHTML=`<strong>Heights [${fmt(b.lo)}, ${fmt(b.hi)}${j===k-1?']':')'}</strong><br>Preimage: ${b.parts.length?b.parts.map(([a,c])=>'['+fmt(a)+', '+fmt(c)+']').join(' ∪ '):'no interval of positive length'} · total length <strong>${fmt(b.mass)}</strong>.<br>Contribution: ${fmt(b.mid)} × ${fmt(b.mass)} = <strong>${fmt(b.contribution)}</strong>.`;
  }
  function render(){
    const fs=I.cases(Number($('epsilon').value)),f=fs.find(g=>g.id===$('function-select').value);
    const n=Number($('domain-n').value),k=Number($('value-k').value),d=I.midpoint(f,n),r=I.bands(f,k);
    current={f,n,k,r};
    $('cutoff-wrap').hidden=f.id!=='singular';
    $('function-note').textContent=f.description+' Interval: ['+fmt(f.a)+', '+fmt(f.b)+'].';
    $('band').max=k;$('band').value=Math.min(k,Number($('band').value));
    $('domain-plot').innerHTML=plot(f,Math.min(n,64));
    $('domain-caption').textContent=n<=64?`Actual ${n} midpoint rectangles.`:`Drawing uses 64 rectangles for readability; the reported estimate uses N = ${n}.`;
    paintBand();
    $('target').textContent=fmt(f.exact,11);$('domain-result').textContent=fmt(d.value,11);$('range-result').textContent=fmt(r.value,11);
    $('band-bounds').textContent=`Range brackets: ${fmt(r.lower,11)} ≤ integral ≤ ${fmt(r.upper,11)} (up to roundoff and inverse-solver error).`+
      (f.tail?` Full integral = 2; the omitted tail on (0, ε) is ${fmt(f.tail)}. Errors below are against the truncated target.`:'');
    $('integration-rows').innerHTML=fs.map(g=>{
      const a=I.midpoint(g,n),b=I.bands(g,k);
      return `<tr${g===f?' class="selected"':''}><th scope="row">${esc(g.label)}</th><td>${fmt(g.exact,10)}</td><td>${fmt(a.value,10)}</td><td>${fmt(Math.abs(a.value-g.exact))}</td><td>${fmt(b.value,10)}</td><td>${fmt(Math.abs(b.value-g.exact))}</td></tr>`;
    }).join('');
    const levels=[4,8,16,32,64,128,256,512,1024];
    const values=levels.map(j=>{
      const a=I.midpoint(f,j),b=I.bands(f,j);return [j,Math.abs(a.value-f.exact),Math.abs(b.value-f.exact),b.upper-b.lower,b.evaluations];
    });
    current.values=values;
    const shown=e=>e>2e-15?e:NaN;
    const series=[{name:'Domain midpoint',color:'#b51f65',points:values.map(a=>[a[0],shown(a[1])]),markers:true},{name:'Range midpoint',color:'#6941c6',points:values.map(a=>[a[0],shown(a[2])]),markers:true}];
    Plots4.lines('integration-convergence',series,{logX:true,logY:true,xlabel:'Partition size (N or K)',ylabel:'Absolute error · log scale',title:'Integration error versus number of partitions'});
    $('convergence-rows').innerHTML=values.map(a=>`<tr>${a.map(x=>'<td>'+fmt(x)+'</td>').join('')}</tr>`).join('');
    $('cost-note').textContent=`At the selected resolution: domain uses ${d.evaluations} evaluations of f; range computes ${r.thresholds} interior thresholds and ${r.evaluations} evaluations of f. Zero evaluations here means an explicit inverse was used, not zero computational work.`;
    $('int-timing').textContent='Run timing to measure the selected function and resolutions.';
  }
  for(const id of ['function-select','domain-n','value-k','epsilon'])$(id).addEventListener('change',render);
  $('band').addEventListener('input',paintBand);
  $('int-bench').addEventListener('click',()=>{
    const {f,n,k}=current;
    $('int-timing').textContent='Median per estimate on this device: midpoint '+measure(()=>I.midpoint(f,n).value,40)+'; range bands '+measure(()=>I.bands(f,k).value,40)+'.';
  });
  $('int-export').addEventListener('click',()=>download('integration-convergence.csv','case,a,b,target,N_and_K,domain_absolute_error,range_absolute_error,range_bracket_width,range_f_evaluations\n'+current.values.map(r=>[current.f.id,current.f.a,current.f.b,current.f.exact,...r].join(',')).join('\n')));
  $('thomae-rows').innerHTML=[8,32,128,512].map(n=>`<tr><td>${n}</td><td>${fmt(I.thomae(n))}</td><td>0</td></tr>`).join('');
  render();
})();
