export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anexos: {
        Row: {
          created_at: string
          entidade_id: string
          entidade_tipo: Database["public"]["Enums"]["anexo_entidade"]
          enviado_por: string | null
          id: string
          nome_arquivo: string
          observacoes: string
          status: Database["public"]["Enums"]["anexo_status"]
          storage_path: string
          tamanho_bytes: number
          tipo_mime: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entidade_id: string
          entidade_tipo: Database["public"]["Enums"]["anexo_entidade"]
          enviado_por?: string | null
          id?: string
          nome_arquivo: string
          observacoes?: string
          status?: Database["public"]["Enums"]["anexo_status"]
          storage_path: string
          tamanho_bytes: number
          tipo_mime: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entidade_id?: string
          entidade_tipo?: Database["public"]["Enums"]["anexo_entidade"]
          enviado_por?: string | null
          id?: string
          nome_arquivo?: string
          observacoes?: string
          status?: Database["public"]["Enums"]["anexo_status"]
          storage_path?: string
          tamanho_bytes?: number
          tipo_mime?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          agencia: string
          bairro: string
          banco: string
          cep: string
          chave_pix: string
          cidade: string
          cnpj: string
          complemento: string
          conta: string
          cpf_responsavel: string
          created_at: string
          created_by: string | null
          email_principal: string
          email_responsavel: string
          endereco: string
          estado: string
          id: string
          inscricao_estadual: string
          inscricao_municipal: string
          limite_operacional: number
          nome_fantasia: string
          numero: string
          observacoes: string
          razao_social: string
          responsavel_legal: string
          status: Database["public"]["Enums"]["cliente_status"]
          telefone: string
          telefone_responsavel: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          agencia?: string
          bairro?: string
          banco?: string
          cep?: string
          chave_pix?: string
          cidade?: string
          cnpj: string
          complemento?: string
          conta?: string
          cpf_responsavel?: string
          created_at?: string
          created_by?: string | null
          email_principal?: string
          email_responsavel?: string
          endereco?: string
          estado?: string
          id?: string
          inscricao_estadual?: string
          inscricao_municipal?: string
          limite_operacional?: number
          nome_fantasia?: string
          numero?: string
          observacoes?: string
          razao_social: string
          responsavel_legal?: string
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string
          telefone_responsavel?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          agencia?: string
          bairro?: string
          banco?: string
          cep?: string
          chave_pix?: string
          cidade?: string
          cnpj?: string
          complemento?: string
          conta?: string
          cpf_responsavel?: string
          created_at?: string
          created_by?: string | null
          email_principal?: string
          email_responsavel?: string
          endereco?: string
          estado?: string
          id?: string
          inscricao_estadual?: string
          inscricao_municipal?: string
          limite_operacional?: number
          nome_fantasia?: string
          numero?: string
          observacoes?: string
          razao_social?: string
          responsavel_legal?: string
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string
          telefone_responsavel?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      cobrancas_historico: {
        Row: {
          created_at: string
          created_by: string | null
          data_contato: string
          id: string
          observacoes: string
          operacao_id: string | null
          proximo_contato: string | null
          responsavel: string
          resultado: Database["public"]["Enums"]["cobranca_resultado"]
          tipo: Database["public"]["Enums"]["cobranca_tipo"]
          titulo_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_contato?: string
          id?: string
          observacoes?: string
          operacao_id?: string | null
          proximo_contato?: string | null
          responsavel?: string
          resultado: Database["public"]["Enums"]["cobranca_resultado"]
          tipo: Database["public"]["Enums"]["cobranca_tipo"]
          titulo_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_contato?: string
          id?: string
          observacoes?: string
          operacao_id?: string | null
          proximo_contato?: string | null
          responsavel?: string
          resultado?: Database["public"]["Enums"]["cobranca_resultado"]
          tipo?: Database["public"]["Enums"]["cobranca_tipo"]
          titulo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_historico_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_historico_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_analises: {
        Row: {
          checklist: Json
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_analise: string
          id: string
          nivel_risco: Database["public"]["Enums"]["compliance_risco"]
          observacoes: string
          operacao_id: string | null
          responsavel: string
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string
        }
        Insert: {
          checklist?: Json
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_analise?: string
          id?: string
          nivel_risco?: Database["public"]["Enums"]["compliance_risco"]
          observacoes?: string
          operacao_id?: string | null
          responsavel?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
        }
        Update: {
          checklist?: Json
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_analise?: string
          id?: string
          nivel_risco?: Database["public"]["Enums"]["compliance_risco"]
          observacoes?: string
          operacao_id?: string | null
          responsavel?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_analises_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_analises_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_financeiras: {
        Row: {
          chave: string
          created_at: string
          descricao: string
          id: string
          updated_at: string
          updated_by: string | null
          valor: Json
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: Json
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: Json
        }
        Relationships: []
      }
      documentos_gerados: {
        Row: {
          cliente_id: string | null
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          modelo_id: string | null
          modelo_nome: string
          modelo_versao: number
          observacoes: string
          operacao_id: string | null
          operacao_numero: string
          status: Database["public"]["Enums"]["documento_gerado_status"]
          tipo_documento: string
          updated_at: string
          variaveis_preenchidas: Json
        }
        Insert: {
          cliente_id?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modelo_id?: string | null
          modelo_nome?: string
          modelo_versao?: number
          observacoes?: string
          operacao_id?: string | null
          operacao_numero?: string
          status?: Database["public"]["Enums"]["documento_gerado_status"]
          tipo_documento?: string
          updated_at?: string
          variaveis_preenchidas?: Json
        }
        Update: {
          cliente_id?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modelo_id?: string | null
          modelo_nome?: string
          modelo_versao?: number
          observacoes?: string
          operacao_id?: string | null
          operacao_numero?: string
          status?: Database["public"]["Enums"]["documento_gerado_status"]
          tipo_documento?: string
          updated_at?: string
          variaveis_preenchidas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "documentos_gerados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_gerados_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_gerados_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_logs: {
        Row: {
          created_at: string
          destino: string
          disparado_por: string | null
          duracao_ms: number | null
          entidade_id: string | null
          entidade_tipo: string
          erro: string | null
          evento: string
          http_status: number | null
          id: string
          payload_enviado: Json
          resposta: string | null
          status: Database["public"]["Enums"]["integracao_status"]
          tentativas: number
        }
        Insert: {
          created_at?: string
          destino?: string
          disparado_por?: string | null
          duracao_ms?: number | null
          entidade_id?: string | null
          entidade_tipo?: string
          erro?: string | null
          evento: string
          http_status?: number | null
          id?: string
          payload_enviado?: Json
          resposta?: string | null
          status?: Database["public"]["Enums"]["integracao_status"]
          tentativas?: number
        }
        Update: {
          created_at?: string
          destino?: string
          disparado_por?: string | null
          duracao_ms?: number | null
          entidade_id?: string | null
          entidade_tipo?: string
          erro?: string | null
          evento?: string
          http_status?: number | null
          id?: string
          payload_enviado?: Json
          resposta?: string | null
          status?: Database["public"]["Enums"]["integracao_status"]
          tentativas?: number
        }
        Relationships: []
      }
      modelos_documentos: {
        Row: {
          conteudo: string
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["modelo_documento_status"]
          tipo: string
          updated_at: string
          variaveis: Json
          versao: number
        }
        Insert: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["modelo_documento_status"]
          tipo?: string
          updated_at?: string
          variaveis?: Json
          versao?: number
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["modelo_documento_status"]
          tipo?: string
          updated_at?: string
          variaveis?: Json
          versao?: number
        }
        Relationships: []
      }
      operacao_historico: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          observacao: string
          operacao_id: string
          status: Database["public"]["Enums"]["operacao_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          observacao?: string
          operacao_id: string
          status: Database["public"]["Enums"]["operacao_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          observacao?: string
          operacao_id?: string
          status?: Database["public"]["Enums"]["operacao_status"]
        }
        Relationships: [
          {
            foreignKeyName: "operacao_historico_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      operacao_titulos: {
        Row: {
          created_at: string
          id: string
          operacao_id: string
          titulo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          operacao_id: string
          titulo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          operacao_id?: string
          titulo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacao_titulos_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacao_titulos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes: {
        Row: {
          cedente_id: string
          created_at: string
          created_by: string | null
          data_operacao: string
          id: string
          numero: string
          observacoes: string
          prazo_medio: number
          quantidade_titulos: number
          responsavel_interno: string
          status: Database["public"]["Enums"]["operacao_status"]
          taxa_aplicada: number
          updated_at: string
          valor_bruto: number
          valor_desagio: number
          valor_liquido: number
          valor_retencao: number
          valor_tarifas: number
        }
        Insert: {
          cedente_id: string
          created_at?: string
          created_by?: string | null
          data_operacao?: string
          id?: string
          numero: string
          observacoes?: string
          prazo_medio?: number
          quantidade_titulos?: number
          responsavel_interno?: string
          status?: Database["public"]["Enums"]["operacao_status"]
          taxa_aplicada?: number
          updated_at?: string
          valor_bruto?: number
          valor_desagio?: number
          valor_liquido?: number
          valor_retencao?: number
          valor_tarifas?: number
        }
        Update: {
          cedente_id?: string
          created_at?: string
          created_by?: string | null
          data_operacao?: string
          id?: string
          numero?: string
          observacoes?: string
          prazo_medio?: number
          quantidade_titulos?: number
          responsavel_interno?: string
          status?: Database["public"]["Enums"]["operacao_status"]
          taxa_aplicada?: number
          updated_at?: string
          valor_bruto?: number
          valor_desagio?: number
          valor_liquido?: number
          valor_retencao?: number
          valor_tarifas?: number
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_cedente_id_fkey"
            columns: ["cedente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome_completo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome_completo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string
          updated_at?: string
        }
        Relationships: []
      }
      recompras: {
        Row: {
          acao: Database["public"]["Enums"]["recompra_acao"]
          cedente_id: string
          cedente_nome: string
          created_at: string
          created_by: string | null
          id: string
          motivo: string
          observacoes: string
          operacao_id: string | null
          operacao_numero: string
          resolvido_em: string | null
          responsavel: string
          sacado_nome: string
          status: Database["public"]["Enums"]["recompra_status"]
          titulo_id: string
          titulo_numero: string
          updated_at: string
          valor: number
        }
        Insert: {
          acao: Database["public"]["Enums"]["recompra_acao"]
          cedente_id: string
          cedente_nome?: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string
          observacoes?: string
          operacao_id?: string | null
          operacao_numero?: string
          resolvido_em?: string | null
          responsavel?: string
          sacado_nome?: string
          status?: Database["public"]["Enums"]["recompra_status"]
          titulo_id: string
          titulo_numero?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          acao?: Database["public"]["Enums"]["recompra_acao"]
          cedente_id?: string
          cedente_nome?: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string
          observacoes?: string
          operacao_id?: string | null
          operacao_numero?: string
          resolvido_em?: string | null
          responsavel?: string
          sacado_nome?: string
          status?: Database["public"]["Enums"]["recompra_status"]
          titulo_id?: string
          titulo_numero?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recompras_cedente_id_fkey"
            columns: ["cedente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recompras_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recompras_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      sacados: {
        Row: {
          bairro: string
          cargo_contato: string
          cep: string
          cidade: string
          complemento: string
          created_at: string
          created_by: string | null
          documento: string
          email: string
          endereco: string
          estado: string
          id: string
          limite_concentracao: number
          nome: string
          nome_fantasia: string
          numero: string
          observacoes: string
          pessoa_contato: string
          score_interno: number
          status: Database["public"]["Enums"]["sacado_status"]
          telefone: string
          tipo: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at: string
          whatsapp: string
        }
        Insert: {
          bairro?: string
          cargo_contato?: string
          cep?: string
          cidade?: string
          complemento?: string
          created_at?: string
          created_by?: string | null
          documento: string
          email?: string
          endereco?: string
          estado?: string
          id?: string
          limite_concentracao?: number
          nome: string
          nome_fantasia?: string
          numero?: string
          observacoes?: string
          pessoa_contato?: string
          score_interno?: number
          status?: Database["public"]["Enums"]["sacado_status"]
          telefone?: string
          tipo?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          bairro?: string
          cargo_contato?: string
          cep?: string
          cidade?: string
          complemento?: string
          created_at?: string
          created_by?: string | null
          documento?: string
          email?: string
          endereco?: string
          estado?: string
          id?: string
          limite_concentracao?: number
          nome?: string
          nome_fantasia?: string
          numero?: string
          observacoes?: string
          pessoa_contato?: string
          score_interno?: number
          status?: Database["public"]["Enums"]["sacado_status"]
          telefone?: string
          tipo?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      titulos: {
        Row: {
          anexos: Json
          cedente_id: string
          chave_nota_fiscal: string
          created_at: string
          created_by: string | null
          data_emissao: string
          data_vencimento: string
          descricao: string
          id: string
          numero: string
          numero_nota_fiscal: string
          observacoes: string
          sacado_id: string
          status: Database["public"]["Enums"]["titulo_status"]
          tipo: Database["public"]["Enums"]["tipo_titulo"]
          updated_at: string
          valor_face: number
        }
        Insert: {
          anexos?: Json
          cedente_id: string
          chave_nota_fiscal?: string
          created_at?: string
          created_by?: string | null
          data_emissao: string
          data_vencimento: string
          descricao?: string
          id?: string
          numero: string
          numero_nota_fiscal?: string
          observacoes?: string
          sacado_id: string
          status?: Database["public"]["Enums"]["titulo_status"]
          tipo?: Database["public"]["Enums"]["tipo_titulo"]
          updated_at?: string
          valor_face: number
        }
        Update: {
          anexos?: Json
          cedente_id?: string
          chave_nota_fiscal?: string
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_vencimento?: string
          descricao?: string
          id?: string
          numero?: string
          numero_nota_fiscal?: string
          observacoes?: string
          sacado_id?: string
          status?: Database["public"]["Enums"]["titulo_status"]
          tipo?: Database["public"]["Enums"]["tipo_titulo"]
          updated_at?: string
          valor_face?: number
        }
        Relationships: [
          {
            foreignKeyName: "titulos_cedente_id_fkey"
            columns: ["cedente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_sacado_id_fkey"
            columns: ["sacado_id"]
            isOneToOne: false
            referencedRelation: "sacados"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_perfis: {
        Row: {
          area: string
          ativo: boolean
          cargo: string
          created_at: string
          id: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string
          ativo?: boolean
          cargo?: string
          created_at?: string
          id?: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          ativo?: boolean
          cargo?: string
          created_at?: string
          id?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_operacao: {
        Args: { payload: Json }
        Returns: string
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      anexo_entidade:
        | "cliente"
        | "titulo"
        | "operacao"
        | "documento"
        | "cobranca"
      anexo_status: "Ativo" | "Arquivado" | "Removido"
      app_role:
        | "administrador"
        | "diretoria"
        | "operacional"
        | "cobranca"
        | "financeiro"
        | "compliance"
        | "somente_leitura"
      cliente_status: "Ativo" | "Inativo" | "Em análise" | "Bloqueado"
      cobranca_resultado:
        | "Promessa de pagamento"
        | "Sem retorno"
        | "Negociado"
        | "Recusado"
        | "Pagamento confirmado"
        | "Outro"
      cobranca_tipo:
        | "Ligação"
        | "E-mail"
        | "WhatsApp"
        | "Visita"
        | "Carta"
        | "Outro"
      compliance_risco: "Baixo" | "Médio" | "Alto" | "Crítico"
      compliance_status:
        | "Em análise"
        | "Aprovado"
        | "Aprovado com ressalvas"
        | "Reprovado"
        | "Pendente"
      documento_gerado_status:
        | "Rascunho"
        | "Em revisão"
        | "Aprovado internamente"
        | "Cancelado"
      integracao_status: "sucesso" | "erro" | "pendente"
      modelo_documento_status: "Ativo" | "Inativo" | "Rascunho"
      operacao_status:
        | "Rascunho"
        | "Em análise"
        | "Aprovada"
        | "Formalizada"
        | "Liquidada"
        | "Em atraso"
        | "Recomprada"
        | "Cancelada"
      recompra_acao: "Recompra" | "Substituição" | "Análise interna"
      recompra_status:
        | "Em análise de recompra"
        | "Recompra solicitada"
        | "Substituição solicitada"
        | "Resolvido"
        | "Cancelado"
      sacado_status: "Ativo" | "Em análise" | "Bloqueado" | "Inativo"
      tipo_pessoa: "PJ" | "PF"
      tipo_titulo:
        | "Duplicata"
        | "Nota promissória"
        | "Cheque"
        | "Boleto"
        | "Contrato"
        | "Outro"
      titulo_status:
        | "Disponível"
        | "Em análise"
        | "Operado"
        | "Liquidado"
        | "Vencido"
        | "Recomprado"
        | "Cancelado"
        | "Em análise de recompra"
        | "Recompra solicitada"
        | "Substituição solicitada"
        | "Resolvido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      anexo_entidade: [
        "cliente",
        "titulo",
        "operacao",
        "documento",
        "cobranca",
      ],
      anexo_status: ["Ativo", "Arquivado", "Removido"],
      app_role: [
        "administrador",
        "diretoria",
        "operacional",
        "cobranca",
        "financeiro",
        "compliance",
        "somente_leitura",
      ],
      cliente_status: ["Ativo", "Inativo", "Em análise", "Bloqueado"],
      cobranca_resultado: [
        "Promessa de pagamento",
        "Sem retorno",
        "Negociado",
        "Recusado",
        "Pagamento confirmado",
        "Outro",
      ],
      cobranca_tipo: [
        "Ligação",
        "E-mail",
        "WhatsApp",
        "Visita",
        "Carta",
        "Outro",
      ],
      compliance_risco: ["Baixo", "Médio", "Alto", "Crítico"],
      compliance_status: [
        "Em análise",
        "Aprovado",
        "Aprovado com ressalvas",
        "Reprovado",
        "Pendente",
      ],
      documento_gerado_status: [
        "Rascunho",
        "Em revisão",
        "Aprovado internamente",
        "Cancelado",
      ],
      integracao_status: ["sucesso", "erro", "pendente"],
      modelo_documento_status: ["Ativo", "Inativo", "Rascunho"],
      operacao_status: [
        "Rascunho",
        "Em análise",
        "Aprovada",
        "Formalizada",
        "Liquidada",
        "Em atraso",
        "Recomprada",
        "Cancelada",
      ],
      recompra_acao: ["Recompra", "Substituição", "Análise interna"],
      recompra_status: [
        "Em análise de recompra",
        "Recompra solicitada",
        "Substituição solicitada",
        "Resolvido",
        "Cancelado",
      ],
      sacado_status: ["Ativo", "Em análise", "Bloqueado", "Inativo"],
      tipo_pessoa: ["PJ", "PF"],
      tipo_titulo: [
        "Duplicata",
        "Nota promissória",
        "Cheque",
        "Boleto",
        "Contrato",
        "Outro",
      ],
      titulo_status: [
        "Disponível",
        "Em análise",
        "Operado",
        "Liquidado",
        "Vencido",
        "Recomprado",
        "Cancelado",
        "Em análise de recompra",
        "Recompra solicitada",
        "Substituição solicitada",
        "Resolvido",
      ],
    },
  },
} as const
