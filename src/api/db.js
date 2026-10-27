import { invoke } from "@tauri-apps/api/core";

// Helper to get Postgres credentials
export function getPgConfig() {
  const ip = localStorage.getItem("pg_ip");
  const dbName = localStorage.getItem("pg_db") || "axion";
  const password = localStorage.getItem("pg_pass");
  if (!ip || !password) {
    throw new Error("Servidor PostgreSQL não configurado. Clique no indicador de conexão para configurar.");
  }
  return { ip, dbName, password };
}

export function isTauriAvailable() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export async function testConnection(ip, dbName, password) {
  if (!isTauriAvailable()) {
    throw new Error("Modo Web detectado. O driver PostgreSQL nativo requer execução no aplicativo Desktop.");
  }
  return await invoke("test_postgres_connection", { ip, dbName, password });
}

export async function queryPostgres(query) {
  if (!isTauriAvailable()) {
    console.warn("Tauri não disponível, simulando query em modo web:", query);
    return [];
  }
  const { ip, dbName, password } = getPgConfig();
  return await invoke("query_postgres", { ip, dbName, password, query });
}

export async function executePostgres(query) {
  if (!isTauriAvailable()) {
    console.warn("Tauri não disponível, simulando execute em modo web:", query);
    return 1;
  }
  const { ip, dbName, password } = getPgConfig();
  return await invoke("execute_postgres", { ip, dbName, password, query });
}

export async function executePostgresRaw(query) {
  if (!isTauriAvailable()) {
    console.warn("Tauri não disponível, simulando execute raw em modo web:", query);
    return 1;
  }
  const { ip, dbName, password } = getPgConfig();
  return await invoke("execute_postgres_raw", { ip, dbName, password, query });
}

let isTablesEnsured = false;
let ensuringTablesPromise = null;

