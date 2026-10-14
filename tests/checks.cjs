'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const T=require('../assets/toy.js'),W=require('../assets/wallet.js'),E=require('../assets/vendor/ethers.umd.min.js');
const vectors=require('./reference-vectors.json');
let checks=0;function ok(condition,message){assert.ok(condition,message);checks++;}
const G={x:1,y:5},all=[null,...T.points];
assert.deepEqual(T.sequence(9,G).map(r=>r.point),[{x:1,y:5},{x:2,y:10},{x:5,y:9},{x:12,y:1},{x:12,y:16},{x:5,y:8},{x:2,y:7},{x:1,y:12},null]);checks++;
ok(T.points.length===17,'17 finite points');ok(T.order(G)===9,'default generator order');
for(const P of all){
  ok(T.eq(T.add(P,null),P),'identity');
  if(P)ok(T.add(P,{x:P.x,y:T.mod(-P.y)})===null,'inverse');
  for(const Q of all){ok(T.valid(T.add(P,Q)),'closure');ok(T.eq(T.add(P,Q),T.add(Q,P)),'commutativity');
    for(const R of all)ok(T.eq(T.add(T.add(P,Q),R),T.add(P,T.add(Q,R))),'associativity');
  }
  if(P){
    let sum=null;
    for(let k=0;k<=72;k++){ok(T.eq(sum,T.multiply(k,P)),'binary multiplication agrees with iteration');if(k>0)ok(T.eq(sum,T.fastTrace(k,P).at(-1).point),'display trace agrees');sum=T.add(sum,P);}
    const s=T.stats(P);
    ok(s.rows.length===s.n-1,'sample excludes identity');
    ok(new Set(s.rows.map(r=>JSON.stringify(r.point))).size===s.n-1,'all nonidentity subgroup points distinct');
    ok(s.fx.reduce((a,b)=>a+b,0)===s.n-1,'x counts cover sample');
    ok(s.fy.reduce((a,b)=>a+b,0)===s.n-1,'y counts cover sample');
    const pairSet=new Set(s.pairs.map(r=>r.k+','+r.j));
    for(let k=1;k<s.n;k++)for(let j=k+1;j<s.n;j++)ok(pairSet.has(k+','+j)===((k^j).toString(2).split('1').length-1===1),'complete exact-one-bit pair census');
  }
}
const stats=T.stats(G);
assert.deepEqual(stats.fx.map((v,i)=>v?[i,v]:null).filter(Boolean),[[1,2],[2,2],[5,2],[12,2]]);checks++;
ok(stats.hx===2 && stats.hy===3,'default marginal entropies');
ok(T.correlation([1,2],[3,3])===null,'zero-variance correlation is undefined');
assert.throws(()=>T.inverse(0));assert.throws(()=>T.multiply(-1,G));assert.throws(()=>T.add({x:0,y:0},G));checks+=3;
for(const r of W.selfTests())ok(r.pass,r.name);
for(const [ent,phrase,seed] of vectors.bip39_english){
  const m=E.Mnemonic.fromEntropy('0x'+ent,'TREZOR');ok(m.phrase===phrase,'BIP39 entropy to phrase');ok(m.computeSeed()==='0x'+seed,'BIP39 seed reference');
  const independent=crypto.pbkdf2Sync(phrase.normalize('NFKD'),'mnemonicTREZOR',2048,64,'sha512').toString('hex');ok(independent===seed,'independent Node PBKDF2');
}
const root=E.HDNodeWallet.fromSeed('0x'+vectors.bip32_vector1.seed);
for(const v of vectors.bip32_vector1.chains){const node=v.path==='m'?root:root.derivePath(v.path);ok(node.extendedKey===v.xprv,'BIP32 extended private key '+v.path);ok(node.neuter().extendedKey===v.xpub,'BIP32 extended public key '+v.path);}
const official=['0x52908400098527886E0F7030069857D2E4169EE7','0x8617E340B3D01FA5F11F306F4090FD50E238070D','0xde709f2102306220921060314715629080e2fb77','0x27b1fdb04752bbc536007a920d24acb045561c26','0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed','0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359','0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB','0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb'];
for(const address of official)ok(W.checksum(address).exact,'official EIP55 vector');
const normal=W.pipeline(),trezor=W.pipeline(W.DEMO,'TREZOR'),next=W.pipeline(W.DEMO,'',0,1);
ok(normal.publicBytes.length===130,'address hashes exactly 64 public-key bytes');
ok(normal.address==='0x'+E.keccak256(normal.publicBytes).slice(-40),'address is final 20 hash bytes');
ok(normal.checksummed!==trezor.checksummed,'passphrase changes wallet');ok(normal.checksummed!==next.checksummed,'address index changes wallet');
ok(W.pipeline('test test test test test test test test test test test junk').checksummed==='0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266','public development wallet end-to-end known address');
for(const msg of ['', 'abc', 'Statistics lab', 'سلام']){
  const bytes=E.toUtf8Bytes(msg),h=W.hashes(bytes);
  ok(h.sha3==='0x'+crypto.createHash('sha3-256').update(bytes).digest('hex'),'SHA3 independent Node check');
  ok(h.sha256==='0x'+crypto.createHash('sha256').update(bytes).digest('hex'),'SHA256 independent Node check');
  ok(h.sha512==='0x'+crypto.createHash('sha512').update(bytes).digest('hex'),'SHA512 independent Node check');
}
assert.throws(()=>W.pipeline('invalid words'));assert.throws(()=>W.pipeline(W.DEMO,'',-1,0));assert.throws(()=>W.checksum('0x123'));checks+=3;
const project=path.resolve(__dirname,'..');
for(const name of ['index.html','hw1/index.html','hw2/index.html']){
  const file=path.join(project,name),html=fs.readFileSync(file,'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);ok(new Set(ids).size===ids.length,'unique HTML IDs '+name);
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const ref=m[1];if(/^(https?:|data:|mailto:)/.test(ref))continue;
    if(ref.startsWith('#')){ok(ids.includes(ref.slice(1)),'internal anchor '+ref);continue;}
    const dest=path.resolve(path.dirname(file),ref.split('#')[0]);ok(fs.existsSync(dest),'local link exists '+name+' '+ref);
  }
}
console.log(`PASS · ${checks.toLocaleString()} arithmetic, reference-vector, encoding and local-link checks`);
