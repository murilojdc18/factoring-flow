-- Teste de PARIDADE do cálculo da operação (lado plpgsql).
--
-- Espelho manual de src/test/fixtures/simulador-paridade.json (fonte única dos
-- casos — o lado TS roda em src/lib/simuladorParidade.test.ts). Ao alterar a
-- fixture, atualizar este arquivo junto.
--
-- 100% READ-ONLY: calcular_operacao é pura (não lê tabelas), então este script
-- não semeia nem escreve nada — seguro rodar em produção a qualquer momento.
--
-- Critérios (documentados no _leia_me da fixture):
--   - 5 valores monetários (pós-round2): igualdade EXATA;
--   - prazo_medio_ponderado e taxa_diaria_equivalente (não arredondados):
--     tolerância 1e-9;
--   - quantidade, liquido_invalido, titulos_vencidos_ignorados: exatos
--     (comparação jsonb de array é sensível à ordem, como o toEqual do vitest).
--
-- Divergência -> raise exception (aborta no primeiro caso que falhar).
-- Sucesso -> notices "OK (n/12)" + resumo final.

do $$
declare
  casos jsonb := $json$[
    {
      "nome": "caso-normal: 2 títulos válidos, parâmetros default",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "T-1", "valor_face": 10000, "data_vencimento": "2026-06-25" },
        { "numero": "T-2", "valor_face": 20000, "data_vencimento": "2026-07-25" }
      ],
      "parametros": { "taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5 },
      "esperado": { "quantidade_titulos": 2, "valor_bruto": 30000, "prazo_medio_ponderado": 30, "valor_desagio": 1050, "valor_tarifas": 200, "valor_retencao": 1500, "valor_liquido": 27250, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "lista-vazia (Regra A): tudo zerado exceto taxa diária",
      "data_referencia": "2026-06-15",
      "titulos": [],
      "parametros": { "taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5 },
      "esperado": { "quantidade_titulos": 0, "valor_bruto": 0, "prazo_medio_ponderado": 0, "valor_desagio": 0, "valor_tarifas": 0, "valor_retencao": 0, "valor_liquido": 0, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "todos-vencidos (Regra B): idêntico à lista vazia + ignorados na ordem de entrada",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "V-1", "valor_face": 10000, "data_vencimento": "2026-06-14" },
        { "numero": "V-2", "valor_face": 10000, "data_vencimento": "2026-06-10" },
        { "numero": "V-3", "valor_face": 10000, "data_vencimento": "2026-06-05" }
      ],
      "parametros": { "taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5 },
      "esperado": { "quantidade_titulos": 0, "valor_bruto": 0, "prazo_medio_ponderado": 0, "valor_desagio": 0, "valor_tarifas": 0, "valor_retencao": 0, "valor_liquido": 0, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": ["V-1", "V-2", "V-3"] }
    },
    {
      "nome": "misto (Regras A+B): vencidos saem do cálculo, válidos entram",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "V-1", "valor_face": 5000, "data_vencimento": "2026-06-12" },
        { "numero": "OK-1", "valor_face": 10000, "data_vencimento": "2026-07-05" },
        { "numero": "V-2", "valor_face": 9999, "data_vencimento": "2026-06-14" },
        { "numero": "OK-2", "valor_face": 30000, "data_vencimento": "2026-08-14" }
      ],
      "parametros": { "taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5 },
      "esperado": { "quantidade_titulos": 2, "valor_bruto": 40000, "prazo_medio_ponderado": 50, "valor_desagio": 2333.33, "valor_tarifas": 200, "valor_retencao": 2000, "valor_liquido": 35466.67, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": ["V-1", "V-2"] }
    },
    {
      "nome": "vence-hoje (Regra C): prazo real 0, deságio usa piso de 1 dia",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "H-1", "valor_face": 10000, "data_vencimento": "2026-06-15" }
      ],
      "parametros": { "taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5 },
      "esperado": { "quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 0, "valor_desagio": 11.67, "valor_tarifas": 175, "valor_retencao": 500, "valor_liquido": 9313.33, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "taxa-zero: deságio zerado, demais parcelas normais",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "Z-1", "valor_face": 10000, "data_vencimento": "2026-07-15" }
      ],
      "parametros": { "taxa_fator_mensal": 0, "tarifa_fixa": 100, "tarifa_por_titulo": 10, "percentual_retencao": 10 },
      "esperado": { "quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 30, "valor_desagio": 0, "valor_tarifas": 110, "valor_retencao": 1000, "valor_liquido": 8890, "taxa_diaria_equivalente": 0, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "liquido-negativo (Regra D): tarifa fixa maior que o bruto",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "N-1", "valor_face": 10000, "data_vencimento": "2026-07-15" }
      ],
      "parametros": { "taxa_fator_mensal": 3, "tarifa_fixa": 20000, "tarifa_por_titulo": 25, "percentual_retencao": 5 },
      "esperado": { "quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 30, "valor_desagio": 300, "valor_tarifas": 20025, "valor_retencao": 500, "valor_liquido": -10825, "taxa_diaria_equivalente": 0.1, "liquido_invalido": true, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "artefato-centavos: valores quebrados forçando arredondamento",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "FP-1", "valor_face": 12345.67, "data_vencimento": "2026-06-28" }
      ],
      "parametros": { "taxa_fator_mensal": 3.7, "tarifa_fixa": 99.99, "tarifa_por_titulo": 9.99, "percentual_retencao": 7 },
      "esperado": { "quantidade_titulos": 1, "valor_bruto": 12345.67, "prazo_medio_ponderado": 13, "valor_desagio": 197.94, "valor_tarifas": 109.98, "valor_retencao": 864.2, "valor_liquido": 11173.55, "taxa_diaria_equivalente": 0.12333333333333334, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "saneamento: parâmetros negativos viram 0 (Regra E)",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "S-1", "valor_face": 10000, "data_vencimento": "2026-07-15" }
      ],
      "parametros": { "taxa_fator_mensal": -3.5, "tarifa_fixa": -150, "tarifa_por_titulo": -25, "percentual_retencao": -5 },
      "esperado": { "quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 30, "valor_desagio": 0, "valor_tarifas": 0, "valor_retencao": 0, "valor_liquido": 10000, "taxa_diaria_equivalente": 0, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "data-base-diferente (Regra F): referência 10 dias à frente encurta o prazo",
      "data_referencia": "2026-06-25",
      "titulos": [
        { "numero": "F-1", "valor_face": 10000, "data_vencimento": "2026-07-15" }
      ],
      "parametros": { "taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5 },
      "esperado": { "quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 20, "valor_desagio": 233.33, "valor_tarifas": 175, "valor_retencao": 500, "valor_liquido": 9091.67, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "prazo-fracionario: média ponderada não-inteira (12,5 dias) preservada no retorno",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "P-1", "valor_face": 10000, "data_vencimento": "2026-06-25" },
        { "numero": "P-2", "valor_face": 10000, "data_vencimento": "2026-06-30" }
      ],
      "parametros": { "taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5 },
      "esperado": { "quantidade_titulos": 2, "valor_bruto": 20000, "prazo_medio_ponderado": 12.5, "valor_desagio": 291.67, "valor_tarifas": 200, "valor_retencao": 1000, "valor_liquido": 18508.33, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    },
    {
      "nome": "quase-zero: líquido cru -0,004 arredonda para 0,00 e NÃO é inválido (Regra D)",
      "data_referencia": "2026-06-15",
      "titulos": [
        { "numero": "B-1", "valor_face": 0.996, "data_vencimento": "2026-07-15" }
      ],
      "parametros": { "taxa_fator_mensal": 0, "tarifa_fixa": 1, "tarifa_por_titulo": 0, "percentual_retencao": 0 },
      "esperado": { "quantidade_titulos": 1, "valor_bruto": 1, "prazo_medio_ponderado": 30, "valor_desagio": 0, "valor_tarifas": 1, "valor_retencao": 0, "valor_liquido": 0, "taxa_diaria_equivalente": 0, "liquido_invalido": false, "titulos_vencidos_ignorados": [] }
    }
  ]$json$::jsonb;
  caso  jsonb;
  r     jsonb;
  e     jsonb;
  campo text;
  total integer := 0;
  ok    integer := 0;
begin
  total := jsonb_array_length(casos);

  for caso in select * from jsonb_array_elements(casos) loop
    r := public.calcular_operacao(
      caso->'titulos',
      (caso->'parametros'->>'taxa_fator_mensal')::numeric,
      (caso->'parametros'->>'tarifa_fixa')::numeric,
      (caso->'parametros'->>'tarifa_por_titulo')::numeric,
      (caso->'parametros'->>'percentual_retencao')::numeric,
      (caso->>'data_referencia')::date
    );
    e := caso->'esperado';

    if (r->>'quantidade_titulos')::integer is distinct from (e->>'quantidade_titulos')::integer then
      raise exception 'PARIDADE FALHOU no caso "%" em quantidade_titulos: calculado %, esperado %',
        caso->>'nome', r->>'quantidade_titulos', e->>'quantidade_titulos';
    end if;

    -- 5 monetários pós-round2: igualdade exata.
    foreach campo in array array['valor_bruto','valor_desagio','valor_tarifas','valor_retencao','valor_liquido'] loop
      if (r->>campo)::numeric <> (e->>campo)::numeric then
        raise exception 'PARIDADE FALHOU no caso "%" em %: calculado %, esperado %',
          caso->>'nome', campo, r->>campo, e->>campo;
      end if;
    end loop;

    -- Não-arredondados: tolerância 1e-9 (float64 do TS vs numeric).
    foreach campo in array array['prazo_medio_ponderado','taxa_diaria_equivalente'] loop
      if abs((r->>campo)::numeric - (e->>campo)::numeric) >= 1e-9 then
        raise exception 'PARIDADE FALHOU no caso "%" em % (tolerância 1e-9): calculado %, esperado %',
          caso->>'nome', campo, r->>campo, e->>campo;
      end if;
    end loop;

    if (r->>'liquido_invalido')::boolean is distinct from (e->>'liquido_invalido')::boolean then
      raise exception 'PARIDADE FALHOU no caso "%" em liquido_invalido: calculado %, esperado %',
        caso->>'nome', r->>'liquido_invalido', e->>'liquido_invalido';
    end if;

    if (r->'titulos_vencidos_ignorados') is distinct from (e->'titulos_vencidos_ignorados') then
      raise exception 'PARIDADE FALHOU no caso "%" em titulos_vencidos_ignorados: calculado %, esperado %',
        caso->>'nome', r->'titulos_vencidos_ignorados', e->'titulos_vencidos_ignorados';
    end if;

    ok := ok + 1;
    raise notice 'OK (%/%): %', ok, total, caso->>'nome';
  end loop;

  raise notice 'PARIDADE OK: % de % casos idênticos ao TS', ok, total;
end;
$$;