// Ensure essential tables exist (executado uma única vez na inicialização sem disparar NOTIFY)
export async function ensureRecepcaoTables() {
  if (isTablesEnsured) return;
  if (ensuringTablesPromise) return ensuringTablesPromise;

  ensuringTablesPromise = (async () => {
    const q = `
      CREATE TABLE IF NOT EXISTS "Paciente" (
        "id" TEXT PRIMARY KEY,
        "nome" TEXT NOT NULL,
        "prontuario" TEXT,
        "idade" INTEGER,
        "alaId" TEXT,
        "alaNome" TEXT,
        "leito" TEXT,
        "status" TEXT DEFAULT 'Ativo',
        "observacoes" TEXT,
        "dataAlta" TEXT,
        "foto" TEXT,
        "created_at" TEXT,
        "deleted_at" TEXT
      );
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "idade" INTEGER;
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "alaId" TEXT;
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "alaNome" TEXT;
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "leito" TEXT;
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'Ativo';
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "observacoes" TEXT;
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "dataAlta" TEXT;
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "foto" TEXT;
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "created_at" TEXT;
      ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "deleted_at" TEXT;

      CREATE TABLE IF NOT EXISTS "Ala" (
        "id" TEXT PRIMARY KEY,
        "nome" TEXT NOT NULL,
        "descricao" TEXT,
        "leitos" INTEGER DEFAULT 9999,
        "created_at" TEXT,
        "deleted_at" TEXT
      );
      ALTER TABLE "Ala" ADD COLUMN IF NOT EXISTS "leitos" INTEGER DEFAULT 9999;
      -- Modo leitos infinitos / ilimitados para todas as alas
      UPDATE "Ala" SET "leitos" = 9999 WHERE "leitos" IS NULL OR "leitos" < 9999;

      CREATE TABLE IF NOT EXISTS "Auditoria" (
        "id" TEXT PRIMARY KEY,
        "acao" TEXT NOT NULL,
        "entidade" TEXT NOT NULL,
        "entidade_id" TEXT,
        "detalhes" TEXT,
        "usuario" TEXT DEFAULT 'Recepção',
        "data_hora" TEXT,
        "created_at" TEXT
      );

      CREATE TABLE IF NOT EXISTS "Usuario" (
        "id" TEXT PRIMARY KEY,
        "nome" TEXT,
        "login" TEXT UNIQUE,
        "senha" TEXT,
        "coren" TEXT,
        "crf" TEXT,
        "perfil" TEXT,
        "primeiro_acesso" BOOLEAN DEFAULT true,
        "created_at" TEXT,
        "deleted_at" TEXT
      );
      ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "coren" TEXT;
      ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "crf" TEXT;
      ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "primeiro_acesso" BOOLEAN DEFAULT true;
      ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "email" TEXT;
      ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "telefone" TEXT;
      INSERT INTO "Usuario" ("id", "nome", "login", "senha", "perfil", "primeiro_acesso") 
      VALUES ('user-admin-uuid', 'Administrador RT', 'admin', 'admin123', 'admin', false)
      ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS "Visita" (
        "id" TEXT PRIMARY KEY,
        "pacienteId" TEXT NOT NULL,
        "pacienteNome" TEXT NOT NULL,
        "prontuario" TEXT,
        "alaNome" TEXT,
        "leito" TEXT,
        "visitanteNome" TEXT NOT NULL,
        "tipoDocumento" TEXT NOT NULL DEFAULT 'RG',
        "documentoNumero" TEXT NOT NULL,
        "parentesco" TEXT,
        "dataHoraEntrada" TEXT NOT NULL,
        "dataHoraSaida" TEXT,
        "status" TEXT DEFAULT 'Em Andamento',
        "observacoes" TEXT,
        "recepcionista" TEXT,
        "foto" TEXT,
        "foto_recusada" BOOLEAN DEFAULT false,
        "foto_recusada_motivo" TEXT,
        "created_at" TEXT,
        "deleted_at" TEXT
      );
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "tipoDocumento" TEXT DEFAULT 'RG';
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "documentoNumero" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "parentesco" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "dataHoraEntrada" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "dataHoraSaida" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'Em Andamento';
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "observacoes" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "recepcionista" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "foto" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "foto_recusada" BOOLEAN DEFAULT false;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "foto_recusada_motivo" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "created_at" TEXT;
      ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "deleted_at" TEXT;
    `;
    try {
      await executePostgresRaw(q);
      isTablesEnsured = true;
    } catch (err) {
      console.warn("Aviso ao assegurar tabelas de recepção:", err);
    } finally {
      ensuringTablesPromise = null;
    }
  })();

  return ensuringTablesPromise;
}

