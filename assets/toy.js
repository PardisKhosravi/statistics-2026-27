/* Educational arithmetic on E(F_17): y^2 = x^3 + 7. Written for HW1. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Toy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const p = 17, a = 0, b = 7;
  const mod = n => ((n % p) + p) % p;
  const eq = (P,Q) => P === null ? Q === null : Q !== null && P.x === Q.x && P.y === Q.y;
  function inverse(n) {
    n = mod(n);
    if (n === 0) throw Error('Zero has no modular inverse.');
    for (let i=1; i<p; i++) if (mod(i*n)===1) return i;
    throw Error('Inverse does not exist.');
  }
  const valid = P => P === null || (Number.isInteger(P.x) && Number.isInteger(P.y) && P.x>=0 && P.x<p && P.y>=0 && P.y<p && mod(P.y*P.y-P.x**3-a*P.x-b)===0);
  function operation(P,Q) {
    if (!valid(P) || !valid(Q)) throw Error('Point is not on the toy curve.');
    if (P===null || Q===null) return {point:P===null?Q:P, kind:'identity', explanation:'The identity O leaves the other point unchanged.'};
    if (P.x===Q.x && mod(P.y+Q.y)===0) return {point:null,kind:'inverse',explanation:'The points are inverses (or a point has y = 0), so their sum is O.'};
    const doubling=eq(P,Q);
    const numerator=doubling ? 3*P.x**2+a : Q.y-P.y;
    const denominator=doubling ? 2*P.y : Q.x-P.x;
    const inv=inverse(denominator), slope=mod(numerator*inv);
    const x=mod(slope**2-P.x-Q.x),y=mod(slope*(P.x-x)-P.y);
    return {point:{x,y},kind:doubling?'double':'add',numerator,denominator,inv,slope,explanation:`λ = ${mod(numerator)} × ${inv} mod 17 = ${slope}; x = ${x}; y = ${y}.`};
  }
  const add=(P,Q)=>operation(P,Q).point;
  function multiply(k,G) {
    if (!Number.isSafeInteger(k) || k<0) throw Error('Use a nonnegative integer scalar.');
    let R=null,B=G;
    while(k>0){if(k%2)R=add(R,B);k=Math.floor(k/2);if(k)B=add(B,B);}
    return R;
  }
  function sequence(k,G) {
    let R=null;const rows=[];
    for(let i=1;i<=k;i++){const before=R,op=operation(R,G);R=op.point;rows.push({k:i,before,...op});}
    return rows;
  }
  function fastTrace(k,G) {
    let R=null;const rows=[];
    for(const bit of k.toString(2)){
      rows.push({type:'Double',before:R,other:R,point:add(R,R),bit});R=add(R,R);
      if(bit==='1'){rows.push({type:'Add G',before:R,other:G,point:add(R,G),bit});R=add(R,G);}
    }
    return rows;
  }
  function order(G){let R=null;for(let i=1;i<=40;i++){R=add(R,G);if(R===null)return i;}throw Error('Order not found.');}
  const points=[];for(let x=0;x<p;x++)for(let y=0;y<p;y++)if(valid({x,y}))points.push({x,y});
  const bits=P=>P===null?null:P.x.toString(2).padStart(5,'0')+P.y.toString(2).padStart(5,'0');
  const hamming=(s,t)=>Array.from(s).reduce((n,c,i)=>n+(c!==t[i]),0);
  function entropy(counts){const n=counts.reduce((a,b)=>a+b,0);return n ? -counts.reduce((h,c)=>h+(c?c/n*Math.log2(c/n):0),0):0;}
  function correlation(xs,ys){
    const n=xs.length;if(n<2)return null;
    const mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;
    let xy=0,xx=0,yy=0;for(let i=0;i<n;i++){xy+=(xs[i]-mx)*(ys[i]-my);xx+=(xs[i]-mx)**2;yy+=(ys[i]-my)**2;}
    return xx*yy>0?xy/Math.sqrt(xx*yy):null;
  }
  function stats(G){
    const n=order(G),rows=sequence(n-1,G),fx=Array(17).fill(0),fy=Array(17).fill(0),ones=Array(10).fill(0);
    for(const r of rows){fx[r.point.x]++;fy[r.point.y]++;Array.from(bits(r.point)).forEach((v,i)=>ones[i]+=Number(v));}
    const pairs=[];
    for(let k=1;k<n;k++)for(let j=k+1;j<n;j++){
      const d=k^j;if(d && (d&(d-1))===0)pairs.push({k,j,P:rows[k-1].point,Q:rows[j-1].point,distance:hamming(bits(rows[k-1].point),bits(rows[j-1].point))});
    }
    return {n,rows,fx,fy,ones,pairs,hx:entropy(fx),hy:entropy(fy),rx:correlation(rows.map(r=>r.k),rows.map(r=>r.point.x)),ry:correlation(rows.map(r=>r.k),rows.map(r=>r.point.y))};
  }
  return {p,a,b,mod,inverse,eq,valid,operation,add,multiply,sequence,fastTrace,order,points,bits,hamming,entropy,correlation,stats};
});
