# Dashboard Financeiro — CERC (12/2014 a 10/2025)

Dashboard interativo autossuficiente (HTML/JS com Chart.js embutido) com design executivo fintech de alta confiança para análise contábil, auditoria transacional profunda e prestação de contas do Condomínio Edifício Residencial CERC, preparado para o Conselho Fiscal e Administração.

---

## 🚀 Como Visualizar
Basta abrir o arquivo **`index.html`** diretamente em qualquer navegador web (Google Chrome, Safari, Edge, Firefox).
* **Sem dependências externas:** funciona 100% offline, sem necessidade de internet, servidor web ou instalação de pacotes.
* **Portabilidade total:** dados consolidados (131 meses e 4.764 lançamentos) e bibliotecas visuais estão compilados dentro do próprio arquivo.

---

## 📊 Funcionalidades do Dashboard

### 1. Design Executivo Fintech (Alta Confiança)
- **Modo Escuro / Modo Claro (Dark/Light Mode):** alternador suave com persistência automática no navegador (`localStorage`).
- **Tipografia Tabular Monospaçada (`tabular-nums`):** alinhamento contábil rigoroso de números, vírgulas e centavos.
- **Sparklines de Tendência:** micrográficos SVG integrados diretamente nos KPIs de Receita, Despesa, Resultado e Saldo Bancário.
- **Selo de Auditoria Ativa:** indicador visual de conformidade certificando que 100% dos meses foram reconciliados com divergência zero.

### 2. 🏛️ Visão Executiva & Balanço Geral (Aba 1)
- **Filtros Temporais Dinâmicos:** visualização do consolidado geral (todo o período), por ano específico (2014 a 2025) ou mês a mês (131 competências) com botões de navegação sequencial ◀ ▶.
- **Indicadores Chave (KPIs):** Receitas, Despesas, Resultado Operacional e Saldo Final com comparativo percentual em relação ao período anterior (MoM/YoY).
- **Evolução Mensal & Anual:** gráfico com barras para receitas/despesas e linha contínua para liquidez de caixa.
- **Painel de Governança:** média mensal de gastos, maiores despesas históricas e taxa de superávit.

### 3. 🔬 Raio-X de Contas & Centros de Custo (Aba 2)
- **Gráficos Donut Interativos:** distribuição percentual das receitas e centros de custo.
- **Tabela de Subcategorias Reativa:** alternância entre despesas e receitas, busca textual e barras de progresso visual.
- **Drill-down Conectado:** botão *"🔍 Auditar"* em cada subcategoria que direciona instantaneamente para a Mesa de Auditoria filtrando aquela conta.

### 4. 🔍 Mesa de Auditoria Transacional & Fornecedores (Aba 3)
- **Busca Instantânea em Tempo Real:** pesquisa por qualquer termo na descrição, conta ou fornecedor (*ex.: 'elevador', 'energia', 'água', 'limpeza', 'seguro', 'advogado', 'síndico', 'tarifa'*).
- **Filtros Rápidos (Chips de 1 Clique):** botões de atalho para as contas mais relevantes e despesas de grande porte (> R$ 2.000).
- **Filtros Combinados:** seleção por Tipo (Despesas, Receitas ou Saldos Bancários), Ano, Mês e Faixa de Valor (Mínimo e Máximo).
- **Métricas do Filtro em Tempo Real:** total somado, quantidade de lançamentos, valor médio e maior desembolso do filtro ativo.
- **Tabela de Alta Densidade com Paginação:** paginação configurável (25, 50, 100 ou todos) e ordenação clicável por qualquer coluna.
- **Exportação CSV:** botão *"📥 Exportar CSV Filtrado"* que gera arquivo formatado com codificação UTF-8 BOM pronto para Excel.

### 5. 📜 DRE & Extrato Mensal Completo (Aba 4)
- **Extrato dos 131 Meses:** Saldo Anterior, Receitas, Despesas, Resultado Líquido, Saldo Atual e status de reconciliação.
- **Exportação da DRE:** download direto da série mensal completa em CSV.

### 6. 🖨️ Modo Impressão / Parecer A4
- Botão *"🖨️ Imprimir Parecer"* configurado via CSS `@media print` para gerar documento formal de prestação de contas com campos de assinatura para 3 conselheiros fiscais.

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
├── index.html                   # Dashboard compilado autossuficiente e offline
├── dashboard_data.json          # Matriz auditada com série mensal e 4.764 transações
├── template_full.html           # Template base do dashboard com design executivo
├── app.js                       # Lógica reativa, sparklines, busca e gráficos
├── scripts/
│   ├── build_dashboard.py       # Compila template_full + app.js + data -> index.html
│   └── sanitize_spreadsheet.py  # Pipeline de limpeza e deduplicação da planilha bruta
└── dados_sanitizados/
    ├── Planilha_Financeira_CERC_Sanitizada.xlsx # Base completa tratada em Excel
    ├── Lancamentos_Detalhados_Limpos.csv       # Extrato de todos os lançamentos
    └── Resumo_Mensal_Limpo.csv                 # Resumo contábil dos 131 meses
```

---

## 🛠️ Manutenção e Recompilação

Caso novos lançamentos sejam adicionados ou a base seja atualizada:

```bash
# Para higienizar uma nova exportação da planilha bruta:
python3 scripts/sanitize_spreadsheet.py

# Para reconstruir o dashboard autossuficiente (index.html):
python3 scripts/build_dashboard.py
```
