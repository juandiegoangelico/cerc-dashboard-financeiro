
// ---------- Helpers ----------
const fmtBRL = (v, compact=false) => {
  if (compact) {
    const abs = Math.abs(v);
    if (abs >= 1e6) return (v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+'M';
    if (abs >= 1e3) return (v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:0})+'K';
  }
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
};
const fmtBRL2 = (v) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const fmtPct = (v) => v.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';

const PALETTE = ['#4f8cff','#33c481','#ffb648','#ff6161','#a78bfa','#3ac9c9','#e879b9','#f2a65a','#7c9cf5','#6bcf9e','#f27878','#c084fc','#5eb8b8','#f0c14b','#9d8df1'];

const CHARTS_OK = (typeof Chart !== 'undefined');
if (CHARTS_OK) {
  Chart.defaults.color = '#93a1bd';
  Chart.defaults.borderColor = '#2a3448';
  Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
} else {
  console.warn('Chart.js nao carregou — graficos serao ocultados, mas KPIs e tabelas continuam funcionando.');
}

// ---------- State ----------
let currentYear = 'all';
let currentMonth = 'all'; // 'all' ou 'MM/YYYY'
let monthly = DATA.mensal;
let charts = {};

function monthsForYear(year){
  if (year === 'all') return monthly;
  return monthly.filter(m => m.competencia.split('/')[1] === year);
}

function monthIndex(comp){
  return monthly.findIndex(m => m.competencia === comp);
}

// ---------- Year filter ----------
function setupYearFilter(){
  const sel = document.getElementById('yearFilter');
  const years = Object.keys(DATA.anual);
  sel.innerHTML = '<option value="all">Todos os anos (' + DATA.periodo.inicio + ' – ' + DATA.periodo.fim + ')</option>' +
    years.map(y => `<option value="${y}">${y}${DATA.anual[y].completo ? '' : ' (parcial)'}</option>`).join('');
  sel.addEventListener('change', (e) => {
    currentYear = e.target.value;
    currentMonth = 'all';
    setupMonthFilter();
    renderAll();
  });
}

