/* Shared presentation helpers. No remote requests or analytics. */
window.UI = (()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const point=P=>P===null?'O':`(${P.x}, ${P.y})`;
  const fmt=n=>n===null||!Number.isFinite(n)?'Undefined':n.toFixed(3);
  function bars(target,values,labels,opts={}){
    const w=640,h=230,L=42,R=16,T=20,B=42,plot=h-T-B;
    const max=opts.max||Math.max(...values,opts.expected||0,1)*1.14;
    const step=(w-L-R)/values.length,bw=Math.max(1,step*.66);
    let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(opts.title||'Frequency chart')}">`;
    for(let i=0;i<=4;i++){const v=max*i/4,y=h-B-v/max*plot;svg+=`<path d="M${L} ${y}H${w-R}" class="gridline"/><text x="${L-8}" y="${y+4}" text-anchor="end" class="axis">${opts.percent?Math.round(v*100)+'%':Number(v.toFixed(1))}</text>`;}
    if(opts.expected!==undefined){const y=h-B-opts.expected/max*plot;svg+=`<path d="M${L} ${y}H${w-R}" class="reference"/>`;}
    values.forEach((v,i)=>{const x=L+i*step+(step-bw)/2,y=h-B-v/max*plot;svg+=`<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(0,v/max*plot)}" rx="2" class="bar ${opts.orange?'orange':''}"><title>${esc(labels[i])}: ${opts.percent?(v*100).toFixed(2)+'%':v}</title></rect>`;
      if(values.length<35)svg+=`<text x="${x+bw/2}" y="${h-B+20}" text-anchor="middle" class="axis">${esc(labels[i])}</text>`;
    });
    svg+='</svg>';$(target).innerHTML=svg;
  }
  function scatter(target,rows,key){
    const w=640,h=230,L=42,R=20,T=20,B=35,n=rows.length;
    let s=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Private key k against output coordinate ${key}">`;
    for(let y=0;y<=16;y+=4){const py=h-B-y/16*(h-B-T);s+=`<path d="M${L} ${py}H${w-R}" class="gridline"/><text x="${L-9}" y="${py+4}" class="axis" text-anchor="end">${y}</text>`;}
    rows.forEach(r=>{const x=L+(r.k-1)/Math.max(n-1,1)*(w-L-R),y=h-B-r.point[key]/16*(h-B-T);s+=`<circle cx="${x}" cy="${y}" r="5" class="scatter-dot"><title>k=${r.k}; ${key}=${r.point[key]}</title></circle><text x="${x}" y="${h-12}" text-anchor="middle" class="axis">${r.k}</text>`;});
    s+='</svg>';$(target).innerHTML=s;
  }
  function download(name,content,type='text/csv'){
    const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
  document.querySelectorAll('[data-print]').forEach(b=>b.addEventListener('click',()=>window.print()));
  return {$,esc,point,fmt,bars,scatter,download};
})();