// Log auditoria
async function logAuditoria(acao, entidadeId, detalhes) {
  try {
    const auditId = crypto.randomUUID();
    const now = new Date().toISOString();
    const safeDetalhes = (typeof detalhes === "object" ? JSON.stringify(detalhes) : (detalhes || "")).replace(/'/g, "''");
    const q = `INSERT INTO "Auditoria" ("id", "acao", "entidade", "entidade_id", "detalhes", "usuario", "data_hora", "created_at") 
               VALUES ('${auditId}', '${acao}', 'Paciente', '${entidadeId}', '${safeDetalhes}', 'Recepção', '${now}', '${now}')`;
    await executePostgres(q);
  } catch (e) {
    console.warn("Falha silenciosa ao registrar auditoria:", e);
  }
}

// Capacidade de Leitos: Modo Ilimitado / Infinito a pedido na Recepção
export function getAlaCapacity(ala) {
  return 9999;
}

// Operações de Pacientes
export const PacienteService = {
  async list({ status = "all", alaId = "all", search = "" } = {}) {
    let q = `SELECT * FROM "Paciente" WHERE deleted_at IS NULL`;
    
    if (status === "ativo") {
      q += ` AND (status = 'Ativo' OR status IS NULL OR status != 'Alta')`;
    } else if (status === "alta") {
      q += ` AND status = 'Alta'`;
    }

    if (alaId && alaId !== "all") {
      const safeAla = alaId.replace(/'/g, "''");
      q += ` AND "alaId" = '${safeAla}'`;
    }

    if (search && search.trim()) {
      const s = search.trim().replace(/'/g, "''").toLowerCase();
      q += ` AND (LOWER(nome) LIKE '%${s}%' OR LOWER(prontuario) LIKE '%${s}%' OR LOWER(leito) LIKE '%${s}%' OR LOWER("alaNome") LIKE '%${s}%')`;
    }

    q += ` ORDER BY created_at DESC, nome ASC`;
    return await queryPostgres(q);
  },

  async checkProntuario(prontuario, currentPatientId = null) {
    if (!prontuario || !prontuario.trim()) {
      return { active: null, discharged: null };
    }
    const safePront = prontuario.trim().replace(/'/g, "''");
    const q = `SELECT * FROM "Paciente" WHERE "prontuario" = '${safePront}' AND deleted_at IS NULL ORDER BY created_at DESC`;
    const results = await queryPostgres(q);
    
    const others = currentPatientId ? results.filter(p => p.id !== currentPatientId) : results;
    const isAlta = (p) => String(p?.status || "").trim().toLowerCase() === "alta" || p?.ativo === false;
    const active = others.find(p => !isAlta(p));
    const discharged = others.find(p => isAlta(p));

    return { active, discharged };
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const safeNome = (data.nome || "").trim().replace(/'/g, "''");
    const safeProntuario = (data.prontuario || "").trim().replace(/'/g, "''");
    const safeLeito = (data.leito || "").trim().replace(/'/g, "''");
    const safeAlaId = (data.alaId || "").replace(/'/g, "''");
    const safeAlaNome = (data.alaNome || "").replace(/'/g, "''");
    const safeObs = (data.observacoes || "").replace(/'/g, "''");
    const safeFoto = data.foto ? `'${data.foto.replace(/'/g, "''")}'` : "NULL";
    const idade = data.idade ? parseInt(data.idade, 10) : null;
    const idadeSql = idade !== null && !isNaN(idade) ? idade : "NULL";

    const q = `
      INSERT INTO "Paciente" (
        "id", "nome", "prontuario", "idade", "alaId", "alaNome", "leito", "status", "observacoes", "dataAlta", "foto", "created_at"
      ) VALUES (
        '${id}', '${safeNome}', '${safeProntuario}', ${idadeSql}, '${safeAlaId}', '${safeAlaNome}', '${safeLeito}', 'Ativo', '${safeObs}', NULL, ${safeFoto}, '${now}'
      );
      NOTIFY nova_admissao, '${safeNome}|${safeAlaNome}|${safeLeito}';
      NOTIFY table_change, 'Paciente';
      NOTIFY app_update, 'Paciente';
    `;

    await executePostgres(q);
    await logAuditoria("CADASTRAR", id, { nome: data.nome, prontuario: data.prontuario, alaNome: data.alaNome, leito: data.leito });
    return { id, ...data, status: "Ativo", created_at: now };
  },

  async update(id, data) {
    const safeNome = (data.nome || "").trim().replace(/'/g, "''");
    const safeProntuario = (data.prontuario || "").trim().replace(/'/g, "''");
    const safeLeito = (data.leito || "").trim().replace(/'/g, "''");
    const safeAlaId = (data.alaId || "").replace(/'/g, "''");
    const safeAlaNome = (data.alaNome || "").replace(/'/g, "''");
    const safeObs = (data.observacoes || "").replace(/'/g, "''");
    const fotoClause = data.foto !== undefined
      ? `, "foto" = ${data.foto ? `'${data.foto.replace(/'/g, "''")}'` : "NULL"}`
      : "";
    const idade = data.idade ? parseInt(data.idade, 10) : null;
    const idadeSql = idade !== null && !isNaN(idade) ? idade : "NULL";

    const q = `
      UPDATE "Paciente" SET
        "nome" = '${safeNome}',
        "prontuario" = '${safeProntuario}',
        "idade" = ${idadeSql},
        "alaId" = '${safeAlaId}',
        "alaNome" = '${safeAlaNome}',
        "leito" = '${safeLeito}',
        "observacoes" = '${safeObs}'
        ${fotoClause}
      WHERE "id" = '${id}';
      NOTIFY table_change, 'Paciente';
      NOTIFY app_update, 'Paciente';
    `;

    await executePostgres(q);
    await logAuditoria("EDITAR", id, { nome: data.nome, prontuario: data.prontuario, alaNome: data.alaNome, leito: data.leito });
    return { id, ...data };
  },

  async darAlta(id, observacaoAlta = "") {
    const now = new Date().toISOString();
    const safeObs = observacaoAlta ? ` | Alta: ${observacaoAlta.replace(/'/g, "''")}` : "";
    const q = `
      UPDATE "Paciente" SET
        "status" = 'Alta',
        "dataAlta" = '${now}',
        "observacoes" = COALESCE("observacoes", '') || '${safeObs}'
      WHERE "id" = '${id}';
    `;
    await executePostgres(q);
    await logAuditoria("ALTA_HOSPITALAR", id, { dataAlta: now, motivo: observacaoAlta });
  },

  async reinternar(id, { nome, alaId, alaNome, leito, observacoes = "", foto = null }) {
    const now = new Date().toISOString();
    const safeAlaId = (alaId || "").replace(/'/g, "''");
    const safeAlaNome = (alaNome || "").replace(/'/g, "''");
    const safeLeito = (leito || "").trim().replace(/'/g, "''");
    const safeNome = (nome || "Paciente").trim().replace(/'/g, "''");
    const reinternacaoNote = ` [Reinternado em ${new Date().toLocaleDateString('pt-BR')}] ${observacoes || ""}`.replace(/'/g, "''");
    const fotoClause = foto ? `, "foto" = '${foto.replace(/'/g, "''")}'` : '';

    const q = `
      UPDATE "Paciente" SET
        "status" = 'Ativo',
        "dataAlta" = NULL,
        "alaId" = '${safeAlaId}',
        "alaNome" = '${safeAlaNome}',
        "leito" = '${safeLeito}',
        "created_at" = '${now}',
        "observacoes" = COALESCE("observacoes", '') || '${reinternacaoNote}'
        ${fotoClause}
      WHERE "id" = '${id}';
      NOTIFY nova_admissao, '${safeNome}|${safeAlaNome}|${safeLeito}';
      NOTIFY table_change, 'Paciente';
      NOTIFY app_update, 'Paciente';
    `;
    await executePostgres(q);
    await logAuditoria("REINTERNACAO", id, { alaNome, leito, reinternadoEm: now });
  }
};

// Operações de Alas
export const AlaService = {
  async list() {
    const q = `SELECT * FROM "Ala" WHERE deleted_at IS NULL ORDER BY "nome" ASC`;
    return await queryPostgres(q);
  }
};

// Estatísticas da Recepção
export const EstatisticasService = {
  async getDashboardMetrics() {
    try {
      // Todos os pacientes usando SELECT * para evitar erro de colunas inexistentes
      const pacientes = await queryPostgres(`SELECT * FROM "Paciente" WHERE deleted_at IS NULL`);
      const alas = await queryPostgres(`SELECT "id", "nome", "leitos" FROM "Ala" WHERE deleted_at IS NULL ORDER BY "nome" ASC`);

      const ativos = pacientes.filter(p => {
        const s = String(p.status || "").trim().toLowerCase();
        return s !== "alta";
      });
      const altas = pacientes.filter(p => {
        const s = String(p.status || "").trim().toLowerCase();
        return s === "alta";
      });

      // Admissões de hoje
      const today = new Date().toISOString().split("T")[0];
      const todayBR = new Date().toLocaleDateString("pt-BR");
      const admissoesHoje = pacientes.filter(p => {
        if (!p.created_at) return false;
        return p.created_at.startsWith(today) || p.created_at.includes(todayBR);
      });

      // Ocupação por ala - Modo Leitos Ilimitados na Recepção
      const ocupacaoPorAla = alas.map(ala => {
        const internadosNestaAla = ativos.filter(p => {
          const pAlaId = String(p.alaId || p.ala_id || "");
          const pAlaNome = String(p.alaNome || p.ala_nome || "").trim().toLowerCase();
          const aNome = String(ala.nome || "").trim().toLowerCase();
          const aId = String(ala.id || "");
          return (pAlaId && pAlaId === aId) || (pAlaNome && pAlaNome === aNome);
        });
        const ocupados = internadosNestaAla.length;
        return {
          alaId: ala.id,
          alaNome: ala.nome,
          totalLeitos: "Ilimitado",
          ocupados,
          disponiveis: "Livre",
          percentual: 0,
          pacientes: internadosNestaAla
        };
      });

      return {
        totalAtivos: ativos.length,
        totalAltas: altas.length,
        totalAlas: alas.length,
        admissoesHoje: admissoesHoje.length,
        ocupacaoPorAla,
        ultimasAdmissoes: ativos.slice(0, 8),
      };
    } catch (e) {
      console.warn("Erro ao carregar métricas da recepção:", e);
      return {};
    }
  }
};

export async function initDbListener() {
  if (!isTauriAvailable()) return;
  try {
    const { ip, dbName, password } = getPgConfig();
    await invoke("start_db_listener", { ip, dbName, password });
  } catch (err) {
    console.warn("DB Listener não iniciado:", err);
  }
}

// Operações de Usuários (Login e Autenticação)
export const UsuarioService = {
  async list() {
    try {
      const q = `SELECT "id", "nome", "login", "senha", "coren", "crf", "perfil", "primeiro_acesso" FROM "Usuario" WHERE deleted_at IS NULL ORDER BY nome ASC`;
      return await queryPostgres(q);
    } catch (e) {
      console.warn("Aviso ao buscar usuários do postgres:", e);
      return [];
    }
  },

  async get(id) {
    try {
      const q = `SELECT * FROM "Usuario" WHERE "id" = '${id.replace(/'/g, "''")}' LIMIT 1;`;
      const res = await queryPostgres(q);
      return res?.[0] || null;
    } catch {
      return null;
    }
  },

  async updatePassword(userId, newPassword) {
    const safePass = newPassword.replace(/'/g, "''");
    const q = `UPDATE "Usuario" SET "senha" = '${safePass}', "primeiro_acesso" = false WHERE "id" = '${userId}';`;
    await executePostgres(q);
  },

  async updateProfile(id, { nome, email, telefone, senha = null }) {
    let sets = [];
    if (nome) sets.push(`"nome" = '${nome.replace(/'/g, "''")}'`);
    if (email !== undefined) sets.push(`"email" = '${(email || '').replace(/'/g, "''")}'`);
    if (telefone !== undefined) sets.push(`"telefone" = '${(telefone || '').replace(/'/g, "''")}'`);
    if (senha) sets.push(`"senha" = '${senha.replace(/'/g, "''")}'`);
    
    if (sets.length > 0) {
      const q = `UPDATE "Usuario" SET ${sets.join(', ')} WHERE "id" = '${id.replace(/'/g, "''")}';`;
      await executePostgres(q);
    }
    return await this.get(id);
  }
};

// Operações de Visitas
export const VisitaService = {
  async list({ status = "all", pacienteId = null, search = "" } = {}) {
    let q = `SELECT * FROM "Visita" WHERE deleted_at IS NULL`;

    if (pacienteId) {
      const safeId = pacienteId.replace(/'/g, "''");
      q += ` AND "pacienteId" = '${safeId}'`;
    }

    if (status === "em_andamento") {
      q += ` AND ("dataHoraSaida" IS NULL OR "status" = 'Em Andamento')`;
    } else if (status === "concluida") {
      q += ` AND ("dataHoraSaida" IS NOT NULL AND "status" != 'Em Andamento')`;
    }

    if (search && search.trim()) {
      const s = search.trim().replace(/'/g, "''").toLowerCase();
      q += ` AND (LOWER("visitanteNome") LIKE '%${s}%' OR LOWER("pacienteNome") LIKE '%${s}%' OR LOWER("documentoNumero") LIKE '%${s}%' OR LOWER("prontuario") LIKE '%${s}%' OR LOWER("alaNome") LIKE '%${s}%')`;
    }

    q += ` ORDER BY "dataHoraEntrada" DESC, created_at DESC`;
    try {
      return await queryPostgres(q);
    } catch (e) {
      console.warn("Aviso ao buscar visitas do postgres:", e);
      return [];
    }
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const safePacienteId = (data.pacienteId || "").replace(/'/g, "''");
    const safePacienteNome = (data.pacienteNome || "").trim().replace(/'/g, "''");
    const safeProntuario = (data.prontuario || "").trim().replace(/'/g, "''");
    const safeAlaNome = (data.alaNome || "").trim().replace(/'/g, "''");
    const safeLeito = (data.leito || "").trim().replace(/'/g, "''");
    const safeVisitanteNome = (data.visitanteNome || "").trim().replace(/'/g, "''");
    const tipoDocumento = (data.tipoDocumento === "CPF" ? "CPF" : "RG");
    const safeDocNumero = (data.documentoNumero || "").trim().replace(/'/g, "''");
    const safeParentesco = (data.parentesco || "").trim().replace(/'/g, "''");
    const safeEntrada = (data.dataHoraEntrada || now).replace(/'/g, "''");
    const safeObs = (data.observacoes || "").replace(/'/g, "''");
    const safeRecepcionista = (data.recepcionista || "Recepção").replace(/'/g, "''");
    const safeFoto = data.foto ? `'${data.foto.replace(/'/g, "''")}'` : "NULL";
    const fotoRecusada = Boolean(data.foto_recusada);
    const safeMotivo = (data.foto_recusada_motivo || "").replace(/'/g, "''");

    const q = `
      INSERT INTO "Visita" (
        "id", "pacienteId", "pacienteNome", "prontuario", "alaNome", "leito",
        "visitanteNome", "tipoDocumento", "documentoNumero", "parentesco",
        "dataHoraEntrada", "dataHoraSaida", "status", "observacoes", "recepcionista",
        "foto", "foto_recusada", "foto_recusada_motivo", "created_at"
      ) VALUES (
        '${id}', '${safePacienteId}', '${safePacienteNome}', '${safeProntuario}', '${safeAlaNome}', '${safeLeito}',
        '${safeVisitanteNome}', '${tipoDocumento}', '${safeDocNumero}', '${safeParentesco}',
        '${safeEntrada}', NULL, 'Em Andamento', '${safeObs}', '${safeRecepcionista}',
        ${safeFoto}, ${fotoRecusada}, '${safeMotivo}', '${now}'
      );
    `;
    await executePostgres(q);
    await logAuditoria("CADASTRAR_VISITA", id, { visitanteNome: data.visitanteNome, pacienteNome: data.pacienteNome, tipoDocumento, documentoNumero: data.documentoNumero, foto_recusada: fotoRecusada });
    return { id, ...data, tipoDocumento, status: "Em Andamento", created_at: now };
  },

  async registrarSaida(id, dataHoraSaida = null) {
    const now = dataHoraSaida || new Date().toISOString();
    const q = `
      UPDATE "Visita" SET
        "dataHoraSaida" = '${now}',
        "status" = 'Concluída'
      WHERE "id" = '${id}';
    `;
    await executePostgres(q);
    await logAuditoria("SAIDA_VISITA", id, { dataHoraSaida: now });
  },

  async delete(id) {
    const now = new Date().toISOString();
    const q = `UPDATE "Visita" SET "deleted_at" = '${now}' WHERE "id" = '${id}';`;
    await executePostgres(q);
    await logAuditoria("EXCLUIR_VISITA", id, {});
  }
};


