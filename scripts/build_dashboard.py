#!/usr/bin/env python3
"""
build_dashboard.py - Compilador do Dashboard Financeiro CERC

Este script lê:
- template_full.html (Estrutura e CSS)
- chartjs_lib.js (Chart.js v4.4.4 offline)
- dashboard_data.json (Base de dados saneada)
- app.js (Lógica de interação e gráficos)

E gera o arquivo final autossuficiente offline: index.html
"""

import json
import os
from datetime import date

def fmt_brl_str(v):
    s = f"{v:,.2f}"
    return s.replace(',', 'X').replace('.', ',').replace('X', '.')

def build():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    template_path = os.path.join(root_dir, 'template_full.html')
    data_path = os.path.join(root_dir, 'dashboard_data.json')
    chartjs_path = os.path.join(root_dir, 'chartjs_lib.js')
    app_path = os.path.join(root_dir, 'app.js')
    output_path = os.path.join(root_dir, 'index.html')

    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()

    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(chartjs_path, 'r', encoding='utf-8') as f:
        chartjs_code = f.read()

    with open(app_path, 'r', encoding='utf-8') as f:
        app_js = f.read()

    # Atualiza data de geração se necessário
    if 'gerado_em' not in data or not data['gerado_em']:
        data['gerado_em'] = date.today().isoformat()

    # Preenche placeholders
    html = template
    html = html.replace('__PERIODO_INICIO__', data['periodo']['inicio'])
    html = html.replace('__PERIODO_FIM__', data['periodo']['fim'])
    html = html.replace('__MESES_COM_DADOS__', str(data['periodo']['meses_com_dados']))
    html = html.replace('__TOTAL_DESPESAS__', fmt_brl_str(data['despesas']['total']))
    html = html.replace('__TOTAL_RECEITAS__', fmt_brl_str(data['receitas']['total']))
    html = html.replace('__METODO__', data['reconciliacao']['metodo'])
    html = html.replace('__NOTA_DESPESAS__', data['reconciliacao']['nota_despesas'])
    html = html.replace('__NOTA_RECEITAS__', data['reconciliacao']['nota_receitas'])
    html = html.replace('__GERADO_EM__', data['gerado_em'])

    json_str = json.dumps(data, ensure_ascii=False)

    scripts_block = f"""<script>{chartjs_code}</script>
<script>const DATA = {json_str};</script>
<script>
{app_js}
</script>
"""

    idx_end = html.rfind('</body>')
    final_html = html[:idx_end] + scripts_block + html[idx_end:]

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_html)

    print(f"Sucesso: {output_path} compilado com {len(final_html):,} bytes.")

if __name__ == '__main__':
    build()
