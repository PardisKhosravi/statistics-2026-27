(function (root) {
  'use strict';
  // Comma-separated pairs with CSV quoting; blank lines are ignored.
  function parse(text, header = true) {
    if (text.length > 1000000) throw Error('Please use at most 1 MB of text.');
    text = text.replace(/^\uFEFF/, '');
    const records = [];
    let row = [], field = '', state = 0, line = 1, start = 1;
    const pushField = () => { row.push(field.trim()); field = ''; state = 0; };
    const pushRow = () => {
      pushField();
      if (row.length !== 1 || row[0]) {
        if (row.length !== 2 || row.some(v => !v)) throw Error('Line ' + start + ': expected exactly two nonempty fields.');
        if (row.some(v => v.length > 80)) throw Error('Line ' + start + ': use labels of at most 80 characters.');
        records.push(row);
        if (records.length > 20000 + Number(header)) throw Error('Use at most 20,000 observations.');
      }
      row = [];
    };
    for (let i = 0; i <= text.length; i++) {
      const c = text[i];
      if (state === 2) {
        if (c === undefined) throw Error('Line ' + start + ': missing closing quote.');
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else state = 3;
        } else {
          if (c === '\n' || (c === '\r' && text[i + 1] !== '\n')) line++;
          field += c;
        }
      } else if (c === undefined || c === '\n' || c === '\r') {
        pushRow();
        if (c === '\r' && text[i + 1] === '\n') i++;
        start = ++line;
      } else if (c === ',') pushField();
      else if (state === 3) {
        if (c !== ' ' && c !== '\t') throw Error('Line ' + line + ': unexpected text after a closing quote.');
      } else if (c === '"') {
        if (field.trim()) throw Error('Line ' + line + ': unexpected quote inside a field.');
        field = ''; state = 2;
      } else { field += c; state = 1; }
    }
    const labels = header ? records.shift() : ['X', 'F'];
    if (!labels || !records.length) throw Error('Enter at least one observation after the optional header.');
    return {labels, records};
  }

  // Q(a,x), regularized upper incomplete gamma: lower series or upper continued fraction.
  const lanczos = [676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  function logGamma(a) {
    const z = a - 1, t = z + 7.5;
    const s = lanczos.reduce((acc, c, i) => acc + c / (z + i + 1), .99999999999980993);
    return .9189385332046727 + (z + .5) * Math.log(t) - t + Math.log(s);
  }
  function survival(stat, df) {
    if (!(stat >= 0) || !Number.isInteger(df) || df < 1) return null;
    if (stat === 0) return 1;
    if (stat === Infinity) return 0;
    const a = df / 2, x = stat / 2, logFactor = a * Math.log(x) - x - logGamma(a);
    const clamp = v => Math.max(0, Math.min(1, v));
    if (x < a + 1) {
      let term = 1 / a, sum = term;
      for (let i = 1; i <= 10000; i++) {
        term *= x / (a + i); sum += term;
        if (term <= sum * 2e-15) return clamp(1 - Math.exp(logFactor + Math.log(sum)));
      }
    } else {
      const tiny = 1e-300, safe = v => Math.abs(v) < tiny ? (v < 0 ? -tiny : tiny) : v;
      let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
      for (let i = 1; i <= 10000; i++) {
        const k = i * (a - i); b += 2;
        d = 1 / safe(b + k * d); c = safe(b + k / c);
        const ratio = d * c; h *= ratio;
        if (Math.abs(ratio - 1) <= 2e-15) return clamp(Math.exp(logFactor + Math.log(h)));
      }
    }
    return null;
  }
  function analyze(records) {
    const rows = [...new Set(records.map(v => v[0]))];
    const cols = [...new Set(records.map(v => v[1]))];
    if (!rows.length) throw Error('Enter at least one observation.');
    if (rows.length > 20 || cols.length > 20) throw Error('Use at most 20 categories per variable. For numerical data, choose meaningful bins before importing.');
    const rowIndex = new Map(rows.map((v,i) => [v,i])), colIndex = new Map(cols.map((v,i) => [v,i]));
    const observed = rows.map(() => cols.map(() => 0)), rowTotals = rows.map(() => 0), colTotals = cols.map(() => 0);
    const n = records.length;
    for (const [x,f] of records) {
      const i = rowIndex.get(x), j = colIndex.get(f);
      observed[i][j]++; rowTotals[i]++; colTotals[j]++;
    }
    let chi2 = 0, under1 = 0, under5 = 0, max = null;
    const cells = observed.map((row,i) => row.map((o,j) => {
      const e = rowTotals[i] * colTotals[j] / n;
      const residual = (o - e) / Math.sqrt(e), contribution = residual ** 2;
      const cell = {i,j,o,e,residual,contribution,fGivenX:o/rowTotals[i],xGivenF:o/colTotals[j]};
      chi2 += contribution; under1 += Number(e < 1); under5 += Number(e < 5);
      if (!max || contribution > max.contribution) max = cell;
      return cell;
    }));
    const df = (rows.length - 1) * (cols.length - 1), size = rows.length * cols.length;
    return {rows,cols,n,cells,rowTotals,colTotals,chi2,df,under1,under5,size,max,
      adequate: under1 === 0 && (size - under5) * 5 >= 4 * size,
      p: df > 0 ? survival(chi2,df) : null};
  }

  const examples = {
    associated: {name:'Associated · teaching data', counts:[[52,28],[70,10],[76,4]]},
    balanced: {name:'Matching proportions · teaching data', counts:[[48,12],[64,16],[80,20]]},
    sparse: {name:'Sparse counts · teaching data', counts:[[5,1],[2,0],[1,1]]}
  };
  function example(key) {
    const lines = ['Authentication method,Login outcome'];
    examples[key].counts.forEach((row,i) => row.forEach((count,j) => {
      for (let k = 0; k < count; k++) lines.push(['Password','Authenticator app','Passkey'][i] + ',' + ['Success','Failure'][j]);
    }));
    return lines.join('\n');
  }
  const api = {parse,analyze,survival,examples,example};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Independence6 = api;
})(typeof window === 'undefined' ? globalThis : window);
