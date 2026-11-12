/* Domain sums and value-band simple functions for a fixed collection. */
window.Integration5 = (() => {
  const pi=Math.PI;
  function make(id,a,b,label,fn,min,max,exact,above,description,tail=0){
    return {id,a,b,label,fn,min,max,exact,above,description,tail};
  }
  function cases(eps=0.001) {
    return [
      make('square',0,1,'x²',x=>x*x,0,1,1/3,y=>[[Math.sqrt(y),1]],'A smooth increasing function with one inverse branch.'),
      make('sin',0,pi,'sin(x)',Math.sin,0,1,2,y=>[[Math.asin(y),pi-Math.asin(y)]],'Two inverse branches. A horizontal band below the maximum usually has two separate preimage intervals.'),
      make('step',0,1,'Step: 1 then 3',x=>x<.5?1:3,1,3,2,y=>[[y<=1?0:.5,1]],'The jump at x = 0.5 is harmless for integrability. An even domain partition lands exactly on the jump.'),
      make('abs',0,1,'|x − 0.5|',x=>Math.abs(x-.5),0,.5,.25,y=>[[0,.5-y],[.5+y,1]],'The corner is continuous. A value band has symmetric preimages on both sides.'),
      make('indicator',0,1,'Indicator: 1 then 0',x=>x<.5?1:0,0,1,.5,y=>[[0,y<=0?1:.5]],'The height 1 has a preimage of length 0.5, so the integral is 0.5.'),
      make('sinc',0,pi,'sin(x) / x',x=>x===0?1:Math.sin(x)/x,0,1,1.851937051982466,(y,evalf)=>{
        let l=0,r=pi;
        for(let i=0;i<48;i++){const m=(l+r)/2;if(evalf(m)>=y)l=m;else r=m;}
        return [[0,(l+r)/2]];
      },'The removable value at zero is set to 1. Its decreasing branch is inverted by 48 bisection steps per interior threshold.'),
      make('singular',eps,1,'1 / √x (truncated)',x=>1/Math.sqrt(x),1,1/Math.sqrt(eps),2*(1-Math.sqrt(eps)),y=>[[eps,Math.min(1,1/(y*y))]],'The integrand is unbounded at 0. Both numerical methods integrate on [ε,1]; the omitted integral is reported separately.',2*Math.sqrt(eps))
    ];
  }
  const length=pieces=>pieces.reduce((s,[a,b])=>s+Math.max(0,b-a),0);
  function subtract(pieces,cuts){
    for(const [c,d] of cuts){
      pieces=pieces.flatMap(([a,b])=>d<=a||c>=b?[[a,b]]:[[a,Math.max(a,c)],[Math.min(d,b),b]].filter(([u,v])=>v>u));
    }
    return pieces;
  }
  function midpoint(f,n) {
    const h=(f.b-f.a)/n;
    let s=0;
    for(let j=0;j<n;j++) s+=f.fn(f.a+(j+.5)*h);
    return {value:s*h,evaluations:n};
  }
  function bands(f,k){
    let evaluations=0;
    const evalf=x=>{evaluations++;return f.fn(x);};
    const h=(f.max-f.min)/k;
    const ends=Array.from({length:k+1},(_,i)=>i===k?f.max:f.min+i*h);
    const sets=ends.map((y,i)=>i===k?[]:i===0?[[f.a,f.b]]:f.above(y,evalf));
    let lower=0,upper=0,value=0;
    const rows=ends.slice(0,-1).map((lo,j)=>{
      const hi=ends[j+1],parts=subtract(sets[j],sets[j+1]),mass=length(parts),mid=(lo+hi)/2;
      lower+=lo*mass;upper+=hi*mass;value+=mid*mass;
      return {lo,hi,parts,mass,mid,contribution:mid*mass};
    });
    return {value,lower,upper,rows,evaluations,thresholds:k-1};
  }
  function gcd(a,b){while(b)[a,b]=[b,a%b];return a;}
  function thomae(n){let sum=0;for(let j=0;j<n;j++)sum+=gcd(2*j+1,2*n)/(2*n);return sum/n;}
  return {cases,midpoint,bands,thomae};
})();
