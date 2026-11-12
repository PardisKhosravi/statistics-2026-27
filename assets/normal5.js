/* Cody (1969), rational erf/erfc coefficients from https://netlib.org/specfun/erf.
 * JS adaptation for the teaching range |z| <= 8; not a general-purpose special-functions library.
 */
window.Normal5 = (() => {
  const A=[3.16112374387056560e00,1.13864154151050156e02,3.77485237685302021e02,3.20937758913846947e03,1.85777706184603153e-1];
  const B=[2.36012909523441209e01,2.44024637934444173e02,1.28261652607737228e03,2.84423683343917062e03];
  const C=[5.64188496988670089e-1,8.88314979438837594e0,6.61191906371416295e01,2.98635138197400131e02,8.81952221241769090e02,1.71204761263407058e03,2.05107837782607147e03,1.23033935479799725e03,2.15311535474403846e-8];
  const D=[1.57449261107098347e01,1.17693950891312499e02,5.37181101862009858e02,1.62138957456669019e03,3.29079923573345963e03,4.36261909014324716e03,3.43936767414372164e03,1.23033935480374942e03];
  const P=[3.05326634961232344e-1,3.60344899949804439e-1,1.25781726111229246e-1,1.60837851487422766e-2,6.58749161529837803e-4,1.63153871373020978e-2];
  const Q=[2.56852019228982242e00,1.87295284992346047e00,5.27905102951428412e-1,6.05183413124413191e-2,2.33520497626869185e-3];
  const density=z=>Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
  const result=(z,q,work,detail)=>({cdf:z<0?q:1-q,tail:q,work,detail});
  function rational(t,num,den){
    const k=den.length;
    let p=num[k]*t,q=t;
    for(let j=0;j<k-1;j++){p=(p+num[j])*t;q=(q+den[j])*t;}
    return (p+num[k-1])/(q+den[k-1]);
  }
  function cody(z){
    const x=Math.abs(z)/Math.SQRT2;
    if(x<=.46875)return result(z,.5*(1-x*rational(x*x,A,B)),4,'erf rational branch (0 exponentials)');
    const scale=x<=4?rational(x,C,D):(1/Math.sqrt(Math.PI)-rational(1/(x*x),P,Q)/(x*x))/x;
    const split=Math.trunc(16*x)/16;
    return result(z,.5*Math.exp(-split*split)*Math.exp(-(x-split)*(x+split))*scale,
      x<=4?8:5,'erfc rational branch (2 exponentials)');
  }
  function simpson(z,n){
    if(!Number.isInteger(n)||n<2||n%2)throw Error('Simpson requires a positive even subinterval count.');
    if(z===0)return result(0,.5,0,'symmetry at zero');
    const x=Math.abs(z),direct=x>=2,a=direct?x:0,b=direct?12:x,h=(b-a)/n;
    let sum=density(a)+density(b);
    for(let j=1;j<n;j++)sum+=(j%2?4:2)*density(a+j*h);
    const integral=h*sum/3;
    return result(z,direct?integral:.5-integral,n+1,direct?'integrate tail to 12':'integrate from 0 to |z|');
  }
  function series(z,m){
    if(Math.abs(z)>4)return null;
    const x=Math.abs(z)/Math.SQRT2;
    let term=x,sum=x;
    for(let j=1;j<m;j++){term*=(-x*x/j)*(2*j-1)/(2*j+1);sum+=term;}
    return result(z,.5-sum/Math.sqrt(Math.PI),m,'Taylor terms of erf');
  }
  return {density,cody,simpson,series};
})();
