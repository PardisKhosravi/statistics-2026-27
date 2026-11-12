(() => {
  'use strict';
  const lab = Independence6, $ = id => document.getElementById(id);
  const fmt = (v, d = 3) => Number(v.toFixed(d)).toLocaleString('en-US', {maximumFractionDigits:d});
  const pct = v => fmt(100 * v, 2) + '%';
  const pText = p => p === null ? '—' : p === 0 ? '< 1e−300' : p < .001 ? p.toExponential(3) : fmt(p,6);
  let current = null;
  const add = (parent, tag, value) => {
    const el = document.createElement(tag);
    if (value !== undefined) el.textContent = value;
    parent.appendChild(el);
    return el;
  };
  function heading(row, value, scope) {
    const el = add(row, 'th', value);
    el.scope = scope;
    return el;
  }
  function total(row, value, proportion) {
    const td = add(row,'td',value);
    td.className = 'ind6-total';
    if (proportion !== undefined) add(td,'small',pct(proportion));
  }
  function table(id, caption, paint, margins = false, foot = false) {
    const {rows,cols,cells,labels,n,rowTotals,colTotals} = current;
    const wrap = $(id);
    wrap.replaceChildren();
    const t = add(wrap,'table');
    add(t,'caption',caption);
    const top = add(add(t,'thead'),'tr');
    heading(top, labels[0] + ' / ' + labels[1], 'col');
    cols.forEach(col => heading(top,col,'col'));
    if (margins) heading(top,'Row total','col');
    const tbody = add(t,'tbody');
    rows.forEach((x,i) => {
      const row = add(tbody,'tr');
      heading(row,x,'row');
      cells[i].forEach(c => paint(add(row,'td'),c));
      if (margins) total(row,rowTotals[i],foot ? rowTotals[i]/n : undefined);
    });
    if (margins) {
      const bottom = add(add(t,'tfoot'),'tr');
      heading(bottom,'Column total','row');
      colTotals.forEach(v => total(bottom,v,foot ? v/n : undefined));
      total(bottom,n,foot ? 1 : undefined);
    }
  }
  function conditional() {
    if (!current) return;
    const byRow = $('direction').value === 'row';
    const [x,f] = current.labels;
    const given = byRow ? x : f, outcome = byRow ? f : x;
    table('conditional',outcome + ' given ' + given,(td,c) => {
      const den = byRow ? current.rowTotals[c.i] : current.colTotals[c.j];
      td.textContent = pct(byRow ? c.fGivenX : c.xGivenF);
      add(td,'small',c.o + ' / ' + den);
    });
    $('conditional-note').textContent = (byRow ? 'Each row' : 'Each column') + ' sums to 100% before rounding. Compare these percentages with the marginal percentages for ' + outcome + ' in the observed table.';
  }
  function interpret() {
    if (!current) return;
    const {p,df,adequate,under1,under5,size} = current;
    const alpha = Number($('alpha').value);
    if (df === 0) {
      $('decision').textContent = 'No chi-square test for this table';
      $('inference').textContent = 'At least one variable has only one observed category. There is no variation to compare for that variable, so the test has zero degrees of freedom.';
    } else if (!adequate) {
      $('decision').textContent = 'Too sparse for a reliable chi-square decision';
      $('inference').textContent = 'The statistic and approximate p-value are shown for comparison. Use more independent observations or consider an exact or permutation test appropriate to the study design.';
    } else if (p === null) {
      $('decision').textContent = 'Approximate p-value unavailable';
      $('inference').textContent = 'The observed and expected counts are still shown.';
    } else if (p <= alpha) {
      $('decision').textContent = 'Reject independence at α = ' + alpha;
      $('inference').textContent = 'If observations are independent and representative of the target population, the data give evidence of an association. They do not show that either variable causes the other.';
    } else {
      $('decision').textContent = 'Do not reject independence at α = ' + alpha;
      $('inference').textContent = 'The data do not provide enough evidence of an association at this threshold. This does not prove independence.';
    }
    $('diagnostic').textContent = 'Expected-count check: ' + under1 + ' of ' + size + ' below 1; ' + under5 + ' below 5. This lab uses the rule of thumb that all expected counts should be at least 1 and at least 80% should be at least 5. Independent observations and meaningful categories are also needed.';
  }
  function render() {
    const {labels,rows,cols,n,chi2,df,p,max} = current;
    $('variable-labels').textContent = 'Rows: ' + labels[0] + ' · Columns: ' + labels[1];
    table('observed','Observed joint counts and sample margins',(td,c) => {
      td.textContent = c.o; add(td,'small',pct(c.o/n));
    },true,true);
    table('expected','Expected joint counts and fitted margins',(td,c) => { td.textContent = fmt(c.e); },true);
    conditional();
    $('n').textContent = fmt(n);
    $('chi').textContent = fmt(chi2,5);
    $('df').textContent = df;
    $('p').textContent = pText(p);
    table('contributions','Contribution to Pearson’s χ² by cell',(td,c) => {
      const sign = Math.sign(c.residual), number = add(td,'span',fmt(c.contribution,4));
      number.className = sign > 0 ? 'above' : sign < 0 ? 'below' : '';
      add(td,'small',sign > 0 ? 'Above' : sign < 0 ? 'Below' : 'Equal');
    });
    $('worked').textContent = 'Largest contribution: ' + rows[max.i] + ' × ' + cols[max.j]
      + '. Expected = ' + current.rowTotals[max.i] + ' × ' + current.colTotals[max.j] + ' ÷ ' + n + ' ≈ ' + fmt(max.e)
      + '; contribution ≈ (' + max.o + ' − ' + fmt(max.e) + ')² ÷ ' + fmt(max.e) + ' ≈ ' + fmt(max.contribution,4) + '.';
    interpret();
  }
  function status(message, error = false) {
    $('data-status').textContent = message;
    $('data-status').dataset.error = String(error);
  }
  function analyze() {
    try {
      const data = lab.parse($('pairs').value, $('header').checked);
      current = {...lab.analyze(data.records), labels:data.labels};
      render();
      $('results').hidden = false;
      status('Analyzed ' + fmt(current.n) + ' observations · ' + current.rows.length + ' × ' + current.cols.length + ' table.');
    } catch (e) {
      current = null; $('results').hidden = true; status(e.message,true);
    }
  }
  function dirty() {
    $('preset').value = 'custom';
    current = null; $('results').hidden = true;
    status('Data changed. Select Analyze data to update the results.');
  }
  function load(key) {
    $('preset').value = key;
    $('pairs').value = lab.example(key);
    $('header').checked = true;
    analyze();
  }
  $('preset').addEventListener('change', () => {
    const key = $('preset').value;
    if (key !== 'custom') load(key);
    else $('pairs').focus();
  });
  $('pairs').addEventListener('input',dirty);
  $('header').addEventListener('change',dirty);
  $('analyze').addEventListener('click',analyze);
  $('restore').addEventListener('click',() => load('associated'));
  $('alpha').addEventListener('change',interpret);
  $('direction').addEventListener('change',conditional);
  load('associated');
})();
