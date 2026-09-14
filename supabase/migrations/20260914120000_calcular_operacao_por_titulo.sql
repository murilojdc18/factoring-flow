-- Migration: calcular_operacao_por_titulo (v4)
-- Data: 2026-09-14
-- Autor: Murilo (via Claude Code)
--
-- Regra oficial de deságio passa a ser POR TÍTULO, igual aos termos aditivos que
-- a empresa já emite (conferido centavo a centavo com as operações 49-26 e
-- 57-26 — decisão de Murilo em 2026-09-14):
--   dias_i       = data_vencimento − data_referencia (real, retornado)
--   percentual_i = round( max(1, dias_i) × taxa ÷ 30 , 3 )
--   juros_i      = round( valor_i × percentual_i ÷ 100 , 2 )
--   deságio      = Σ juros_i
-- Antes (v3, 20260709145208): deságio = bruto × (taxa/30/100) × max(1, prazo
-- médio ponderado), arredondado só no total — dava 1 centavo de diferença na 49-26.
--
-- Mantido da v3: saneamento, Regras A/B/D, prazo_medio_ponderado real
-- (fracionário), tarifas, retenção, líquido, assinatura e chaves do retorno.
-- NOVO no retorno: "titulos" = [{numero, valor_face, data_vencimento, dias,
-- percentual, juros, liquido}] dos títulos válidos, na ordem de entrada (usado
-- pelo termo aditivo e disponível para agentes via simular_operacao).
--
-- simular_operacao e criar_operacao NÃO mudam: chamam esta função.
-- Espelho TS: src/lib/simuladorCalc.ts. Paridade: src/test/fixtures/simulador-paridade.json
-- + supabase/tests/paridade_calcular_operacao.sql.
-- Idempotente: create or replace + revokes.

