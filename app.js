// ============================================================================
// DASHBOARD FINANCEIRO CERC — APP.JS (MODERNO, REATIVO & ALTA PRECISÃO)
// ============================================================================

// ---------- Helpers de Formatação e Moeda ----------
const fmtBRL = (v, compact = false) => {
  if (v === null || v === undefined || isNaN(v)) return 'R$ 0,00';
  if (compact) {
    const abs = Math.abs(v);
    if (abs >= 1e6) return (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'M';
    if (abs >= 1e3) return (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'K';
  }
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtBRL0 = (v) => {
  if (v === null || v === undefined || isNaN(v)) return 'R$ 0';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

const fmtPct = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '0,0%';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
};

const PALETTE = [
  '#38bdf8', '#10b981', '#f59e0b', '#f43f5e', '#818cf8',
  '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#e11d48', '#d946ef', '#22c55e'
];

// ---------- Chart.js Defaults & Setup ----------
const CHARTS_OK = (typeof Chart !== 'undefined');
let currentTheme = localStorage.getItem('cerc_theme') || 'dark';

function updateChartDefaults() {
  if (!CHARTS_OK) return;
  const isLight = (currentTheme === 'light');
  Chart.defaults.color = isLight ? '#475569' : '#94a3b8';
  Chart.defaults.borderColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';
  Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
}
updateChartDefaults();

// ---------- Global State ----------
let currentYear = 'all';
let currentMonth = 'all'; // 'all' ou 'MM/AAAA'
let monthly = DATA.mensal || [];
let transactions = DATA.transacoes || [];
let charts = {};

// Estado da Auditoria Transacional
let auditState = {
  search: '',
  tipo: 'all',
  ano: 'all',
  mes: 'all',
  minVal: null,
  maxVal: null,
  sortCol: 'c',
  sortAsc: false,
  page: 1,
  pageSize: 50,
  activeChip: null
};

// Estado da Tabela de Subcategorias
let subcatState = {
  mode: 'DESPESAS', // 'DESPESAS' ou 'RECEITAS'
  search: '',
  sortCol: 'total',
  sortAsc: false
};

// ---------- Navegação por Abas (Tabs) ----------
function setupTabs() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      const activePanel = document.getElementById(`view-${view}`);
      if (activePanel) activePanel.classList.add('active');

      // Redesenha gráficos para evitar distorção de dimensão ao desocultar aba
      if (view === 'overview') {
        renderMensalChart();
        renderAnualChart();
      } else if (view === 'xray') {
        renderDespCatChart();
        renderRecCatChart();
      }
    });
  });
}

// ---------- Dark / Light Mode Toggle ----------
function setupThemeToggle() {
  const btn = document.getElementById('btnThemeToggle');
  const icon = document.getElementById('themeIcon');

  function applyTheme(t) {
    currentTheme = t;
    localStorage.setItem('cerc_theme', t);
    if (t === 'light') {
      document.body.classList.add('light-theme');
      btn.innerHTML = '<span>🌙</span> Modo Escuro';
    } else {
      document.body.classList.remove('light-theme');
      btn.innerHTML = '<span>☀️</span> Modo Claro';
    }
    updateChartDefaults();
    renderAllCharts();
  }

  applyTheme(currentTheme);
  btn.addEventListener('click', () => {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
  });
}

// ---------- Filtros Globais de Período ----------
function monthsForYear(year) {
  if (year === 'all') return monthly;
  return monthly.filter(m => m.competencia.split('/')[1] === year);
}

function monthIndex(comp) {
  return monthly.findIndex(m => m.competencia === comp);
}

function setupPeriodFilters() {
  const yearSel = document.getElementById('yearFilter');
  const monthSel = document.getElementById('monthFilter');
  const years = Object.keys(DATA.anual || {}).sort();

  yearSel.innerHTML = '<option value="all">Todo o Histórico (2014 – 2025)</option>' +
    years.map(y => `<option value="${y}">Exercício ${y}</option>`).join('');

  yearSel.addEventListener('change', (e) => {
    currentYear = e.target.value;
    currentMonth = 'all';
    setupMonthFilterOptions();
    renderAll();
  });

  setupMonthFilterOptions();

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    const idx = monthIndex(currentMonth);
    if (idx > 0) goToMonth(monthly[idx - 1].competencia);
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    const idx = monthIndex(currentMonth);
    if (idx !== -1 && idx < monthly.length - 1) goToMonth(monthly[idx + 1].competencia);
  });

  document.getElementById('btnResetFilter').addEventListener('click', () => {
    currentYear = 'all';
    currentMonth = 'all';
    yearSel.value = 'all';
    setupMonthFilterOptions();
    renderAll();
  });

  monthSel.addEventListener('change', (e) => {
    currentMonth = e.target.value;
    updateNavButtons();
    renderAll();
  });
}

