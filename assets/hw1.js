(()=>{
  'use strict';
  const {$,esc,point,fmt,bars,scatter,download}=UI,T=Toy;
  let G={x:1,y:5},k=6,rows=[],position=6,timer=null,data;
  $('base').innerHTML=T.points.map(P=>`<option value="${P.x},${P.y}">${point(P)} · order ${T.order(P)}</option>`).join('');$('base').value='1,5';
  function stop(){if(timer!==null)clearTimeout(timer);timer=null;$('play').textContent='▶ Replay';}
  function curve(){
    const W=560,L=43,R=22,Tp=18,B=34,scale=(W-L-R)/16,H=Tp+B+16*scale;
    const sx=x=>L+x*scale,sy=y=>H-B-y*scale;
    let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="All 17 finite points of the toy curve, with scalar-multiplication steps highlighted">`;
    for(let i=0;i<=16;i++){
      s+=`<path d="M${sx(i)} ${Tp}V${H-B}M${L} ${sy(i)}H${W-R}" class="gridline"/>`;
      if(i%4===0)s+=`<text x="${sx(i)}" y="${H-12}" text-anchor="middle" class="axis">${i}</text><text x="${L-12}" y="${sy(i)+4}" text-anchor="end" class="axis">${i}</text>`;
    }
    let previous=null;
    for(const row of rows.slice(0,position)){
      const P=row.point;
      if(previous&&P)s+=`<path d="M${sx(previous.x)} ${sy(previous.y)}L${sx(P.x)} ${sy(P.y)}" fill="none" stroke="#79a18b" stroke-width="1.5" stroke-dasharray="4 5"/>`;
      previous=P;
    }
    const current=position?rows[position-1].point:null;
    T.points.forEach(P=>{
      const isG=T.eq(P,G),visited=rows.slice(0,position).some(r=>T.eq(r.point,P));
      s+=`<circle cx="${sx(P.x)}" cy="${sy(P.y)}" r="${isG?6:5}" fill="${isG?'#ca6d42':visited?'#71a38d':'#c2cdbd'}"><title>${point(P)}${isG?' · base G':''}</title></circle>`;
      if(T.eq(current,P))s+=`<circle cx="${sx(P.x)}" cy="${sy(P.y)}" r="11" fill="none" stroke="#287464" stroke-width="2.5"/><text x="${sx(P.x)+14}" y="${sy(P.y)-12}" class="axis" style="fill:#203638">${position}G</text>`;
    });
    s+=`<text x="${W-9}" y="${H-13}" class="axis">x</text><text x="12" y="17" class="axis">y</text></svg>`;$('curve').innerHTML=s;
    $('replay-progress').style.width=(position/k*100)+'%';
    $('step-status').textContent=position===0?'Start at O, the identity point.':`${position} / ${k}: ${position}G = ${point(current)}. ${rows[position-1].explanation}`;
    $('trace').querySelectorAll('tr').forEach((tr,i)=>tr.classList.toggle('active-row',i===position-1));
  }
  function renderStats(){
    data=T.stats(G);const n=data.rows.length;
    $('stats-metrics').innerHTML=[['Valid scalars',n],['Subgroup order',data.n],['H(X), bits',fmt(data.hx)],['H(Y), bits',fmt(data.hy)]].map(([label,val])=>`<div class="metric"><strong>${val}</strong><span>${label}</span></div>`).join('');
    $('dataset-note').textContent=`Census: G = ${point(G)}, k = 1,…,${n}. ${n} distinct finite outputs, each with probability 1/${n}. The full curve has 17 finite points plus O (18 group elements). O is excluded from coordinate statistics.`;
    const labels=Array.from({length:17},(_,i)=>i);
    bars('x-frequency',data.fx,labels,{title:'Frequency of each x coordinate over all valid subgroup scalars'});
    bars('y-frequency',data.fy,labels,{title:'Frequency of each y coordinate over all valid subgroup scalars',orange:true});
    bars('bit-frequency',data.ones.map(v=>v/n),['x₄','x₃','x₂','x₁','x₀','y₄','y₃','y₂','y₁','y₀'],{title:'Proportion of ones in each coordinate bit',max:1,expected:.5,percent:true});
    scatter('correlation-chart',data.rows,'x');
    $('x-comment').textContent=`${data.fx.filter(v=>v>0).length} distinct x-values. Inverse points share x: (x, y) and (x, −y mod 17).`;
    $('correlation-note').textContent=`Pearson r(k, x) = ${fmt(data.rx)}; r(k, y) = ${fmt(data.ry)}. A low value does not establish independence or security.`;
    $('dataset').innerHTML=data.rows.map(r=>`<tr><td>${r.k}</td><td>${point(r.point)}</td><td><code>${r.point.x.toString(2).padStart(5,'0')}</code></td><td><code>${r.point.y.toString(2).padStart(5,'0')}</code></td></tr>`).join('');
    $('counts').innerHTML=labels.map(i=>`<tr><td>${i}</td><td>${data.fx[i]}</td><td>${data.fy[i]}</td></tr>`).join('');
    $('avalanche-pairs').innerHTML=data.pairs.map(r=>`<tr><td>${r.k} ↔ ${r.j}</td><td>${point(r.P)} ↔ ${point(r.Q)}</td><td>${r.distance} / 10</td></tr>`).join('')||'<tr><td colspan="3">No valid one-bit pairs exist for this subgroup.</td></tr>';
    const avg=data.pairs.length?data.pairs.reduce((a,b)=>a+b.distance,0)/data.pairs.length:null;
    $('avalanche-summary').textContent=avg===null?'No pairs to compare.':`${data.pairs.length} pairs · mean ${avg.toFixed(2)} / 10 changed bits (${(avg*10).toFixed(1)}%).`;
  }
  function calculate(){
    stop();$('input-error').textContent='';const input=Number($('scalar').value);
    if(!Number.isInteger(input)||input<1||input>72){$('input-error').textContent='Enter an integer from 1 to 72.';return;}
    const [x,y]=$('base').value.split(',').map(Number);G={x,y};k=input;rows=T.sequence(k,G);position=k;
    const result=rows.at(-1).point,n=T.order(G);
    $('public-result').textContent=point(result);
    $('order-note').textContent=`Order(G) = ${n}; ${n}G = O. ${result===null?'This scalar gives the identity and is not a valid toy private key.':k>=n?'This demonstration scalar repeats a smaller scalar modulo the subgroup order.':`Canonical toy private-key range: 1–${n-1}.`}`;
    $('trace').innerHTML=rows.map(r=>`<tr><td>${r.k}G</td><td>${point(r.before)} + ${point(G)}</td><td><code>${point(r.point)}</code></td><td>${esc(r.explanation)}</td></tr>`).join('');
    const fast=T.fastTrace(k,G);
    $('fast-trace').innerHTML=fast.map(r=>`<tr><td>${r.bit}</td><td>${r.type}</td><td>${point(r.point)}</td></tr>`).join('');
    $('fast-summary').textContent=`k = ${k} = ${k.toString(2)}₂. Repeated-addition trace: ${k} additions (including O + G). Binary trace: ${fast.length} operations (including identity operations). Both return ${point(result)}.`;
    curve();renderStats();
  }
  function advance(){if(position<k){position++;curve();}}
  function tick(){advance();if(position<k)timer=setTimeout(tick,Number($('speed').value));else stop();}
  $('calculate').onclick=calculate;$('base').onchange=calculate;
  $('scalar').addEventListener('keydown',e=>{if(e.key==='Enter')calculate();});
  $('play').onclick=()=>{if(timer!==null){stop();return;}if(position>=k)position=0;curve();$('play').textContent='Ⅱ Pause';timer=setTimeout(tick,Number($('speed').value));};
  $('step').onclick=()=>{stop();if(position>=k)position=0;advance();};
  $('restart').onclick=()=>{stop();position=0;curve();};
  $('reset').onclick=()=>{$('base').value='1,5';$('scalar').value=6;calculate();};
  $('export-toy').onclick=()=>download('hw1-observations.csv','base_x,base_y,subgroup_order,k,x,y,x_5bits,y_5bits\n'+data.rows.map(r=>[G.x,G.y,data.n,r.k,r.point.x,r.point.y,r.point.x.toString(2).padStart(5,'0'),r.point.y.toString(2).padStart(5,'0')].join(',')).join('\n'));
  calculate();
})();
