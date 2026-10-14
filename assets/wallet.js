/* Real cryptographic primitives via vendored ethers 6.15.0 and js-sha3 0.9.3. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./vendor/ethers.umd.min.js'),require('./vendor/sha3.min.js'));
  else root.WalletLab=factory(root.ethers,root);
})(typeof globalThis!=='undefined'?globalThis:this,function(E,S){
  'use strict';
  const DEMO='abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const pathFor=(account,index)=>`m/44'/60'/${account}'/0/${index}`;
  function pipeline(phrase=DEMO,password='',account=0,index=0){
    for(const v of [account,index])if(!Number.isInteger(v)||v<0||v>=2**31)throw Error('Account and address indices must be integers from 0 to 2³¹−1.');
    const mnemonic=E.Mnemonic.fromPhrase(phrase,password);
    const seed=mnemonic.computeSeed();
    const master=E.HDNodeWallet.fromSeed(seed);
    const parent=master.derivePath(`m/44'/60'/${account}'/0`),node=parent.deriveChild(index);
    const publicKey=E.SigningKey.computePublicKey(node.privateKey,false);
    const publicBytes='0x'+publicKey.slice(4);
    const digest=E.keccak256(publicBytes),address='0x'+digest.slice(-40);
    return {phrase:mnemonic.phrase,entropy:mnemonic.entropy,seed,masterKey:master.privateKey,chainCode:master.chainCode,path:pathFor(account,index),privateKey:node.privateKey,publicKey,publicBytes,digest,address,checksummed:E.getAddress(address),parent,node};
  }
  function hashes(bytes){return {keccak:E.keccak256(bytes),sha3:'0x'+S.sha3_256(E.getBytes(bytes)),sha256:E.sha256(bytes),sha512:E.sha512(bytes)};}
  const bitString=hex=>Array.from(E.getBytes(hex),b=>b.toString(2).padStart(8,'0')).join('');
  const distance=(a,b)=>{const x=E.getBytes(a),y=E.getBytes(b);if(x.length!==y.length)throw Error('Byte lengths must match.');let n=0;for(let i=0;i<x.length;i++){let d=x[i]^y[i];while(d){n+=d&1;d>>>=1;}}return n;};
  function checksum(address){
    if(!/^0x[0-9a-fA-F]{40}$/.test(address))throw Error('Enter 0x followed by exactly 40 hexadecimal characters.');
    const expected=E.getAddress(address.toLowerCase());
    const raw=address.slice(2),hasLower=/[a-f]/.test(raw),hasUpper=/[A-F]/.test(raw);
    return {expected,exact:address===expected,unchecksummed:!(hasLower&&hasUpper)&&address!==expected};
  }
  function selfTests(){
    const rows=[];const check=(name,f)=>{try{if(!f())throw Error('Mismatch');rows.push({name,pass:true});}catch(e){rows.push({name,pass:false,error:e.message});}};
    check('BIP-39 published seed (TREZOR passphrase)',()=>E.Mnemonic.fromPhrase(DEMO,'TREZOR').computeSeed()==='0xc55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04');
    check('BIP-32 vector 1: master chain code',()=>E.HDNodeWallet.fromSeed('0x000102030405060708090a0b0c0d0e0f').chainCode==='0x873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508');
    check('secp256k1: private scalar 1 → SEC 2 generator',()=>E.SigningKey.computePublicKey('0x'+'0'.repeat(63)+'1',false)==='0x0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8');
    check('Keccak-256: empty input',()=>E.keccak256('0x')==='0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
    check('SHA3-256: NIST empty-input digest',()=>S.sha3_256(new Uint8Array())==='a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a');
    check('EIP-55: official mixed-case vector',()=>E.getAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')==='0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
    return rows;
  }
  return {DEMO,pathFor,pipeline,hashes,bitString,distance,checksum,selfTests};
});