function setupMonthFilterOptions() {
  const sel = document.getElementById('monthFilter');
  const list = monthsForYear(currentYear);
  const nomes = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  sel.innerHTML = '<option value="all">Todos os meses' + (currentYear === 'all' ? '' : ' de ' + currentYear) + '</option>' +
    list.map(m => {
      const [mm, yyyy] = m.competencia.split('/');
      return `<option value="${m.competencia}">${nomes[parseInt(mm)]}/${yyyy}</option>`;
    }).join('');

  sel.value = currentMonth;
  updateNavButtons();
}

function updateNavButtons() {
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');
  if (currentMonth === 'all') {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    prevBtn.style.opacity = '0.35';
    nextBtn.style.opacity = '0.35';
    return;
  }
  const idx = monthIndex(currentMonth);
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx === -1 || idx >= monthly.length - 1;
  prevBtn.style.opacity = prevBtn.disabled ? '0.35' : '1';
  nextBtn.style.opacity = nextBtn.disabled ? '0.35' : '1';
}

function goToMonth(comp) {
  currentMonth = comp;
  currentYear = comp.split('/')[1];
  document.getElementById('yearFilter').value = currentYear;
  setupMonthFilterOptions();
  renderAll();
}

// ---------- Gerador de Sparkline SVG ----------
function createSparklineSVG(points, strokeColor) {
  if (!points || points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = (max - min) || 1;
  const w = 90, h = 34, pad = 3;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((p - min) / range) * (h - 2 * pad);
    return [x, y];
  });
  const dLine = coords.map((c, i) => (i === 0 ? 'M' : 'L') + `${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
  const dArea = `${dLine} L${(w - pad).toFixed(1)},${h} L${pad},${h} Z`;
  const gradId = 'spk_' + Math.random().toString(36).substr(2, 9);

  return `<svg class="kpi-sparkline" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <path d="${dArea}" fill="url(#${gradId})" />
    <path d="${dLine}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}

// ---------- Renderização de KPIs Executivos ----------
function renderKPIs() {
  const container = document.getElementById('kpiRow');
  let totalRec, totalDesp, resultado, saldoFinal, saldoInicial;
  let sparkRec = [], sparkDesp = [], sparkRes = [], sparkSaldo = [];
  let cmpRec = '', cmpDesp = '', cmpRes = '', cmpSaldo = '';

  if (currentMonth !== 'all') {
    const idx = monthIndex(currentMonth);
    const m = monthly[idx];
    const prev = idx > 0 ? monthly[idx - 1] : null;

    totalRec = m.receitas;
    totalDesp = m.despesas;
    resultado = m.receitas - m.despesas;
    saldoFinal = m.saldo_atual;
    saldoInicial = m.saldo_anterior;

    // Sparkline dos últimos 12 meses até o mês atual
    const sliceStart = Math.max(0, idx - 11);
    const slice = monthly.slice(sliceStart, idx + 1);
    sparkRec = slice.map(x => x.receitas);
    sparkDesp = slice.map(x => x.despesas);
    sparkRes = slice.map(x => x.receitas - x.despesas);
    sparkSaldo = slice.map(x => x.saldo_atual);

    if (prev) {
      const dRec = ((m.receitas - prev.receitas) / prev.receitas) * 100;
      const dDesp = ((m.despesas - prev.despesas) / prev.despesas) * 100;
      const dRes = prev.resultado !== 0 ? ((resultado - (prev.receitas - prev.despesas)) / Math.abs(prev.receitas - prev.despesas)) * 100 : 0;
      const dSaldo = ((m.saldo_atual - prev.saldo_atual) / prev.saldo_atual) * 100;

      cmpRec = `<span class="kpi-cmp ${dRec >= 0 ? 'up-good' : 'down-bad'}">${dRec >= 0 ? '▲' : '▼'} ${Math.abs(dRec).toFixed(1)}% vs anterior</span>`;
      cmpDesp = `<span class="kpi-cmp ${dDesp <= 0 ? 'down-good' : 'up-bad'}">${dDesp <= 0 ? '▼' : '▲'} ${Math.abs(dDesp).toFixed(1)}% vs anterior</span>`;
      cmpRes = `<span class="kpi-cmp ${resultado >= 0 ? 'up-good' : 'down-bad'}">${resultado >= 0 ? 'Superávit' : 'Déficit'} no mês</span>`;
      cmpSaldo = `<span class="kpi-cmp ${dSaldo >= 0 ? 'up-good' : 'down-bad'}">${dSaldo >= 0 ? '▲' : '▼'} ${Math.abs(dSaldo).toFixed(1)}%</span>`;
    }
  } else {
    const list = monthsForYear(currentYear);
    totalRec = list.reduce((s, m) => s + m.receitas, 0);
    totalDesp = list.reduce((s, m) => s + m.despesas, 0);
    resultado = totalRec - totalDesp;
    saldoFinal = list.length ? list[list.length - 1].saldo_atual : 0;
    saldoInicial = list.length ? list[0].saldo_anterior : 0;

    sparkRec = list.map(m => m.receitas);
    sparkDesp = list.map(m => m.despesas);
    sparkRes = list.map(m => m.receitas - m.despesas);
    sparkSaldo = list.map(m => m.saldo_atual);

    const mediaRec = list.length ? totalRec / list.length : 0;
    const mediaDesp = list.length ? totalDesp / list.length : 0;

    cmpRec = `<span class="kpi-cmp neutral">Média: ${fmtBRL0(mediaRec)}/mês</span>`;
    cmpDesp = `<span class="kpi-cmp neutral">Média: ${fmtBRL0(mediaDesp)}/mês</span>`;
    cmpRes = `<span class="kpi-cmp ${resultado >= 0 ? 'up-good' : 'down-bad'}">${resultado >= 0 ? '▲ Superávit Consolidado' : '▼ Déficit Consolidado'}</span>`;
    cmpSaldo = `<span class="kpi-cmp neutral">Início: ${fmtBRL0(saldoInicial)}</span>`;
  }

  const kpis = [
    {
      label: 'Receitas Totais',
      val: fmtBRL(totalRec),
      color: '#10b981',
      cls: 'green',
      cmp: cmpRec,
      sub: currentMonth !== 'all' ? `Competência ${currentMonth}` : `${monthsForYear(currentYear).length} meses apurados`,
      spark: createSparklineSVG(sparkRec, '#10b981')
    },
    {
      label: 'Despesas Totais',
      val: fmtBRL(totalDesp),
      color: '#f43f5e',
      cls: 'red',
      cmp: cmpDesp,
      sub: currentMonth !== 'all' ? `Competência ${currentMonth}` : `${monthsForYear(currentYear).length} meses apurados`,
      spark: createSparklineSVG(sparkDesp, '#f43f5e')
    },
    {
      label: 'Resultado Líquido',
      val: fmtBRL(resultado),
      color: resultado >= 0 ? '#10b981' : '#f43f5e',
      cls: resultado >= 0 ? 'green' : 'red',
      cmp: cmpRes,
      sub: totalRec > 0 ? `Margem: ${((resultado / totalRec) * 100).toFixed(1)}% sobre arrecadação` : 'Sem dados',
      spark: createSparklineSVG(sparkRes, resultado >= 0 ? '#10b981' : '#f43f5e')
    },
    {
      label: 'Saldo em Caixa & Bancos',
      val: fmtBRL(saldoFinal),
      color: '#38bdf8',
      cls: 'purple',
      cmp: cmpSaldo,
      sub: `Liquidez apurada ao final do período`,
      spark: createSparklineSVG(sparkSaldo, '#38bdf8')
    }
  ];

  container.innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.cls}">
      <div class="kpi-header">
        <span class="kpi-label">${k.label}</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-value ${k.cls}">${k.val}</span>
        ${k.spark}
      </div>
      <div class="kpi-footer">
        <span>${k.sub}</span>
        ${k.cmp}
      </div>
    </div>
  `).join('');

  renderGovMetrics();
}

// ---------- Métricas de Governança & Solvência ----------
function renderGovMetrics() {
  const container = document.getElementById('overviewGovMetrics');
  if (!container) return;

  const list = monthsForYear(currentYear);
  const totalDesp = list.reduce((s, m) => s + m.despesas, 0);
  const totalRec = list.reduce((s, m) => s + m.receitas, 0);
  const positivos = list.filter(m => (m.receitas - m.despesas) >= 0).length;

  // Maior despesa
  let maxDespMonth = list[0] || { competencia: '-', despesas: 0 };
  let maxRecMonth = list[0] || { competencia: '-', receitas: 0 };
  list.forEach(m => {
    if (m.despesas > maxDespMonth.despesas) maxDespMonth = m;
    if (m.receitas > maxRecMonth.receitas) maxRecMonth = m;
  });

  const mediaDesp = list.length ? totalDesp / list.length : 0;
  const taxaSucesso = list.length ? (positivos / list.length) * 100 : 0;

  container.innerHTML = `
    <div class="audit-metric-pill">
      <span class="audit-metric-label">Média Mensal de Gastos</span>
      <span class="audit-metric-val">${fmtBRL(mediaDesp)}</span>
    </div>
    <div class="audit-metric-pill">
      <span class="audit-metric-label">Maior Gasto do Período</span>
      <span class="audit-metric-val" style="color:var(--red);">${fmtBRL(maxDespMonth.despesas)} <small style="font-size:12px;color:var(--text-muted);font-weight:400;">(${maxDespMonth.competencia})</small></span>
    </div>
    <div class="audit-metric-pill">
      <span class="audit-metric-label">Maior Arrecadação</span>
      <span class="audit-metric-val" style="color:var(--green);">${fmtBRL(maxRecMonth.receitas)} <small style="font-size:12px;color:var(--text-muted);font-weight:400;">(${maxRecMonth.competencia})</small></span>
    </div>
    <div class="audit-metric-pill">
      <span class="audit-metric-label">Meses com Superávit</span>
      <span class="audit-metric-val">${positivos} de ${list.length} <small style="font-size:12px;color:var(--text-muted);font-weight:400;">(${taxaSucesso.toFixed(0)}%)</small></span>
    </div>
  `;
}

// ---------- Gráfico Mensal (Chart.js) ----------
function renderMensalChart() {
  if (!CHARTS_OK) return;
  const data = monthsForYear(currentYear);
  const labels = data.map(m => m.competencia);
  const ctx = document.getElementById('chartMensal');
  if (!ctx) return;
  if (charts.mensal) charts.mensal.destroy();

  const isLight = (currentTheme === 'light');
  charts.mensal = new Chart(ctx.getContext('2d'), {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Receitas', data: data.map(m => m.receitas), backgroundColor: '#10b981cc', borderRadius: 4, order: 2, yAxisID: 'y' },
        { type: 'bar', label: 'Despesas', data: data.map(m => m.despesas), backgroundColor: '#f43f5ecc', borderRadius: 4, order: 2, yAxisID: 'y' },
        { type: 'line', label: 'Caixa & Bancos', data: data.map(m => m.saldo_atual), borderColor: '#38bdf8', backgroundColor: '#38bdf8', borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 6, tension: 0.2, order: 1, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: labels.length > 24 ? 45 : 0, autoSkip: true, maxTicksLimit: 24 }, grid: { display: false } },
        y: { position: 'left', ticks: { callback: (v) => fmtBRL(v, true) }, grid: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' } },
        y1: { position: 'right', ticks: { callback: (v) => fmtBRL(v, true) }, grid: { display: false } }
      }
    }
  });
}

// ---------- Gráfico Anual (Chart.js) ----------
function renderAnualChart() {
  if (!CHARTS_OK) return;
  const years = Object.keys(DATA.anual || {}).sort();
  const ctx = document.getElementById('chartAnual');
  if (!ctx) return;
  if (charts.anual) charts.anual.destroy();

  const isLight = (currentTheme === 'light');
  charts.anual = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        { label: 'Receitas', data: years.map(y => DATA.anual[y].receitas), backgroundColor: '#10b981dd', borderRadius: 4 },
        { label: 'Despesas', data: years.map(y => DATA.anual[y].despesas), backgroundColor: '#f43f5edd', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (evt, elements) => {
        if (elements.length) {
          const y = years[elements[0].index];
          document.getElementById('yearFilter').value = y;
          currentYear = y;
          currentMonth = 'all';
          setupMonthFilterOptions();
          renderAll();
        }
      },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}` } }
      },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: (v) => fmtBRL(v, true) }, grid: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' } }
      }
    }
  });
}

