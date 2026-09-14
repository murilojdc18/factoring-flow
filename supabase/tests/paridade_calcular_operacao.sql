-- Teste de PARIDADE do cálculo da operação (lado plpgsql) — v4, deságio por título.
--
-- Espelho manual de src/test/fixtures/simulador-paridade.json (fonte única dos
-- casos — o lado TS roda em src/lib/simuladorParidade.test.ts). Ao alterar a
-- fixture, atualizar este arquivo junto.
--
-- 100% READ-ONLY: calcular_operacao é pura (não lê tabelas), então este script
-- não semeia nem escreve nada — seguro rodar em produção a qualquer momento.
--
-- Critérios (documentados no _leia_me da fixture):
--   - 5 valores monetários (pós-arredondamento): igualdade EXATA;
--   - juros_por_titulo: igualdade EXATA, título a título, na ordem de entrada
--     (casos documento-real-* vêm dos termos aditivos 49-26 e 57-26);
--   - prazo_medio_ponderado e taxa_diaria_equivalente (não arredondados):
--     tolerância 1e-9;
--   - quantidade, liquido_invalido, titulos_vencidos_ignorados: exatos.
--
-- Divergência -> raise exception (aborta no primeiro caso que falhar).
-- Sucesso -> notices "OK (n/14)" + resumo final.

