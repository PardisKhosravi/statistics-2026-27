window.Lab5 = (() => {
  const fmt=(x,d=8)=>x===null||x===undefined||!Number.isFinite(x)?'—':
    x!==0&&Math.abs(x)<1e-4?x.toExponential(5):Number(x.toPrecision(d)).toString();
  function measure(fn,perBatch){
    let sink=fn();
    const times=[];
    for(let trial=0;trial<5;trial++){
      const start=performance.now();
      for(let i=0;i<perBatch;i++)sink+=fn();
      times.push((performance.now()-start)/perBatch);
    }
    if(!Number.isFinite(sink))return '—';
    const med=times.sort((a,b)=>a-b)[2];
    return med>0?fmt(med*1000,4)+' µs':'below timer resolution';
  }
  return {fmt,measure};
})();
