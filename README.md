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

- `index.html` — dashboard completo (abrir este arquivo)
- `dashboard_data.json` — dados fonte, para referência/auditoria
- `app.js` — lógica do dashboard (já embutida em `index.html`)
- `chartjs_lib.js` — Chart.js v4.4.4 (já embutido em `index.html`)