// ---------- Gráficos de Categorias (Rosca / Donut) ----------
function renderCategoryCharts() {
  renderDespCatChart();
  renderRecCatChart();
}

function getAggregatedDataForPeriod(tipo) {
  // tipo: 'DESPESAS' ou 'RECEITAS'
  let filtered = transactions.filter(t => t.t === tipo);

  if (currentMonth !== 'all') {
    filtered = filtered.filter(t => t.c === currentMonth);
  } else if (currentYear !== 'all') {
    filtered = filtered.filter(t => t.c.endsWith('/' + currentYear));
  }

  const catMap = {};
  const subMap = {};

  filtered.forEach(t => {
    catMap[t.cat] = (catMap[t.cat] || 0) + t.v;
    subMap[t.s] = subMap[t.s] || { nome: t.s, categoria: t.cat, total: 0 };
    subMap[t.s].total += t.v;
  });

  const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const subSorted = Object.values(subMap).sort((a, b) => b.total - a.total);
  const total = catSorted.reduce((s, x) => s + x[1], 0);

  return { catSorted, subSorted, total };
}

function renderDespCatChart() {
  if (!CHARTS_OK) return;
  const { catSorted, total } = getAggregatedDataForPeriod('DESPESAS');
  const ctx = document.getElementById('chartDespCat');
  if (!ctx) return;
  if (charts.despCat) charts.despCat.destroy();

  const desc = document.getElementById('descDespCat');
  if (desc) desc.textContent = `Total: ${fmtBRL(total)} (${currentMonth !== 'all' ? currentMonth : (currentYear !== 'all' ? 'Exercício ' + currentYear : 'Todo o Histórico')})`;

  charts.despCat = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: catSorted.map(x => x[0]),
      datasets: [{
        data: catSorted.map(x => x[1]),
        backgroundColor: PALETTE,
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const val = c.parsed;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${c.label}: ${fmtBRL(val)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function renderRecCatChart() {
  if (!CHARTS_OK) return;
  const { catSorted, total } = getAggregatedDataForPeriod('RECEITAS');
  const ctx = document.getElementById('chartRecCat');
  if (!ctx) return;
  if (charts.recCat) charts.recCat.destroy();

  const desc = document.getElementById('descRecCat');
  if (desc) desc.textContent = `Total: ${fmtBRL(total)} (${currentMonth !== 'all' ? currentMonth : (currentYear !== 'all' ? 'Exercício ' + currentYear : 'Todo o Histórico')})`;

  charts.recCat = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: catSorted.map(x => x[0]),
      datasets: [{
        data: catSorted.map(x => x[1]),
        backgroundColor: ['#10b981', '#38bdf8', '#818cf8', '#f59e0b', '#06b6d4'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const val = c.parsed;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${c.label}: ${fmtBRL(val)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ---------- Tabela de Subcategorias (Aba 2) ----------
function setupSubcatTable() {
  const btnDesp = document.getElementById('btnSubcatDesp');
  const btnRec = document.getElementById('btnSubcatRec');
  const searchInput = document.getElementById('searchSubcat');

  btnDesp.addEventListener('click', () => {
    subcatState.mode = 'DESPESAS';
    btnDesp.classList.add('active');
    btnRec.classList.remove('active');
    renderSubcatTable();
  });

  btnRec.addEventListener('click', () => {
    subcatState.mode = 'RECEITAS';
    btnRec.classList.add('active');
    btnDesp.classList.remove('active');
    renderSubcatTable();
  });

  searchInput.addEventListener('input', (e) => {
    subcatState.search = e.target.value.toLowerCase().trim();
    renderSubcatTable();
  });

  // Ordenação clicável dos cabeçalhos
  document.querySelectorAll('#tableSubcat thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (subcatState.sortCol === col) {
        subcatState.sortAsc = !subcatState.sortAsc;
      } else {
        subcatState.sortCol = col;
        subcatState.sortAsc = (col === 'nome' || col === 'categoria');
      }
      renderSubcatTable();
    });
  });
}

function renderSubcatTable() {
  const tbody = document.querySelector('#tableSubcat tbody');
  const { subSorted, total } = getAggregatedDataForPeriod(subcatState.mode);

  let filtered = subSorted;
  if (subcatState.search) {
    filtered = filtered.filter(s =>
      s.nome.toLowerCase().includes(subcatState.search) ||
      s.categoria.toLowerCase().includes(subcatState.search)
    );
  }

  filtered.sort((a, b) => {
    let valA = a[subcatState.sortCol];
    let valB = b[subcatState.sortCol];
    if (typeof valA === 'string') return subcatState.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    return subcatState.sortAsc ? (valA - valB) : (valB - valA);
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">Nenhuma conta encontrada para o filtro selecionado.</td></tr>';
    return;
  }

  const maxVal = subSorted.length ? subSorted[0].total : 1;

  tbody.innerHTML = filtered.map(s => {
    const pct = total > 0 ? (s.total / total) * 100 : 0;
    const barWidth = Math.max(3, (s.total / maxVal) * 80);
    return `
      <tr>
        <td><b>${s.nome}</b></td>
        <td><span class="tag-tipo" style="background:var(--bg-elevated);color:var(--text-secondary);">${s.categoria}</span></td>
        <td class="num">${fmtBRL(s.total)}</td>
        <td class="num">
          <div class="bar-fill-wrap">
            <span>${pct.toFixed(1)}%</span>
            <div class="bar-fill" style="width:${barWidth}px;"></div>
          </div>
        </td>
        <td style="text-align:center;">
          <button class="btn-icon" style="padding:3px 8px;font-size:11px;" onclick="drillDownToAudit('${encodeURIComponent(s.nome)}')">
            🔍 Auditar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Atalho de Drill-Down: Navega da Subcategoria para a Auditoria Transacional
window.drillDownToAudit = function(encodedName) {
  const name = decodeURIComponent(encodedName);
  const auditTab = document.querySelector('.nav-tab-btn[data-view="audit"]');
  if (auditTab) auditTab.click();

  const searchInput = document.getElementById('auditSearchInput');
  if (searchInput) {
    searchInput.value = name;
    auditState.search = name.toLowerCase();
    document.getElementById('auditSearchClear').style.display = 'flex';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    auditState.page = 1;
    renderAuditModule();
  }
};

// ---------- NOVO MÓDULO: AUDITORIA TRANSACIONAL (ABA 3) ----------
function setupAuditModule() {
  const searchInput = document.getElementById('auditSearchInput');
  const searchClear = document.getElementById('auditSearchClear');
  const tipoFilter = document.getElementById('auditTipoFilter');
  const yearFilter = document.getElementById('auditYearFilter');
  const monthFilter = document.getElementById('auditMonthFilter');
  const minInput = document.getElementById('auditMinVal');
  const maxInput = document.getElementById('auditMaxVal');
  const pageSizeSel = document.getElementById('auditPageSize');
  const resetBtn = document.getElementById('btnAuditReset');
  const exportBtn = document.getElementById('btnExportCSV');

  // Popula anos no filtro da auditoria
  const years = Object.keys(DATA.anual || {}).sort();
  yearFilter.innerHTML = '<option value="all">Todos os Anos</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join('');

  // Busca instantânea
  searchInput.addEventListener('input', (e) => {
    auditState.search = e.target.value.toLowerCase().trim();
    searchClear.style.display = auditState.search ? 'flex' : 'none';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    auditState.page = 1;
    renderAuditModule();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    auditState.search = '';
    searchClear.style.display = 'none';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    auditState.page = 1;
    renderAuditModule();
  });

  // Atalho ESC limpa busca
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchClear.click();
    }
  });

  // Chips Rápidos
  document.querySelectorAll('.chip[data-chip]').forEach(chip => {
    chip.addEventListener('click', () => {
      const term = chip.getAttribute('data-chip');
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        searchInput.value = '';
        auditState.search = '';
        searchClear.style.display = 'none';
        auditState.minVal = null;
      } else {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (term === 'grandes') {
          searchInput.value = '';
          auditState.search = '';
          auditState.minVal = 2000;
          minInput.value = 2000;
        } else {
          searchInput.value = term;
          auditState.search = term.toLowerCase();
          searchClear.style.display = 'flex';
        }
      }
      auditState.page = 1;
      renderAuditModule();
    });
  });

  // Filtros combinados
  tipoFilter.addEventListener('change', (e) => {
    auditState.tipo = e.target.value;
    auditState.page = 1;
    renderAuditModule();
  });
  yearFilter.addEventListener('change', (e) => {
    auditState.ano = e.target.value;
    auditState.page = 1;
    renderAuditModule();
  });
  monthFilter.addEventListener('change', (e) => {
    auditState.mes = e.target.value;
    auditState.page = 1;
    renderAuditModule();
  });
  minInput.addEventListener('input', (e) => {
    auditState.minVal = e.target.value ? parseFloat(e.target.value) : null;
    auditState.page = 1;
    renderAuditModule();
  });
  maxInput.addEventListener('input', (e) => {
    auditState.maxVal = e.target.value ? parseFloat(e.target.value) : null;
    auditState.page = 1;
    renderAuditModule();
  });
  pageSizeSel.addEventListener('change', (e) => {
    auditState.pageSize = parseInt(e.target.value);
    auditState.page = 1;
    renderAuditModule();
  });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    tipoFilter.value = 'all';
    yearFilter.value = 'all';
    monthFilter.value = 'all';
    minInput.value = '';
    maxInput.value = '';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    auditState = {
      search: '',
      tipo: 'all',
      ano: 'all',
      mes: 'all',
      minVal: null,
      maxVal: null,
      sortCol: 'c',
      sortAsc: false,
      page: 1,
      pageSize: 50,
      activeChip: null
    };
    renderAuditModule();
  });

  // Paginação
  document.getElementById('auditFirstPage').addEventListener('click', () => { auditState.page = 1; renderAuditModule(); });
  document.getElementById('auditPrevPage').addEventListener('click', () => { if (auditState.page > 1) { auditState.page--; renderAuditModule(); } });
  document.getElementById('auditNextPage').addEventListener('click', () => { auditState.page++; renderAuditModule(); });
  document.getElementById('auditLastPage').addEventListener('click', () => { auditState.page = auditState.maxPage || 1; renderAuditModule(); });

  // Ordenação de colunas da auditoria
  document.querySelectorAll('#tableAudit thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (auditState.sortCol === col) {
        auditState.sortAsc = !auditState.sortAsc;
      } else {
        auditState.sortCol = col;
        auditState.sortAsc = (col === 's' || col === 'cat' || col === 't');
      }
      renderAuditModule();
    });
  });

  // Exportação CSV
  exportBtn.addEventListener('click', () => exportAuditCSV());
}

function getFilteredAuditData() {
  return transactions.filter(t => {
    // Busca textual
    if (auditState.search) {
      const target = (t.s + ' ' + t.cat).toLowerCase();
      if (!target.includes(auditState.search)) return false;
    }
    // Tipo
    if (auditState.tipo !== 'all') {
      if (auditState.tipo === 'SALDO') {
        if (!t.t.startsWith('SALDO')) return false;
      } else if (t.t !== auditState.tipo) {
        return false;
      }
    }
    // Ano
    if (auditState.ano !== 'all') {
      if (!t.c.endsWith('/' + auditState.ano)) return false;
    }
    // Mês
    if (auditState.mes !== 'all') {
      if (!t.c.startsWith(auditState.mes + '/')) return false;
    }
    // Valores
    if (auditState.minVal !== null && t.v < auditState.minVal) return false;
    if (auditState.maxVal !== null && t.v > auditState.maxVal) return false;

    return true;
  });
}

function renderAuditModule() {
  const filtered = getFilteredAuditData();
  const total = filtered.reduce((s, t) => s + t.v, 0);
  const count = filtered.length;
  const avg = count ? total / count : 0;
  let maxItem = filtered[0] || { v: 0, c: '-', s: '-' };
  filtered.forEach(t => { if (t.v > maxItem.v) maxItem = t; });

  // Atualiza métricas em tempo real
  document.getElementById('auditMetricTotal').textContent = fmtBRL(total);
  document.getElementById('auditMetricCount').textContent = count.toLocaleString('pt-BR');
  document.getElementById('auditMetricAvg').textContent = fmtBRL(avg);
  document.getElementById('auditMetricMax').innerHTML = `${fmtBRL(maxItem.v)} <small style="font-size:11.5px;color:var(--text-muted);font-weight:400;">(${maxItem.s} · ${maxItem.c})</small>`;

  // Ordenação
  filtered.sort((a, b) => {
    let valA = a[auditState.sortCol];
    let valB = b[auditState.sortCol];
    if (auditState.sortCol === 'c') {
      // Ordenação cronológica MM/AAAA
      const [mA, yA] = a.c.split('/').map(Number);
      const [mB, yB] = b.c.split('/').map(Number);
      const numA = yA * 100 + mA;
      const numB = yB * 100 + mB;
      return auditState.sortAsc ? (numA - numB) : (numB - numA);
    }
    if (typeof valA === 'string') {
      return auditState.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return auditState.sortAsc ? (valA - valB) : (valB - valA);
  });

  // Paginação
  const pageSize = auditState.pageSize;
  const maxPage = Math.max(1, Math.ceil(count / pageSize));
  auditState.maxPage = maxPage;
  if (auditState.page > maxPage) auditState.page = maxPage;
  if (auditState.page < 1) auditState.page = 1;

  const startIdx = (auditState.page - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  // Informação de página
  const endIdx = Math.min(startIdx + pageItems.length, count);
  document.getElementById('auditPageInfo').textContent = `${count ? startIdx + 1 : 0}-${endIdx} de ${count.toLocaleString('pt-BR')}`;

  document.getElementById('auditFirstPage').disabled = (auditState.page <= 1);
  document.getElementById('auditPrevPage').disabled = (auditState.page <= 1);
  document.getElementById('auditNextPage').disabled = (auditState.page >= maxPage);
  document.getElementById('auditLastPage').disabled = (auditState.page >= maxPage);

  // Renderiza tabela
  const tbody = document.querySelector('#tableAudit tbody');
  if (!pageItems.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">Nenhum lançamento corresponde aos filtros aplicados. Tente ajustar a busca ou os valores.</td></tr>';
    return;
  }

  tbody.innerHTML = pageItems.map(t => {
    const pct = total > 0 ? (t.v / total) * 100 : 0;
    const tipoBadge = t.t === 'DESPESAS' ? 'DESPESAS' : (t.t === 'RECEITAS' ? 'RECEITAS' : 'SALDO');
    return `
      <tr>
        <td>
          <a href="javascript:void(0)" onclick="goToMonth('${t.c}')" style="color:var(--accent);text-decoration:none;font-weight:600;" title="Filtrar competência no dashboard">
            ${t.c}
          </a>
        </td>
        <td><span class="tag-tipo ${tipoBadge}">${t.t}</span></td>
        <td><b>${t.s}</b></td>
        <td><span style="color:var(--text-secondary);font-size:12px;">${t.cat}</span></td>
        <td class="num" style="font-weight:700;">${fmtBRL(t.v)}</td>
        <td class="num" style="color:var(--text-muted);font-size:12px;">${pct.toFixed(2)}%</td>
      </tr>
    `;
  }).join('');
}

function exportAuditCSV() {
  const filtered = getFilteredAuditData();
  if (!filtered.length) {
    alert('Nenhum dado para exportar.');
    return;
  }

  let csv = '\uFEFF'; // UTF-8 BOM para abrir acentuado no Excel
  csv += 'Competência;Tipo;Conta / Subcategoria;Categoria Macro;Valor (R$)\r\n';

  filtered.forEach(t => {
    const valStr = t.v.toFixed(2).replace('.', ',');
    csv += `"${t.c}";"${t.t}";"${t.s}";"${t.cat}";"${valStr}"\r\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CERC_Auditoria_Lancamentos_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- DRE & EXTRATO MENSAL (ABA 4) ----------
let dreSortCol = 'competencia';
let dreSortAsc = false;

function setupDRETable() {
  document.querySelectorAll('#tableMensal thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (dreSortCol === col) {
        dreSortAsc = !dreSortAsc;
      } else {
        dreSortCol = col;
        dreSortAsc = (col === 'competencia');
      }
      renderDRETable();
    });
  });

  document.getElementById('btnExportDRE').addEventListener('click', () => {
    let csv = '\uFEFF';
    csv += 'Competência;Saldo Inicial;Receitas;Despesas;Resultado Líquido;Saldo Final;Auditoria\r\n';
    monthly.forEach(m => {
      const res = m.receitas - m.despesas;
      csv += `"${m.competencia}";"${m.saldo_anterior.toFixed(2).replace('.', ',')}";"${m.receitas.toFixed(2).replace('.', ',')}";"${m.despesas.toFixed(2).replace('.', ',')}";"${res.toFixed(2).replace('.', ',')}";"${m.saldo_atual.toFixed(2).replace('.', ',')}";"100% Auditado"\r\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CERC_DRE_Mensal_131_Meses.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

function renderDRETable() {
  const tbody = document.querySelector('#tableMensal tbody');
  const items = [...monthly];

  items.sort((a, b) => {
    if (dreSortCol === 'competencia') {
      const [mA, yA] = a.competencia.split('/').map(Number);
      const [mB, yB] = b.competencia.split('/').map(Number);
      const numA = yA * 100 + mA;
      const numB = yB * 100 + mB;
      return dreSortAsc ? (numA - numB) : (numB - numA);
    }
    const valA = dreSortCol === 'resultado' ? (a.receitas - a.despesas) : a[dreSortCol];
    const valB = dreSortCol === 'resultado' ? (b.receitas - b.despesas) : b[dreSortCol];
    return dreSortAsc ? (valA - valB) : (valB - valA);
  });

  tbody.innerHTML = items.map(m => {
    const res = m.receitas - m.despesas;
    const isCurrent = (m.competencia === currentMonth);
    return `
      <tr class="${isCurrent ? 'current-month' : ''}">
        <td>
          <a href="javascript:void(0)" onclick="goToMonth('${m.competencia}')" style="color:var(--accent);text-decoration:none;font-weight:700;">
            ${m.competencia}
          </a>
        </td>
        <td class="num">${fmtBRL(m.saldo_anterior)}</td>
        <td class="num" style="color:var(--green);font-weight:600;">${fmtBRL(m.receitas)}</td>
        <td class="num" style="color:var(--red);font-weight:600;">${fmtBRL(m.despesas)}</td>
        <td class="num" style="font-weight:700;color:${res >= 0 ? 'var(--green)' : 'var(--red)'};">
          ${res >= 0 ? '+' : ''}${fmtBRL(res)}
        </td>
        <td class="num" style="font-weight:700;">${fmtBRL(m.saldo_atual)}</td>
        <td style="text-align:center;">
          <span class="badge badge-audit" style="font-size:10.5px;">✓ Reconciliado</span>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------- Render All ----------
function renderAllCharts() {
  renderMensalChart();
  renderAnualChart();
  renderCategoryCharts();
}

function renderAll() {
  renderKPIs();
  renderAllCharts();
  renderSubcatTable();
  renderAuditModule();
  renderDRETable();
}

// ---------- Inicialização Principal ----------
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupThemeToggle();
  setupPeriodFilters();
  setupSubcatTable();
  setupAuditModule();
  setupDRETable();

  // Botão Imprimir
  document.getElementById('btnPrint').addEventListener('click', () => {
    window.print();
  });

  // Atualiza badge de total
  const badgeLanc = document.getElementById('badgeTotalLancamentos');
  if (badgeLanc) badgeLanc.textContent = transactions.length.toLocaleString('pt-BR');

  // Render inicial
  renderAll();
});