do $$
declare
  casos jsonb := $json$[
    {"nome": "caso-normal: 2 títulos válidos, parâmetros default", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "T-1", "valor_face": 10000, "data_vencimento": "2026-06-25"}, {"numero": "T-2", "valor_face": 20000, "data_vencimento": "2026-07-25"}],
     "parametros": {"taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5},
     "esperado": {"quantidade_titulos": 2, "valor_bruto": 30000, "prazo_medio_ponderado": 30, "valor_desagio": 1050.1, "valor_tarifas": 200, "valor_retencao": 1500, "valor_liquido": 27249.9, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [116.7, 933.4]}},
    {"nome": "lista-vazia (Regra A): tudo zerado exceto taxa diária", "data_referencia": "2026-06-15",
     "titulos": [],
     "parametros": {"taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5},
     "esperado": {"quantidade_titulos": 0, "valor_bruto": 0, "prazo_medio_ponderado": 0, "valor_desagio": 0, "valor_tarifas": 0, "valor_retencao": 0, "valor_liquido": 0, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": []}},
    {"nome": "todos-vencidos (Regra B): idêntico à lista vazia + ignorados na ordem de entrada", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "V-1", "valor_face": 10000, "data_vencimento": "2026-06-14"}, {"numero": "V-2", "valor_face": 10000, "data_vencimento": "2026-06-10"}, {"numero": "V-3", "valor_face": 10000, "data_vencimento": "2026-06-05"}],
     "parametros": {"taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5},
     "esperado": {"quantidade_titulos": 0, "valor_bruto": 0, "prazo_medio_ponderado": 0, "valor_desagio": 0, "valor_tarifas": 0, "valor_retencao": 0, "valor_liquido": 0, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": ["V-1", "V-2", "V-3"], "juros_por_titulo": []}},
    {"nome": "misto (Regras A+B): vencidos saem do cálculo, válidos entram", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "V-1", "valor_face": 5000, "data_vencimento": "2026-06-12"}, {"numero": "OK-1", "valor_face": 10000, "data_vencimento": "2026-07-05"}, {"numero": "V-2", "valor_face": 9999, "data_vencimento": "2026-06-14"}, {"numero": "OK-2", "valor_face": 30000, "data_vencimento": "2026-08-14"}],
     "parametros": {"taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5},
     "esperado": {"quantidade_titulos": 2, "valor_bruto": 40000, "prazo_medio_ponderado": 50, "valor_desagio": 2333.3, "valor_tarifas": 200, "valor_retencao": 2000, "valor_liquido": 35466.7, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": ["V-1", "V-2"], "juros_por_titulo": [233.3, 2100]}},
    {"nome": "vence-hoje (Regra C): prazo real 0, % do título usa piso de 1 dia", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "H-1", "valor_face": 10000, "data_vencimento": "2026-06-15"}],
     "parametros": {"taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5},
     "esperado": {"quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 0, "valor_desagio": 11.7, "valor_tarifas": 175, "valor_retencao": 500, "valor_liquido": 9313.3, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [11.7]}},
    {"nome": "taxa-zero: deságio zerado, demais parcelas normais", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "Z-1", "valor_face": 10000, "data_vencimento": "2026-07-15"}],
     "parametros": {"taxa_fator_mensal": 0, "tarifa_fixa": 100, "tarifa_por_titulo": 10, "percentual_retencao": 10},
     "esperado": {"quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 30, "valor_desagio": 0, "valor_tarifas": 110, "valor_retencao": 1000, "valor_liquido": 8890, "taxa_diaria_equivalente": 0, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [0]}},
    {"nome": "liquido-negativo (Regra D): tarifa fixa maior que o bruto", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "N-1", "valor_face": 10000, "data_vencimento": "2026-07-15"}],
     "parametros": {"taxa_fator_mensal": 3, "tarifa_fixa": 20000, "tarifa_por_titulo": 25, "percentual_retencao": 5},
     "esperado": {"quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 30, "valor_desagio": 300, "valor_tarifas": 20025, "valor_retencao": 500, "valor_liquido": -10825, "taxa_diaria_equivalente": 0.1, "liquido_invalido": true, "titulos_vencidos_ignorados": [], "juros_por_titulo": [300]}},
    {"nome": "artefato-centavos: valores quebrados forçando arredondamento", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "FP-1", "valor_face": 12345.67, "data_vencimento": "2026-06-28"}],
     "parametros": {"taxa_fator_mensal": 3.7, "tarifa_fixa": 99.99, "tarifa_por_titulo": 9.99, "percentual_retencao": 7},
     "esperado": {"quantidade_titulos": 1, "valor_bruto": 12345.67, "prazo_medio_ponderado": 13, "valor_desagio": 197.9, "valor_tarifas": 109.98, "valor_retencao": 864.2, "valor_liquido": 11173.59, "taxa_diaria_equivalente": 0.12333333333333334, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [197.9]}},
    {"nome": "saneamento: parâmetros negativos viram 0 (Regra E)", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "S-1", "valor_face": 10000, "data_vencimento": "2026-07-15"}],
     "parametros": {"taxa_fator_mensal": -3.5, "tarifa_fixa": -150, "tarifa_por_titulo": -25, "percentual_retencao": -5},
     "esperado": {"quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 30, "valor_desagio": 0, "valor_tarifas": 0, "valor_retencao": 0, "valor_liquido": 10000, "taxa_diaria_equivalente": 0, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [0]}},
    {"nome": "data-base-diferente (Regra F): referência 10 dias à frente encurta o prazo", "data_referencia": "2026-06-25",
     "titulos": [{"numero": "F-1", "valor_face": 10000, "data_vencimento": "2026-07-15"}],
     "parametros": {"taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5},
     "esperado": {"quantidade_titulos": 1, "valor_bruto": 10000, "prazo_medio_ponderado": 20, "valor_desagio": 233.3, "valor_tarifas": 175, "valor_retencao": 500, "valor_liquido": 9091.7, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [233.3]}},
    {"nome": "prazo-fracionario: média ponderada não-inteira (12,5 dias) preservada no retorno", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "P-1", "valor_face": 10000, "data_vencimento": "2026-06-25"}, {"numero": "P-2", "valor_face": 10000, "data_vencimento": "2026-06-30"}],
     "parametros": {"taxa_fator_mensal": 3.5, "tarifa_fixa": 150, "tarifa_por_titulo": 25, "percentual_retencao": 5},
     "esperado": {"quantidade_titulos": 2, "valor_bruto": 20000, "prazo_medio_ponderado": 12.5, "valor_desagio": 291.7, "valor_tarifas": 200, "valor_retencao": 1000, "valor_liquido": 18508.3, "taxa_diaria_equivalente": 0.11666666666666667, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [116.7, 175]}},
    {"nome": "quase-zero: líquido cru -0,004 arredonda para 0,00 e NÃO é inválido (Regra D)", "data_referencia": "2026-06-15",
     "titulos": [{"numero": "B-1", "valor_face": 0.996, "data_vencimento": "2026-07-15"}],
     "parametros": {"taxa_fator_mensal": 0, "tarifa_fixa": 1, "tarifa_por_titulo": 0, "percentual_retencao": 0},
     "esperado": {"quantidade_titulos": 1, "valor_bruto": 1, "prazo_medio_ponderado": 30, "valor_desagio": 0, "valor_tarifas": 1, "valor_retencao": 0, "valor_liquido": 0, "taxa_diaria_equivalente": 0, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [0]}},
    {"nome": "documento-real-49-26: 23 títulos, 4% a.m., tarifa 250 — bate com o termo aditivo", "data_referencia": "2026-08-05",
     "titulos": [{"numero": "D-01", "valor_face": 11260, "data_vencimento": "2026-08-28"}, {"numero": "D-02", "valor_face": 2100, "data_vencimento": "2026-08-30"}, {"numero": "D-03", "valor_face": 1280, "data_vencimento": "2026-08-30"}, {"numero": "D-04", "valor_face": 2100, "data_vencimento": "2026-09-03"}, {"numero": "D-05", "valor_face": 25000, "data_vencimento": "2026-09-04"}, {"numero": "D-06", "valor_face": 3843, "data_vencimento": "2026-09-04"}, {"numero": "D-07", "valor_face": 2161.4, "data_vencimento": "2026-09-04"}, {"numero": "D-08", "valor_face": 4012.5, "data_vencimento": "2026-09-04"}, {"numero": "D-09", "valor_face": 436.8, "data_vencimento": "2026-09-05"}, {"numero": "D-10", "valor_face": 510.15, "data_vencimento": "2026-09-06"}, {"numero": "D-11", "valor_face": 694.7, "data_vencimento": "2026-09-06"}, {"numero": "D-12", "valor_face": 1098, "data_vencimento": "2026-09-06"}, {"numero": "D-13", "valor_face": 11260, "data_vencimento": "2026-09-11"}, {"numero": "D-14", "valor_face": 2100, "data_vencimento": "2026-09-17"}, {"numero": "D-15", "valor_face": 693, "data_vencimento": "2026-09-21"}, {"numero": "D-16", "valor_face": 1098, "data_vencimento": "2026-09-21"}, {"numero": "D-17", "valor_face": 11260, "data_vencimento": "2026-09-25"}, {"numero": "D-18", "valor_face": 2100, "data_vencimento": "2026-10-01"}, {"numero": "D-19", "valor_face": 3843, "data_vencimento": "2026-10-02"}, {"numero": "D-20", "valor_face": 510, "data_vencimento": "2026-10-06"}, {"numero": "D-21", "valor_face": 693, "data_vencimento": "2026-10-06"}, {"numero": "D-22", "valor_face": 693, "data_vencimento": "2026-10-21"}, {"numero": "D-23", "valor_face": 693, "data_vencimento": "2026-11-05"}],
     "parametros": {"taxa_fator_mensal": 4, "tarifa_fixa": 250, "tarifa_por_titulo": 0, "percentual_retencao": 0},
     "esperado": {"quantidade_titulos": 23, "valor_bruto": 89439.55, "prazo_medio_ponderado": 36.24540821146797, "valor_desagio": 4322.35, "valor_tarifas": 250, "valor_retencao": 0, "valor_liquido": 84867.2, "taxa_diaria_equivalente": 0.13333333333333333, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [345.34, 69.99, 42.66, 81.21, 1000, 153.72, 86.46, 160.5, 18.05, 21.77, 29.64, 46.85, 555.46, 120.39, 43.43, 68.81, 765.68, 159.6, 297.18, 42.16, 57.29, 71.15, 85.01]}},
    {"nome": "documento-real-57-26: 15 títulos, 4% a.m., tarifa 250 — bate com o termo aditivo", "data_referencia": "2026-08-20",
     "titulos": [{"numero": "E-01", "valor_face": 1264, "data_vencimento": "2026-09-18"}, {"numero": "E-02", "valor_face": 27750, "data_vencimento": "2026-09-19"}, {"numero": "E-03", "valor_face": 379.6, "data_vencimento": "2026-09-19"}, {"numero": "E-04", "valor_face": 642.05, "data_vencimento": "2026-09-19"}, {"numero": "E-05", "valor_face": 597, "data_vencimento": "2026-09-20"}, {"numero": "E-06", "valor_face": 3433, "data_vencimento": "2026-09-20"}, {"numero": "E-07", "valor_face": 1864.7, "data_vencimento": "2026-09-21"}, {"numero": "E-08", "valor_face": 456.84, "data_vencimento": "2026-09-22"}, {"numero": "E-09", "valor_face": 602, "data_vencimento": "2026-09-25"}, {"numero": "E-10", "valor_face": 3246, "data_vencimento": "2026-09-28"}, {"numero": "E-11", "valor_face": 27750, "data_vencimento": "2026-10-04"}, {"numero": "E-12", "valor_face": 640, "data_vencimento": "2026-10-04"}, {"numero": "E-13", "valor_face": 379, "data_vencimento": "2026-10-19"}, {"numero": "E-14", "valor_face": 640, "data_vencimento": "2026-10-19"}, {"numero": "E-15", "valor_face": 640, "data_vencimento": "2026-11-03"}],
     "parametros": {"taxa_fator_mensal": 4, "tarifa_fixa": 250, "tarifa_por_titulo": 0, "percentual_retencao": 0},
     "esperado": {"quantidade_titulos": 15, "valor_bruto": 70284.19, "prazo_medio_ponderado": 37.482648942813455, "valor_desagio": 3512.58, "valor_tarifas": 250, "valor_retencao": 0, "valor_liquido": 66521.61, "taxa_diaria_equivalente": 0.13333333333333333, "liquido_invalido": false, "titulos_vencidos_ignorados": [], "juros_por_titulo": [48.88, 1110, 15.18, 25.68, 24.67, 141.89, 79.57, 20.1, 28.9, 168.79, 1665, 38.4, 30.32, 51.2, 64]}}
  ]$json$::jsonb;
  caso  jsonb;
  r     jsonb;
  e     jsonb;
  campo text;
  i     integer;
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

    -- 5 monetários pós-arredondamento: igualdade exata.
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

    -- Juros por título: mesma quantidade e igualdade exata, na ordem de entrada.
    if jsonb_array_length(coalesce(r->'titulos', '[]'::jsonb)) <> jsonb_array_length(e->'juros_por_titulo') then
      raise exception 'PARIDADE FALHOU no caso "%" em titulos (quantidade): calculado %, esperado %',
        caso->>'nome', jsonb_array_length(coalesce(r->'titulos', '[]'::jsonb)), jsonb_array_length(e->'juros_por_titulo');
    end if;
    for i in 0 .. jsonb_array_length(e->'juros_por_titulo') - 1 loop
      if (r->'titulos'->i->>'juros')::numeric <> (e->'juros_por_titulo'->>i)::numeric then
        raise exception 'PARIDADE FALHOU no caso "%" em juros do título %: calculado %, esperado %',
          caso->>'nome', r->'titulos'->i->>'numero', r->'titulos'->i->>'juros', e->'juros_por_titulo'->>i;
      end if;
    end loop;

    ok := ok + 1;
    raise notice 'OK (%/%): %', ok, total, caso->>'nome';
  end loop;

  raise notice 'PARIDADE OK: % de % casos idênticos ao TS', ok, total;
end;
$$;
