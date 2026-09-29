# Dashboard Financeiro — CERC (12/2014 a 10/2025)

Dashboard interativo autossuficiente (HTML/JS com Chart.js embutido) para análise contábil, evolução financeira e prestação de contas do Condomínio Edifício Residencial CERC, preparado para o Conselho Fiscal e Administração.

---

## 🚀 Como Visualizar
Basta abrir o arquivo **`index.html`** diretamente em qualquer navegador web (Google Chrome, Safari, Edge, Firefox).
* **Sem dependências externas:** funciona 100% offline, sem necessidade de internet, servidor web ou instalação de pacotes.
* **Portabilidade total:** dados consolidados e bibliotecas visuais estão compilados dentro do próprio arquivo.

---

## 📊 Funcionalidades do Dashboard
- **Filtros Temporais Dinâmicos:** visualização do consolidado geral (todo o período), por ano específico (2015 a 2025) ou mês a mês (131 competências).
- **Indicadores Chave (KPIs):** Receitas, Despesas, Resultado Operacional e Saldo Final recalculados instantaneamente com comparativo em relação ao período anterior.
- **Gráficos Interativos:**
  - Evolução temporal de receitas, despesas e saldo bancário.
  - Distribuição e representatividade de receitas e despesas por categoria (rosca e barras horizontais dinâmicas por ano/mês).
- **Detalhamento por Subcategoria:** tabela interativa com ordenação, busca e detalhamento dos gastos por competência selecionada.
- **DRE Mensal Completa:** extrato contábil contendo Saldo Inicial, Entradas, Saídas e Saldo Final mês a mês.

---

## 🔍 Auditoria Contábil e Integridade dos Dados
Durante a auditoria técnica da base histórica (131 meses), foram identificadas e corrigidas as seguintes divergências:

1. **Reconciliação Contábil Completa (100% dos meses):**
   - Garantida a equação fundamental: `Saldo Atual = Saldo Anterior + Receitas - Despesas`.
   - Ajustadas descontinuidades em `01/2016`, `06/2016` e `08/2024`.
2. **Recuperação de Receitas Omitidas:**
   - **04/2020:** Adicionada receita de **R$ 12.194,86** (competência que constava zerada no demonstrativo consolidado).
   - **08/2025:** Adicionada receita de **R$ 1.800,00** (abatimento de antecipação não escriturado).
3. **Higienização da Planilha Geral:**
   - **Deduplicação:** Remoção de 341 lançamentos duplicados (ex.: competência `04/2024` com registros quadruplicados).
   - **Reclassificação:** 1.646 despesas operacionais cadastradas incorretamente com o tipo `SALDO ANTERIOR` foram corrigidas para `DESPESAS`.
   - **Anonimização:** Adequação de descrições para conformidade e privacidade.

---

## 📁 Estrutura do Repositório

```text
cerc-dashboard-financeiro/
├── index.html                   # Dashboard compilado pronto para uso
├── dashboard_data.json          # Matriz de dados auditada e reconciliada
├── template_full.html           # Template base do dashboard
├── app.js                       # Lógica de renderização reativa e gráficos
├── scripts/
│   ├── build_dashboard.py       # Compila template_full + app.js + data -> index.html
│   └── sanitize_spreadsheet.py  # Pipeline de limpeza e deduplicação da planilha bruta
└── dados_sanitizados/
    ├── Planilha_Financeira_CERC_Sanitizada.xlsx # Base completa tratada em Excel
    ├── Lancamentos_Detalhados_Limpos.csv       # Extrato de todos os 5.215 lançamentos
    └── Resumo_Mensal_Limpo.csv                 # Resumo contábil dos 131 meses
```

---

## 🛠️ Manutenção e Recompilação

Caso novos lançamentos sejam adicionados ou os scripts sejam executados:

```bash
# Para higienizar uma nova exportação da planilha bruta:
python3 scripts/sanitize_spreadsheet.py

# Para reconstruir o dashboard autossuficiente (index.html):
python3 scripts/build_dashboard.py
```