// ---------- Month filter + navegação ◀ ▶ ----------
function setupMonthFilter(){
  const sel = document.getElementById('monthFilter');
  const options = monthsForYear(currentYear); // ja em ordem cronológica (DATA.mensal é ordenado)
  const label = (comp) => {
    const [mm,yyyy] = comp.split('/');
    const nomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${nomes[parseInt(mm)]}/${yyyy}`;
  };
  sel.innerHTML = '<option value="all">Todos os meses' + (currentYear==='all' ? '' : ' de '+currentYear) + '</option>' +
    options.map(m => `<option value="${m.competencia}">${label(m.competencia)}</option>`).join('');
  sel.value = currentMonth;
  updateNavButtons();
}

function updateNavButtons(){
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');
  if (currentMonth === 'all'){
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  const idx = monthIndex(currentMonth);
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx === -1 || idx >= monthly.length - 1;
}

function goToMonth(comp){
  currentMonth = comp;
  currentYear = comp.split('/')[1];
  document.getElementById('yearFilter').value = currentYear;
  setupMonthFilter();
  renderAll();
}

function setupMonthNav(){
  document.getElementById('monthFilter').addEventListener('change', (e) => {
    currentMonth = e.target.value;
    updateNavButtons();
    renderAll();
  });
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    const idx = monthIndex(currentMonth);
    if (idx > 0) goToMonth(monthly[idx-1].competencia);
  });
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    const idx = monthIndex(currentMonth);
    if (idx !== -1 && idx < monthly.length - 1) goToMonth(monthly[idx+1].competencia);
  });
}

// ---------- Missing months ----------
function renderMissingMonths(){
  const el = document.getElementById('missingMonths');
  el.innerHTML = DATA.periodo.meses_faltantes.map(m => `<span>${m}</span>`).join('');
}

// ---------- KPIs ----------
function cmpChip(curr, prev, invert=false){
  if (prev === null || prev === undefined || prev === 0) return '';
  const delta = ((curr - prev) / Math.abs(prev)) * 100;
  const up = delta >= 0;
  const good = invert ? !up : up; // para Despesas, "subir" é ruim (invert=true)
  const arrow = up ? '▲' : '▼';
  const cls = Math.abs(delta) < 0.5 ? 'flat' : (good ? 'up' : 'down');
  return `<div class="cmp ${cls}">${arrow} ${Math.abs(delta).toFixed(1)}% vs mês anterior</div>`;
}

function renderKPIs(){
  if (currentMonth !== 'all'){
    const idx = monthIndex(currentMonth);
    const m = monthly[idx];
    const prev = idx > 0 ? monthly[idx-1] : null;
    const resultado = m.receitas - m.despesas;
    const resultadoPrev = prev ? (prev.receitas - prev.despesas) : null;
    const kpis = [
      {label:'Receitas do Mês', value: fmtBRL(m.receitas), cls:'green', cmp: cmpChip(m.receitas, prev?prev.receitas:null)},
      {label:'Despesas do Mês', value: fmtBRL(m.despesas), cls:'red', cmp: cmpChip(m.despesas, prev?prev.despesas:null, true)},
      {label:'Resultado do Mês', value: fmtBRL(resultado), cls: resultado>=0?'green':'red', cmp: cmpChip(resultado, resultadoPrev)},
      {label:'Saldo (Caixa+Bancos) ao final', value: fmtBRL(m.saldo_atual), cls: m.saldo_atual>=0?'purple':'red', cmp: cmpChip(m.saldo_atual, prev?prev.saldo_atual:null)},
    ];
    document.getElementById('kpiRow').innerHTML = kpis.map(k => `
      <div class="kpi ${k.cls}">
        <div class="label">${k.label}</div>
        <div class="value ${k.cls==='red'?'red':(k.cls==='green'?'green':'')}">${k.value}</div>
        ${k.cmp || '<div class="sub">Sem mês anterior para comparar</div>'}
      </div>`).join('');
    return;
  }

  const data = monthsForYear(currentYear);
  const totalRec = data.reduce((s,m)=>s+m.receitas,0);
  const totalDesp = data.reduce((s,m)=>s+m.despesas,0);
  const saldoFinal = data.length ? data[data.length-1].saldo_atual : 0;
  const saldoInicial = data.length ? data[0].saldo_anterior : 0;
  const mediaDesp = data.length ? totalDesp/data.length : 0;
  const mediaRec = data.length ? totalRec/data.length : 0;
  const resultado = totalRec - totalDesp;

  const kpis = [
    {label:'Total Receitas', value: fmtBRL(totalRec), cls:'green', sub: data.length+' meses · média '+fmtBRL(mediaRec,true)+'/mês'},
    {label:'Total Despesas', value: fmtBRL(totalDesp), cls:'red', sub: data.length+' meses · média '+fmtBRL(mediaDesp,true)+'/mês'},
    {label:'Resultado do Período', value: fmtBRL(resultado), cls: resultado>=0?'green':'red', sub: resultado>=0 ? 'Superávit no período' : 'Déficit no período'},
    {label:'Saldo (Caixa+Bancos) ao final', value: fmtBRL(saldoFinal), cls: saldoFinal>=0?'purple':'red', sub: 'Início do período: '+fmtBRL(saldoInicial,true)},
  ];

  document.getElementById('kpiRow').innerHTML = kpis.map(k => `
    <div class="kpi ${k.cls}">
      <div class="label">${k.label}</div>
      <div class="value ${k.cls==='red'?'red':(k.cls==='green'?'green':'')}">${k.value}</div>
      <div class="sub">${k.sub}</div>
    </div>`).join('');
}

// ---------- Monthly chart ----------
function renderMensalChart(){
  if (!CHARTS_OK) { showChartFallback('chartMensal'); return; }
  const data = monthsForYear(currentYear);
  const labels = data.map(m=>m.competencia);
  if (charts.mensal) charts.mensal.destroy();
  const ctx = document.getElementById('chartMensal').getContext('2d');
  charts.mensal = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {type:'bar', label:'Receitas', data: data.map(m=>m.receitas), backgroundColor:'#33c48199', borderRadius:3, order:2, yAxisID:'y'},
        {type:'bar', label:'Despesas', data: data.map(m=>m.despesas), backgroundColor:'#ff616199', borderRadius:3, order:2, yAxisID:'y'},
        {type:'line', label:'Saldo (Caixa+Bancos)', data: data.map(m=>m.saldo_atual), borderColor:'#4f8cff', backgroundColor:'#4f8cff', borderWidth:2.5, pointRadius:1.5, pointHoverRadius:5, tension:.25, order:1, yAxisID:'y1'},
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index', intersect:false},
      plugins:{
        legend:{position:'top', labels:{usePointStyle:true, boxWidth:8, padding:16}},
        tooltip:{callbacks:{label: (c)=> `${c.dataset.label}: ${fmtBRL2(c.parsed.y)}`}}
      },
      scales:{
        x:{ticks:{maxRotation:60, minRotation: labels.length>18?60:0, autoSkip:true, maxTicksLimit: 24}, grid:{display:false}},
        y:{position:'left', ticks:{callback:(v)=>fmtBRL(v,true)}, grid:{color:'#1e2637'}},
        y1:{position:'right', ticks:{callback:(v)=>fmtBRL(v,true)}, grid:{display:false}},
      }
    }
  });
}

// ---------- Annual chart ----------
function renderAnualChart(){
  if (!CHARTS_OK) { showChartFallback('chartAnual'); return; }
  const years = Object.keys(DATA.anual);
  const labels = years.map(y => y + (DATA.anual[y].completo?'':'*'));
  if (charts.anual) charts.anual.destroy();
  const ctx = document.getElementById('chartAnual').getContext('2d');
  charts.anual = new Chart(ctx, {
    type:'bar',
    data:{
      labels,
      datasets:[
        {label:'Receitas', data: years.map(y=>DATA.anual[y].receitas), backgroundColor:'#33c481CC', borderRadius:4},
        {label:'Despesas', data: years.map(y=>DATA.anual[y].despesas), backgroundColor:'#ff6161CC', borderRadius:4},
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      onClick: (evt, elements) => {
        if (elements.length){
          const idx = elements[0].index;
          const y = years[idx];
          document.getElementById('yearFilter').value = y;
          currentYear = y;
          currentMonth = 'all';
          setupMonthFilter();
          renderAll();
        }
      },
      plugins:{
        legend:{position:'top', labels:{usePointStyle:true, boxWidth:8, padding:16}},
        tooltip:{callbacks:{label:(c)=>`${c.dataset.label}: ${fmtBRL2(c.parsed.y)}`}}
      },
      scales:{
        x:{grid:{display:false}},
        y:{ticks:{callback:(v)=>fmtBRL(v,true)}, grid:{color:'#1e2637'}}
      }
    }
  });
}

// ---------- Category charts (all-time, not affected by year filter — noted in UI) ----------
function showChartFallback(canvasId){
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const box = canvas.closest('.chartbox');
  if (box) box.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:13px;text-align:center;padding:20px;">Gráfico indisponível offline (biblioteca não carregou).<br>Os dados continuam nas tabelas abaixo.</div>';
}

function renderCategoryCharts(){
  if (!CHARTS_OK) { showChartFallback('chartDespCat'); showChartFallback('chartRecCat'); return; }
  const despCats = DATA.despesas.categorias;
  const recCats = DATA.receitas.categorias;

  if (charts.despCat) charts.despCat.destroy();
  charts.despCat = new Chart(document.getElementById('chartDespCat').getContext('2d'), {
    type:'bar',
    data:{
      labels: Object.keys(despCats),
      datasets:[{data: Object.values(despCats), backgroundColor: Object.keys(despCats).map((_,i)=>PALETTE[i%PALETTE.length]), borderRadius:4}]
    },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:(c)=>fmtBRL2(c.parsed.x)}}},
      scales:{x:{ticks:{callback:(v)=>fmtBRL(v,true)}, grid:{color:'#1e2637'}}, y:{grid:{display:false}, ticks:{font:{size:11}}}}
    }
  });

  if (charts.recCat) charts.recCat.destroy();
  charts.recCat = new Chart(document.getElementById('chartRecCat').getContext('2d'), {
    type:'doughnut',
    data:{
      labels: Object.keys(recCats),
      datasets:[{data: Object.values(recCats), backgroundColor: Object.keys(recCats).map((_,i)=>PALETTE[i%PALETTE.length]), borderColor:'#161d2e', borderWidth:2}]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{position:'right', labels:{usePointStyle:true, boxWidth:8, padding:12, font:{size:11}}},
        tooltip:{callbacks:{label:(c)=>`${c.label}: ${fmtBRL2(c.parsed)}`}}
      }
    }
  });
}

// ---------- Tables ----------
let despSort = {key:'total', dir:-1};
let recSort = {key:'total', dir:-1};
let mensalSort = {key:'competencia', dir:1};

function renderSubcatTable(tbodySelector, rows, totalAll, searchTerm, sortState){
  let filtered = rows;
  if (searchTerm){
    const t = searchTerm.toLowerCase();
    filtered = rows.filter(r => r.nome.toLowerCase().includes(t) || r.categoria.toLowerCase().includes(t));
  }
  filtered = [...filtered].sort((a,b)=>{
    let av = a[sortState.key], bv = b[sortState.key];
    if (typeof av === 'string') return sortState.dir * av.localeCompare(bv);
    return sortState.dir * (av - bv);
  });
  const tbody = document.querySelector(tbodySelector);
  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td>${r.nome}</td>
      <td><span class="tag">${r.categoria}</span></td>
      <td class="num">${fmtBRL2(r.total)}</td>
      <td class="num">${fmtPct(r.total/totalAll*100)}</td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">Nenhum resultado</td></tr>';
}

function renderTables(){
  const despRows = DATA.despesas.subcategorias.map(r=>({...r, pct: r.total/DATA.despesas.total*100}));
  const recRows = DATA.receitas.subcategorias.map(r=>({...r, pct: r.total/DATA.receitas.total*100}));
  renderSubcatTable('#tableDesp tbody', despRows, DATA.despesas.total, document.getElementById('searchDesp').value, despSort);
  renderSubcatTable('#tableRec tbody', recRows, DATA.receitas.total, document.getElementById('searchRec').value, recSort);
}

function renderMensalTable(){
  const data = [...monthsForYear(currentYear)].sort((a,b)=>{
    let av = a[mensalSort.key], bv = b[mensalSort.key];
    if (mensalSort.key === 'competencia'){
      const [ma,ya] = a.competencia.split('/'); const [mb,yb] = b.competencia.split('/');
      av = parseInt(ya)*100+parseInt(ma); bv = parseInt(yb)*100+parseInt(mb);
    }
    if (typeof av === 'string') return mensalSort.dir * av.localeCompare(bv);
    return mensalSort.dir * (av - bv);
  });
  document.querySelector('#tableMensal tbody').innerHTML = data.map(m => `
    <tr${m.competencia===currentMonth ? ' class="current-month"' : ''}>
      <td>${m.competencia}</td>
      <td class="num">${fmtBRL2(m.saldo_anterior)}</td>
      <td class="num" style="color:var(--green)">${fmtBRL2(m.receitas)}</td>
      <td class="num" style="color:var(--red)">${fmtBRL2(m.despesas)}</td>
      <td class="num">${fmtBRL2(m.saldo_atual)}</td>
    </tr>`).join('');
  if (currentMonth !== 'all'){
    const row = document.querySelector('#tableMensal tbody tr.current-month');
    if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({block:'center', behavior:'smooth'});
  }
}

// ---------- Sorting interactions ----------
function setupSortHandlers(tableId, sortStateGetter, rerender){
  document.querySelectorAll(`#${tableId} thead th[data-sort]`).forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      const st = sortStateGetter();
      if (st.key === key) st.dir *= -1; else { st.key = key; st.dir = 1; }
      rerender();
    });
  });
}