create or replace function public.calcular_operacao(
  p_titulos             jsonb,   -- [{"numero","valor_face","data_vencimento"}]
  p_taxa_fator_mensal   numeric, -- % a.m.
  p_tarifa_fixa         numeric, -- R$
  p_tarifa_por_titulo   numeric, -- R$
  p_percentual_retencao numeric, -- % sobre o bruto
  p_data_referencia     date
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  -- san(): null/NaN/negativo -> 0 (espelho do saneamento do TS).
  v_taxa       numeric := case when p_taxa_fator_mensal is null
                                 or p_taxa_fator_mensal = 'NaN'::numeric
                               then 0 else greatest(p_taxa_fator_mensal, 0) end;
  v_fixa       numeric := case when p_tarifa_fixa is null
                                 or p_tarifa_fixa = 'NaN'::numeric
                               then 0 else greatest(p_tarifa_fixa, 0) end;
  v_por_titulo numeric := case when p_tarifa_por_titulo is null
                                 or p_tarifa_por_titulo = 'NaN'::numeric
                               then 0 else greatest(p_tarifa_por_titulo, 0) end;
  v_pct        numeric := case when p_percentual_retencao is null
                                 or p_percentual_retencao = 'NaN'::numeric
                               then 0 else greatest(p_percentual_retencao, 0) end;
  v_taxa_diaria    numeric;
  v_elem           jsonb;
  v_numero         text;
  v_venc           date;
  v_valor          numeric;
  v_dias           integer;
  v_percentual     numeric;
  v_juros          numeric;
  v_detalhe        jsonb   := '[]'::jsonb;
  v_ignorados      jsonb   := '[]'::jsonb;
  v_qtd            integer := 0;
  v_bruto          numeric := 0;
  v_soma_ponderada numeric := 0;
  v_prazo          numeric;
  v_desagio        numeric := 0;
  v_tarifas        numeric;
  v_retencao       numeric;
  v_liquido        numeric;
  v_liquido_r      numeric;
begin
  if p_titulos is null or jsonb_typeof(p_titulos) is distinct from 'array' then
    raise exception 'calcular_operacao: p_titulos deve ser um array jsonb'
      using errcode = 'P0001';
  end if;
  if p_data_referencia is null then
    raise exception 'calcular_operacao: p_data_referencia é obrigatória'
      using errcode = 'P0001';
  end if;

  -- Propriedade do parâmetro, não da operação (Regra A.1).
  v_taxa_diaria := v_taxa / 30;

  -- Regra B ANTES da Regra A: vencidos saem do cálculo e viram registro.
  for v_elem in select * from jsonb_array_elements(p_titulos) loop
    v_numero := v_elem->>'numero';
    v_valor  := (v_elem->>'valor_face')::numeric;
    v_venc   := (v_elem->>'data_vencimento')::date;
    if v_numero is null or v_valor is null or v_venc is null then
      raise exception 'calcular_operacao: título sem numero/valor_face/data_vencimento'
        using errcode = 'P0001';
    end if;
    if v_venc < p_data_referencia then
      v_ignorados := v_ignorados || to_jsonb(v_numero);
    else
      v_dias           := v_venc - p_data_referencia;
      v_qtd            := v_qtd + 1;
      v_bruto          := v_bruto + v_valor;
      v_soma_ponderada := v_soma_ponderada + v_dias * v_valor;

      -- Deságio por título (Regra C por título: piso de 1 dia só no %).
      v_percentual := round(greatest(1, v_dias) * v_taxa / 30, 3);
      v_juros      := round(v_valor * v_percentual / 100, 2);
      v_desagio    := v_desagio + v_juros;

      v_detalhe := v_detalhe || jsonb_build_array(jsonb_build_object(
        'numero', v_numero,
        'valor_face', v_valor,
        'data_vencimento', v_venc,
        'dias', v_dias,
        'percentual', v_percentual,
        'juros', v_juros,
        'liquido', v_valor - v_juros
      ));
    end if;
  end loop;

  -- Regra A: sem títulos válidos -> tudo zerado, exceto a taxa diária.
  if v_qtd = 0 then
    return jsonb_build_object(
      'quantidade_titulos', 0,
      'valor_bruto', 0,
      'prazo_medio_ponderado', 0,
      'valor_desagio', 0,
      'valor_tarifas', 0,
      'valor_retencao', 0,
      'valor_liquido', 0,
      'taxa_diaria_equivalente', v_taxa_diaria,
      'liquido_invalido', false,
      'titulos_vencidos_ignorados', v_ignorados,
      'titulos', '[]'::jsonb
    );
  end if;

  v_prazo    := case when v_bruto > 0 then v_soma_ponderada / v_bruto else 0 end;
  v_tarifas  := v_fixa + v_por_titulo * v_qtd;
  v_retencao := v_bruto * (v_pct / 100);
  v_liquido  := v_bruto - v_desagio - v_tarifas - v_retencao;

  -- Regra D usa o líquido JÁ arredondado.
  v_liquido_r := round(v_liquido, 2);

  return jsonb_build_object(
    'quantidade_titulos', v_qtd,
    'valor_bruto', round(v_bruto, 2),
    'prazo_medio_ponderado', v_prazo,
    'valor_desagio', round(v_desagio, 2),
    'valor_tarifas', round(v_tarifas, 2),
    'valor_retencao', round(v_retencao, 2),
    'valor_liquido', v_liquido_r,
    'taxa_diaria_equivalente', v_taxa_diaria,
    'liquido_invalido', v_liquido_r < 0,
    'titulos_vencidos_ignorados', v_ignorados,
    'titulos', v_detalhe
  );
end;
$$;

comment on function public.calcular_operacao(jsonb, numeric, numeric, numeric, numeric, date) is
  'v4: fonte CANÔNICA do cálculo da operação com deságio POR TÍTULO (% = round3(max(1,dias)·taxa/30); juros = round2(valor·%/100); deságio = Σ juros) — igual aos termos aditivos da empresa. Retorna também "titulos" (detalhe por título). Espelho de simuladorCalc.ts; paridade em src/test/fixtures/simulador-paridade.json + supabase/tests/paridade_calcular_operacao.sql. Pura.';

-- Interna: nenhum papel chama direto (as RPCs SECURITY DEFINER rodam como owner).
revoke execute on function public.calcular_operacao(jsonb, numeric, numeric, numeric, numeric, date) from public;
revoke execute on function public.calcular_operacao(jsonb, numeric, numeric, numeric, numeric, date) from anon;
revoke execute on function public.calcular_operacao(jsonb, numeric, numeric, numeric, numeric, date) from authenticated;
