-- 1. Enum de status
DO $$ BEGIN
  CREATE TYPE public.documento_gerado_status AS ENUM (
    'Rascunho',
    'Em revisão',
    'Aprovado internamente',
    'Cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Colunas faltantes em documentos_gerados
ALTER TABLE public.documentos_gerados
  ADD COLUMN IF NOT EXISTS status public.documento_gerado_status NOT NULL DEFAULT 'Rascunho';

ALTER TABLE public.documentos_gerados
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Trigger para manter updated_at atualizado
DROP TRIGGER IF EXISTS trg_documentos_gerados_updated_at ON public.documentos_gerados;
CREATE TRIGGER trg_documentos_gerados_updated_at
BEFORE UPDATE ON public.documentos_gerados
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Política de UPDATE (não existia antes)
DROP POLICY IF EXISTS "operacional/admin/financeiro editam documentos_gerados" ON public.documentos_gerados;
CREATE POLICY "operacional/admin/financeiro editam documentos_gerados"
ON public.documentos_gerados
FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'operacional'::app_role, 'financeiro'::app_role]));