// ---------- Tabs ----------
function setupTabs(){
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    });
  });
}

// ---------- Init ----------
function renderAll(){
  try { renderKPIs(); } catch(e){ console.error('renderKPIs', e); }
  try { renderMensalChart(); } catch(e){ console.error('renderMensalChart', e); }
  try { renderMensalTable(); } catch(e){ console.error('renderMensalTable', e); }
}

function safe(fn, label){
  try { fn(); } catch(err){ console.error('Falha em', label, err); }
}

document.addEventListener('DOMContentLoaded', () => {
  safe(setupYearFilter, 'setupYearFilter');
  safe(setupMonthFilter, 'setupMonthFilter');
  safe(setupMonthNav, 'setupMonthNav');
  safe(renderMissingMonths, 'renderMissingMonths');
  safe(renderCategoryCharts, 'renderCategoryCharts');
  safe(renderAnualChart, 'renderAnualChart');
  safe(renderTables, 'renderTables');
  safe(renderAll, 'renderAll');
  safe(setupTabs, 'setupTabs');

  safe(() => {
    document.getElementById('searchDesp').addEventListener('input', renderTables);
    document.getElementById('searchRec').addEventListener('input', renderTables);
    setupSortHandlers('tableDesp', ()=>despSort, renderTables);
    setupSortHandlers('tableRec', ()=>recSort, renderTables);
    setupSortHandlers('tableMensal', ()=>mensalSort, renderMensalTable);
  }, 'eventBindings');
});

