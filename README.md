# Dashboard Financeiro — CERC

Dashboard interativo (HTML autossuficiente, sem dependências externas) para análise financeira mensal e anual de um condomínio, preparado para uso do Conselho Fiscal.

## Uso

Baixe `index.html` e abra diretamente no navegador (duplo-clique) — não precisa de servidor, internet ou instalação. Todos os dados e bibliotecas (Chart.js) estão embutidos no próprio arquivo.

## Funcionalidades

- KPIs de Receitas, Despesas, Resultado e Saldo (Caixa+Bancos), recalculados por período
- Filtro por ano e por mês específico, com navegação ◀ ▶ e comparação percentual com o mês anterior
- Evolução mensal (receitas x despesas x saldo) e consolidado anual
- Breakdown de despesas e receitas por categoria e subcategoria, com busca e ordenação
- Tabela mensal completa (saldo anterior, receitas, despesas, saldo atual)

## Metodologia e integridade dos dados

Os valores foram reconstruídos lançamento-a-lançamento a partir dos demonstrativos mensais originais, respeitando a hierarquia categoria/subcategoria de cada demonstrativo para evitar dupla contagem de subtotais. Onde há divergência conhecida frente ao total oficial de algum mês, isso é sinalizado no próprio dashboard (rodapé e nota de integridade).

Nomes identificando o condomínio, síndico, administradora e unidades foram removidos deste repositório.

## Estrutura

- `index.html` — dashboard completo autossuficiente (abrir este arquivo)
- `dashboard_data.json` — base de dados saneada e auditada (131 meses)
- `app.js` — lógica do dashboard e renderização de gráficos
- `chartjs_lib.js` — biblioteca Chart.js v4.4.4 offline
- `template_full.html` — template estrutural do dashboard
- `scripts/` — automações do projeto:
  - `build_dashboard.py` — compilador do dashboard final `index.html`
  - `sanitize_spreadsheet.py` — saneador e dedupicador da planilha original
- `dados_sanitizados/` — bases auditadas geradas para exportação:
  - `Planilha_Financeira_CERC_Sanitizada.xlsx` — pasta de trabalho completa (4 abas)
  - `Lancamentos_Detalhados_Limpos.csv` — lançamentos dedupicados e reclassificados
  - `Resumo_Mensal_Limpo.csv` — série mensal histórica auditada (131 meses)

