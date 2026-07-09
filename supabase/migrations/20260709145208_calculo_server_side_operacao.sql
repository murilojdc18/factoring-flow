-- Migration: calculo_server_side_operacao
-- Data: 2026-07-09
-- Autor: Murilo (via Claude Code)
--
-- O servidor vira a FONTE CANÔNICA do cálculo financeiro da operação.
-- O simuladorCalc.ts do frontend passa a ser estimativa de tela: em
-- divergência, vale o servidor. Três entregas nesta migration:
--
-- 1. calcular_operacao(jsonb, ...) — função PURA (não lê tabelas, IMMUTABLE),
--    espelho exato das regras de src/lib/simuladorCalc.ts. Por ser pura, o
--    teste de paridade (supabase/tests/paridade_calcular_operacao.sql) roda
--    com literais, sem seed e sem escrita. Regras espelhadas:
--      - saneamento: parâmetro null/NaN/negativo vira 0 (san());
--      - Regra B: título com vencimento anterior à data de referência sai do
--        cálculo e entra em titulos_vencidos_ignorados (comparação de datas
--        puras — daysUntil zera as horas e o date do Postgres é equivalente);
--      - Regra A: sem títulos válidos -> tudo zerado, EXCETO
--        taxa_diaria_equivalente (= taxa saneada / 30);
--      - prazo médio ponderado por valor, FRACIONÁRIO, não arredondado;
--      - Regra C: piso de 1 dia SÓ no deságio (o prazo retornado é o real);
--      - fórmulas sem arredondamento intermediário: deságio =
--        bruto·(taxa/30/100)·prazoPiso; tarifas = fixa + porTitulo·qtd;
--        retenção = bruto·%/100; líquido = bruto − as 3 parcelas;
--      - round2 (2 casas, half away from zero — round() do numeric) SÓ nos 5
--        valores monetários finais;
--      - Regra D: liquido_invalido usa o líquido JÁ arredondado.
--    Divergência float64 (TS) vs numeric (SQL) assumida: numeric é exato; em
--    fronteiras de meio centavo os arredondamentos podem diferir em R$ 0,01 —
--    absorvido pela tolerância da criar_operacao. O quirk do JS em metades
--    exatas negativas (Math.round(-0.5) = -0) só afetaria líquido negativo,
--    que é rejeitado de qualquer forma (P0015).
--    Desvio consciente do TS: elemento sem numero/valor_face/data_vencimento
--    é erro (P0001) — o TS propagaria NaN silenciosamente.
--
-- 2. simular_operacao(uuid[], ...) — RPC read-only (STABLE) para UI e agentes:
--    busca os títulos e delega à calcular_operacao. SECURITY DEFINER porque a
--    RLS Forma A restringe SELECT em titulos a admin/diretoria e 'operacional'
--    precisa simular; papel exigido espelha a criar_operacao
--    (administrador/operacional). SEM trava de status Disponível: simulação é
--    hipotética (decisão c do plano). Vencido segue a Regra B (ignora e
--    reporta) — diferente da criar_operacao, onde vencido é erro.
--
-- 3. criar_operacao v3 — recalcula TUDO no servidor e grava o resultado do
--    servidor (não os valores do payload). Novos comportamentos:
--      - payload passa a exigir os parâmetros do cálculo: taxa_aplicada,
--        tarifa_fixa, tarifa_por_titulo, percentual_retencao (P0001 se
--        ausentes);
--      - os 5 valores monetários do payload viram CONFERÊNCIA: quando
--        presentes, divergência > R$ 0,01 contra o recalculado -> P0013
--        (mensagem indica o campo e os dois valores, sem ecoar o payload);
--        quando ausentes (ex.: agente enviando só insumos), não valida — o
--        servidor grava o canônico de qualquer forma;
--      - título vencido na data da operação -> P0014 (decisão a do plano; a
--        UI já filtra vencidos da lista, o guard protege o caminho de agente);
--      - líquido recalculado negativo -> P0015 (a UI bloqueia no botão; o
--        servidor passa a garantir);
--      - prazo_medio gravado = round(prazo fracionário) — mesmo Math.round
--        da tela; taxa_aplicada gravada como veio (insumo, não derivado).
--    Errcodes seguem a convenção P0010+ do projeto (P0011/P0012 estão na
--    editar_operacao).
--
-- 4. Higiene: revoke de anon em alterar_status_operacao e editar_operacao
--    (só criar_operacao tinha recebido o revoke, em 20260523162406). As
--    funções novas já nascem com revoke explícito.
--
-- Idempotente: create or replace + revokes (revoke é no-op se não há grant).

