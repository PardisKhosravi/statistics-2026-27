const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),ctx=vm.createContext({window:{}});
for(const file of ['integration5','normal5','normal5-reference'])vm.runInContext(fs.readFileSync(path.join(root,'assets',file+'.js'),'utf8'),ctx);
const {Integration5:I,Normal5:A,Normal5Reference:refs}=ctx.window;
const close=(a,b,t)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b} (tol ${t})`);
for(const eps of [.01,.001,.0001])for(const f of I.cases(eps)){
  for(const k of [4,8,33,256]){
    const b=I.bands(f,k);
    close(b.rows.reduce((s,r)=>s+r.mass,0),f.b-f.a,1e-12);
    close(b.upper-b.lower,(f.max-f.min)*(f.b-f.a)/k,1e-12);
    assert.ok(b.lower<=f.exact+1e-12&&b.upper>=f.exact-1e-12,f.id+' bracket');
  }
  assert.ok(Math.abs(I.midpoint(f,131072).value-f.exact)<2e-6,f.id+' midpoint');
  if(f.tail)close(f.exact+f.tail,2,1e-15);
}
const sin=I.cases().find(f=>f.id==='sin');
assert.equal(I.bands(sin,8).rows[3].parts.length,2);
close(I.bands(sin,8).rows[3].mass,2*(Math.asin(.5)-Math.asin(.375)),1e-13);
const step=I.cases().find(f=>f.id==='step');
close(I.midpoint(step,8).value,2,0);
assert.notEqual(I.midpoint(step,7).value,2);
assert.ok(I.thomae(512)<I.thomae(8));
let maxTail=0,maxCdf=0;
for(const r of refs){
  const v=A.cody(r.z),q=Number(r.tail),p=Number(r.cdf);
  maxTail=Math.max(maxTail,Math.abs(v.tail-q)/q);maxCdf=Math.max(maxCdf,Math.abs(v.cdf-p));
  close(v.tail,q,q*3e-14);
  close(v.cdf,p,3e-16);
  close(A.simpson(r.z,2048).tail,q,q*4e-7);
  if(Math.abs(r.z)<=4)close(A.series(r.z,64).cdf,p,5e-13);
  if(r.nist!==null)close(Number(r.nist),p,5.00001e-6);
}
let prev=-1;
for(let j=0;j<=1600;j++){const z=-8+j/100,p=A.cody(z).cdf;assert.ok(p>=prev&&p>=0&&p<=1);prev=p;}
assert.equal(A.series(8,40),null);
assert.throws(()=>A.simpson(1,7),/even/);
assert.ok(A.series(4,4).tail<0||A.series(4,4).tail>.5);
const q=Number(refs.find(r=>r.z===-3).tail);
assert.ok(Math.abs(A.simpson(-3,64).tail-q)<Math.abs(A.simpson(-3,32).tail-q)/10);
console.log('Lesson 5 numerical checks passed. 19 independent CDF reference points; max Cody absolute CDF error '+maxCdf+'; max relative small-tail error '+maxTail);
