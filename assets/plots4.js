/* Small SVG plotting helpers; probability histograms, no chart library. */
window.Plots4 = (()=>{
  const {$,esc}=UI,colors=['#b51f65','#6941c6','#087c83','#b45610','#244e91','#30152d'];
  const f=x=>!Number.isFinite(x)?'—':x!==0&&(Math.abs(x)<.001||Math.abs(x)>=100000)?x.toExponential(3):Number(x.toFixed(5)).toLocaleString('en-US',{maximumFractionDigits:5});
  function frame(id,{xmin,xmax,ymin,ymax,logX=false,logY=false,xlabel='',ylabel='',title='',xticks=null}) {
    const w=Math.max(290,Math.min(1100,$(id).clientWidth||640)),h=260,L=65,R=22,T=24,B=47;
    if(xmin===xmax){xmin-=.5;xmax+=.5;}if(ymin===ymax){ymin=Math.min(0,ymin);ymax+=1;}
    const tx=x=>logX?Math.log10(x):x,ty=x=>logY?Math.log10(x):x;
    const X=x=>L+(tx(x)-tx(xmin))/(tx(xmax)-tx(xmin))*(w-L-R),Y=y=>h-B-(ty(y)-ty(ymin))/(ty(ymax)-ty(ymin))*(h-T-B);
    const tick=x=>x===0?'0':Math.abs(x)<.001||Math.abs(x)>=10000?x.toExponential(1):String(Number(x.toPrecision(3)));
    let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;
    for(let i=0;i<5;i++){const v=logY?10**(ty(ymin)+(ty(ymax)-ty(ymin))*i/4):ymin+(ymax-ymin)*i/4;svg+=`<path d="M${L} ${Y(v)}H${w-R}" class="plot-grid"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end" class="plot-label">${tick(v)}</text>`;}
    const ticks=xticks||Array.from({length:5},(_,i)=>xmin+(xmax-xmin)*i/4);
    for(const x of ticks)svg+=`<text x="${X(x)}" y="${h-B+20}" text-anchor="middle" class="plot-label">${tick(x)}</text>`;
    svg+=`<text x="${L}" y="13" class="plot-label">${esc(ylabel)}</text><text x="${(L+w-R)/2}" y="${h-4}" text-anchor="middle" class="plot-label">${esc(xlabel)}</text>`;
    return {X,Y,finish:content=>{$(id).innerHTML=svg+content+'</svg>';}};
  }
  function lines(id,series,{logX=false,logY=false,xlabel='',ylabel='',title='',xticks=null,zero=false,domain=null}={}) {
    const valid=series.flatMap(s=>s.points).filter(([x,y])=>Number.isFinite(y)&&(!logY||y>0));
    if(!valid.length){$(id).innerHTML='<p>No values available at this sample size.</p>';return;}
    let xmin=Math.min(...valid.map(x=>x[0])),xmax=Math.max(...valid.map(x=>x[0])),lo=Math.min(...valid.map(x=>x[1])),hi=Math.max(...valid.map(x=>x[1]));
    let ymin=logY?lo/1.25:zero?Math.min(0,lo):lo-Math.max((hi-lo)*.12,.02),ymax=logY?hi*1.25:hi+Math.max((hi-lo)*.12,.02);if(domain)[ymin,ymax]=domain;
    const g=frame(id,{xmin,xmax,ymin,ymax,logX,logY,xlabel,ylabel,title,xticks});let out='';
    for(const s of series){let points=[];const flush=()=>{if(points.length)out+=`<path fill="none" stroke="${s.color}" stroke-width="${s.width||1.8}" ${s.dash?'stroke-dasharray="6 4"':''} d="${points.map(([x,y],i)=>(i?'L':'M')+g.X(x)+','+g.Y(y)).join(' ')}"/>`;points=[];};for(const [x,y] of s.points){if(!Number.isFinite(y)||(logY&&y<=0)){flush();continue;}points.push([x,y]);if(s.markers)out+=`<circle cx="${g.X(x)}" cy="${g.Y(y)}" r="3" fill="${s.color}"><title>${esc(s.name)}: n=${x}, ${f(y)}</title></circle>`;}flush();}
    g.finish(out);
  }
  function histogram(id,values,target,{title,range=null,xlabel='Value',maxValue=10}={}) {
    let lo=range?range[0]:Math.max(0,Math.min(target,...values)),hi=range?range[1]:Math.min(maxValue,Math.max(target,...values));
    if(!range){const pad=Math.max((hi-lo)*.08,.02);lo=Math.max(0,lo-pad);hi=Math.min(maxValue,hi+pad);}if(lo===hi){lo=Math.max(0,lo-.5);hi+=.5;}
    const count=range?80:30,width=(hi-lo)/count,bins=Array(count).fill(0);for(const x of values)bins[Math.max(0,Math.min(count-1,Math.floor((x-lo)/width)))]++;
    const g=frame(id,{xmin:lo,xmax:hi,ymin:0,ymax:Math.max(...bins)/values.length*1.15,xlabel,ylabel:'Probability per bin',title});let out='';
    bins.forEach((v,i)=>{const x=g.X(lo+i*width),w=g.X(lo+(i+1)*width)-x,p=v/values.length;out+=`<rect x="${x+w*.05}" y="${g.Y(p)}" width="${w*.9}" height="${g.Y(0)-g.Y(p)}" fill="#b51f65"><title>${f(lo+i*width)} to ${f(lo+(i+1)*width)}: ${v}/${values.length}</title></rect>`;});out+=`<path d="M${g.X(target)} ${g.Y(0)}V${g.Y(Math.max(...bins)/values.length*1.15)}" stroke="#6941c6" stroke-width="2" stroke-dasharray="6 4"/>`;g.finish(out);
  }
  function downsample(values,start=1) {const n=values.length-1,stride=Math.max(1,Math.ceil(n/250)),indices=new Set([start,n]);for(let k=start;k<=n;k+=stride){let min=k,max=k;for(let i=k;i<=Math.min(n,k+stride-1);i++){if(values[i]<values[min])min=i;if(values[i]>values[max])max=i;}indices.add(min);indices.add(max);}return [...indices].sort((a,b)=>a-b).map(i=>[i,values[i]]);}
  return {f,colors,lines,histogram,downsample};
})();