-- ─────────────────────────── calcular_operacao (pura) ───────────────────────────

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
  v_ignorados      jsonb   := '[]'::jsonb;
  v_qtd            integer := 0;
  v_bruto          numeric := 0;
  v_soma_ponderada numeric := 0;
  v_prazo          numeric;
  v_desagio        numeric;
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

  -- Propriedade do parâmetro, não da operação: reflete a taxa saneada mesmo
  -- sem títulos válidos (Regra A.1 do TS).
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
      v_qtd            := v_qtd + 1;
      v_bruto          := v_bruto + v_valor;
      v_soma_ponderada := v_soma_ponderada + (v_venc - p_data_referencia) * v_valor;
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
      'titulos_vencidos_ignorados', v_ignorados
    );
  end if;

  v_prazo := case when v_bruto > 0 then v_soma_ponderada / v_bruto else 0 end;

  -- Regra C: piso de 1 dia SÓ no deságio; o prazo retornado é o real.
  v_desagio  := v_bruto * (v_taxa_diaria / 100) * greatest(1, v_prazo);
  v_tarifas  := v_fixa + v_por_titulo * v_qtd;
  v_retencao := v_bruto * (v_pct / 100);
  v_liquido  := v_bruto - v_desagio - v_tarifas - v_retencao;

  -- Regra D usa o líquido JÁ arredondado (evita falso positivo tipo -0,004).
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
    'titulos_vencidos_ignorados', v_ignorados
  );
end;
$$;

comment on function public.calcular_operacao(jsonb, numeric, numeric, numeric, numeric, date) is
  'Fonte CANÔNICA do cálculo da operação (espelho de simuladorCalc.ts; paridade garantida por src/test/fixtures/simulador-paridade.json + supabase/tests/paridade_calcular_operacao.sql). Pura: recebe títulos como jsonb, não lê tabelas. Uso interno de criar_operacao/simular_operacao.';

-- Interna: nenhum papel chama direto (as RPCs SECURITY DEFINER rodam como owner).
revoke execute on function public.calcular_operacao(jsonb, numeric, numeric, numeric, numeric, date) from public;
revoke execute on function public.calcular_operacao(jsonb, numeric, numeric, numeric, numeric, date) from anon;
revoke execute on function public.calcular_operacao(jsonb, numeric, numeric, numeric, numeric, date) from authenticated;

-- ─────────────────────────────── simular_operacao ───────────────────────────────

create or replace function public.simular_operacao(
  p_titulo_ids          uuid[],
  p_taxa_fator_mensal   numeric,
  p_tarifa_fixa         numeric,
  p_tarifa_por_titulo   numeric,
  p_percentual_retencao numeric,
  p_data_referencia     date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_ids         uuid[];
  v_qtd         integer;
  v_encontrados integer;
  v_titulos     jsonb;
begin
  -- Papel espelha criar_operacao: quem pode criar pode simular.
  if v_uid is null
     or not public.has_any_role(v_uid, array['administrador','operacional']::app_role[]) then
    raise exception 'Sem permissão para simular operações' using errcode = '42501';
  end if;

  -- Dedup preservando a ordem da primeira ocorrência (afeta só a ordem de
  -- titulos_vencidos_ignorados no retorno).
  select array_agg(id order by ord)
    into v_ids
    from (
      select u.id, min(u.ord) as ord
        from unnest(p_titulo_ids) with ordinality as u(id, ord)
       group by u.id
    ) s;

  v_qtd := coalesce(array_length(v_ids, 1), 0);
  if v_qtd = 0 then
    raise exception 'Informe ao menos um título para simular' using errcode = 'P0001';
  end if;

  select count(*),
         jsonb_agg(jsonb_build_object(
           'numero', t.numero,
           'valor_face', t.valor_face,
           'data_vencimento', t.data_vencimento
         ) order by array_position(v_ids, t.id))
    into v_encontrados, v_titulos
    from public.titulos t
   where t.id = any(v_ids);

  if v_encontrados <> v_qtd then
    raise exception 'Um ou mais títulos não foram encontrados' using errcode = 'P0002';
  end if;

  -- Sem trava de status/cedente: simulação é hipotética. Vencido segue a
  -- Regra B (ignorado e reportado em titulos_vencidos_ignorados).
  return public.calcular_operacao(
    v_titulos,
    p_taxa_fator_mensal,
    p_tarifa_fixa,
    p_tarifa_por_titulo,
    p_percentual_retencao,
    coalesce(p_data_referencia, current_date)
  );
end;
$$;

comment on function public.simular_operacao(uuid[], numeric, numeric, numeric, numeric, date) is
  'Simulação read-only da operação via calcular_operacao (canônica). Papel administrador/operacional (espelho da criar_operacao). Sem trava de Disponível; vencido é ignorado e reportado. SECURITY DEFINER (RLS Forma A restringe SELECT em titulos).';

revoke execute on function public.simular_operacao(uuid[], numeric, numeric, numeric, numeric, date) from public;
revoke execute on function public.simular_operacao(uuid[], numeric, numeric, numeric, numeric, date) from anon;
grant execute on function public.simular_operacao(uuid[], numeric, numeric, numeric, numeric, date) to authenticated;

-- ─────────────────────────────── criar_operacao v3 ──────────────────────────────

create or replace function public.criar_operacao(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_numero       text;
  v_cedente_id   uuid;
  v_data_op      date;
  v_responsavel  text;
  v_titulo_ids   uuid[];
  v_qtd          integer;
  v_cedente_stat cliente_status;
  v_qtd_cedente  integer;
  v_taxa         numeric;
  v_tarifa_fixa  numeric;
  v_tarifa_tit   numeric;
  v_pct_retencao numeric;
  v_vencidos     text;
  v_titulos_calc jsonb;
  v_calc         jsonb;
  v_campo        text;
  v_operacao_id  uuid;
  v_atualizados  integer;
begin
  -- 0) Permissão. SECURITY DEFINER ignora RLS -> checagem manual, espelhando a
  --    policy "operacional/admin criam operacoes".
  if v_uid is null
     or not public.has_any_role(v_uid, array['administrador','operacional']::app_role[]) then
    raise exception 'Sem permissão para criar operações' using errcode = '42501';
  end if;

  -- a) Validação do payload (campos obrigatórios não-vazios).
  v_numero      := nullif(trim(payload->>'numero'), '');
  v_responsavel := nullif(trim(payload->>'responsavel_interno'), '');

  if v_numero is null then
    raise exception 'Payload inválido: numero' using errcode = 'P0001';
  end if;
  if (payload->>'cedente_id') is null then
    raise exception 'Payload inválido: cedente_id' using errcode = 'P0001';
  end if;
  if (payload->>'data_operacao') is null then
    raise exception 'Payload inválido: data_operacao' using errcode = 'P0001';
  end if;
  if v_responsavel is null then
    raise exception 'Payload inválido: responsavel_interno' using errcode = 'P0001';
  end if;
  if jsonb_typeof(payload->'titulo_ids') is distinct from 'array' then
    raise exception 'Payload inválido: titulo_ids' using errcode = 'P0001';
  end if;

  -- a.2) Parâmetros do cálculo server-side: obrigatórios (v3). A taxa já era
  --      enviada como taxa_aplicada; os outros 3 entraram no payload junto
  --      desta migration. Sem eles o servidor não tem os insumos do recálculo.
  foreach v_campo in array array['taxa_aplicada','tarifa_fixa','tarifa_por_titulo','percentual_retencao'] loop
    if (payload->>v_campo) is null then
      raise exception 'Payload inválido: %', v_campo using errcode = 'P0001';
    end if;
  end loop;

  v_cedente_id   := (payload->>'cedente_id')::uuid;
  v_data_op      := (payload->>'data_operacao')::date;
  v_taxa         := (payload->>'taxa_aplicada')::numeric;
  v_tarifa_fixa  := (payload->>'tarifa_fixa')::numeric;
  v_tarifa_tit   := (payload->>'tarifa_por_titulo')::numeric;
  v_pct_retencao := (payload->>'percentual_retencao')::numeric;

  -- Dedup dos títulos (evita inflar a contagem e bater no UNIQUE de operacao_titulos).
  select array_agg(distinct elem::uuid)
    into v_titulo_ids
    from jsonb_array_elements_text(payload->'titulo_ids') as elem;

  v_qtd := coalesce(array_length(v_titulo_ids, 1), 0);
  if v_qtd = 0 then
    raise exception 'Payload inválido: titulo_ids (lista vazia)' using errcode = 'P0001';
  end if;

  -- b) Cedente existe E está "Ativo".
  select status into v_cedente_stat from public.clientes where id = v_cedente_id;
  if not found then
    raise exception 'Cedente não encontrado' using errcode = 'P0002';
  elsif v_cedente_stat <> 'Ativo' then
    raise exception 'Cedente não está ativo' using errcode = 'P0002';
  end if;

  -- c) Todos os títulos existem E pertencem ao cedente informado.
  select count(*) into v_qtd_cedente
    from public.titulos
   where id = any(v_titulo_ids) and cedente_id = v_cedente_id;
  if v_qtd_cedente <> v_qtd then
    raise exception 'Um ou mais títulos não pertencem ao cedente informado'
      using errcode = 'P0010';
  end if;

  -- c.2) Todos estão "Disponível" (checagem antecipada; a guarda real é o UPDATE em (f)).
  if exists (
    select 1 from public.titulos
     where id = any(v_titulo_ids) and status <> 'Disponível'
  ) then
    raise exception 'Um ou mais títulos não estão disponíveis para operação'
      using errcode = 'P0003';
  end if;

  -- c.3) Vencido é ERRO na criação (diferente da simulação, que ignora e
  --      reporta): criar uma operação ignorando silenciosamente um título do
  --      payload seria incoerente. A UI já filtra vencidos da lista.
  select string_agg(numero, ', ' order by numero) into v_vencidos
    from public.titulos
   where id = any(v_titulo_ids) and data_vencimento < v_data_op;
  if v_vencidos is not null then
    raise exception 'Título(s) vencido(s) na data da operação: %', v_vencidos
      using errcode = 'P0014';
  end if;

  -- c.4) Recalcula no servidor (fonte canônica). data_referencia = data_operacao,
  --      mesma semântica da tela (dataBase alimenta os dois papéis).
  select jsonb_agg(jsonb_build_object(
           'numero', t.numero,
           'valor_face', t.valor_face,
           'data_vencimento', t.data_vencimento
         ) order by array_position(v_titulo_ids, t.id))
    into v_titulos_calc
    from public.titulos t
   where t.id = any(v_titulo_ids);

  v_calc := public.calcular_operacao(
    v_titulos_calc, v_taxa, v_tarifa_fixa, v_tarifa_tit, v_pct_retencao, v_data_op);

  -- c.5) Líquido negativo: a UI bloqueia no botão; o servidor garante.
  if (v_calc->>'liquido_invalido')::boolean then
    raise exception 'Valor líquido calculado é negativo — operação rejeitada'
      using errcode = 'P0015';
  end if;

  -- c.6) Conferência dos valores do payload contra o recalculado (tolerância
  --      R$ 0,01 — absorve diferença float64 vs numeric). Campo ausente não é
  --      validado (o servidor grava o canônico de qualquer forma). A mensagem
  --      indica o campo e os dois valores, sem ecoar o payload.
  foreach v_campo in array array['valor_bruto','valor_desagio','valor_tarifas','valor_retencao','valor_liquido'] loop
    if (payload->>v_campo) is not null
       and abs((payload->>v_campo)::numeric - (v_calc->>v_campo)::numeric) > 0.01 then
      raise exception 'Divergência de cálculo em %: informado %, calculado pelo servidor %',
        v_campo, payload->>v_campo, v_calc->>v_campo
        using errcode = 'P0013';
    end if;
  end loop;

  -- d) Cabeçalho da operação com os valores DO SERVIDOR (não os do payload).
  --    Status "Em análise" (a reserva do título como "Operado" acontece em (f)).
  --    prazo_medio = round() do fracionário (mesmo Math.round da tela);
  --    taxa_aplicada gravada como veio (insumo, não derivado).
  insert into public.operacoes (
    numero, cedente_id, data_operacao, status, quantidade_titulos,
    valor_bruto, valor_desagio, valor_tarifas, valor_retencao, valor_liquido,
    prazo_medio, taxa_aplicada, responsavel_interno, observacoes, created_by
  ) values (
    v_numero, v_cedente_id, v_data_op, 'Em análise', v_qtd,
    (v_calc->>'valor_bruto')::numeric,
    (v_calc->>'valor_desagio')::numeric,
    (v_calc->>'valor_tarifas')::numeric,
    (v_calc->>'valor_retencao')::numeric,
    (v_calc->>'valor_liquido')::numeric,
    round((v_calc->>'prazo_medio_ponderado')::numeric)::integer,
    v_taxa,
    v_responsavel,
    coalesce(payload->>'observacoes', ''),
    v_uid
  )
  returning id into v_operacao_id;

  -- e) Vínculos operação <-> títulos.
  insert into public.operacao_titulos (operacao_id, titulo_id)
  select v_operacao_id, t from unnest(v_titulo_ids) as t;

  -- f) Reserva: marca os títulos como "Operado" SÓ se ainda "Disponível".
  --    GET DIAGNOSTICS protege contra corrida (2 operações no mesmo título): se
  --    alguém já operou um deles, o UPDATE pega menos linhas -> aborta tudo.
  update public.titulos
     set status = 'Operado', updated_at = now()
   where id = any(v_titulo_ids) and status = 'Disponível';
  get diagnostics v_atualizados = row_count;
  if v_atualizados <> v_qtd then
    raise exception 'Um ou mais títulos não estão disponíveis para operação'
      using errcode = 'P0003';
  end if;

  -- g) Evento inicial no histórico.
  insert into public.operacao_historico (operacao_id, status, observacao, created_by)
  values (v_operacao_id, 'Em análise', 'Operação criada', v_uid);

  -- h) Retorna o id da operação criada.
  return v_operacao_id;
end;
$$;

comment on function public.criar_operacao(jsonb) is
  'v3 (cálculo server-side canônico): recalcula deságio/tarifas/retenção/líquido via calcular_operacao e grava os valores do servidor. Payload exige taxa_aplicada + tarifa_fixa + tarifa_por_titulo + percentual_retencao (P0001). P0013 = divergência > R$0,01 entre payload e recálculo; P0014 = título vencido; P0015 = líquido negativo. Demais validações e atomicidade da v2 preservadas. SECURITY DEFINER.';

revoke execute on function public.criar_operacao(jsonb) from public;
revoke execute on function public.criar_operacao(jsonb) from anon;
grant execute on function public.criar_operacao(jsonb) to authenticated;

-- ─────────────────────── higiene: revoke anon nas RPCs antigas ──────────────────
-- Achado da validação ao vivo de 2026-07-09: só criar_operacao tinha revoke de
-- anon (20260523162406); as outras duas ficaram com o grant default. Sem brecha
-- real (auth.uid() null cai no 42501), mas iguala o padrão.

revoke execute on function public.alterar_status_operacao(uuid, operacao_status, text) from anon;
revoke execute on function public.editar_operacao(uuid, text, text) from anon;
