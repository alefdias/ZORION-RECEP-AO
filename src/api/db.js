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

// Ensure essential tables exist
export async function ensureRecepcaoTables() {
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
    ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "created_at" TEXT;
    ALTER TABLE "Paciente" ADD COLUMN IF NOT EXISTS "deleted_at" TEXT;

    CREATE TABLE IF NOT EXISTS "Ala" (
      "id" TEXT PRIMARY KEY,
      "nome" TEXT NOT NULL,
      "descricao" TEXT,
      "leitos" INTEGER DEFAULT 10,
      "created_at" TEXT,
      "deleted_at" TEXT
    );
    ALTER TABLE "Ala" ADD COLUMN IF NOT EXISTS "leitos" INTEGER DEFAULT 10;

    -- Configuração exata de leitos por Ala Hospitalar
    -- N1: 39 leitos
    UPDATE "Ala" SET "leitos" = 39 WHERE LOWER(TRIM("nome")) IN ('n1', 'ala n1', 'ala-n1');
    INSERT INTO "Ala" ("id", "nome", "descricao", "leitos", "created_at")
    SELECT 'ala-n1-uuid', 'N1', 'Ala N1 (39 leitos)', 39, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Ala" WHERE LOWER(TRIM("nome")) IN ('n1', 'ala n1', 'ala-n1') AND deleted_at IS NULL);

    -- N2: 39 leitos
    UPDATE "Ala" SET "leitos" = 39 WHERE LOWER(TRIM("nome")) IN ('n2', 'ala n2', 'ala-n2');
    INSERT INTO "Ala" ("id", "nome", "descricao", "leitos", "created_at")
    SELECT 'ala-n2-uuid', 'N2', 'Ala N2 (39 leitos)', 39, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Ala" WHERE LOWER(TRIM("nome")) IN ('n2', 'ala n2', 'ala-n2') AND deleted_at IS NULL);

    -- R1 M: 10 leitos
    UPDATE "Ala" SET "leitos" = 10 WHERE LOWER(TRIM("nome")) IN ('r1 m', 'r1-m', 'r1m', 'r1 masculino', 'ala r1 m', 'ala r1 masculino');
    INSERT INTO "Ala" ("id", "nome", "descricao", "leitos", "created_at")
    SELECT 'ala-r1m-uuid', 'R1 M', 'Ala R1 Masculino (10 leitos)', 10, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Ala" WHERE LOWER(TRIM("nome")) IN ('r1 m', 'r1-m', 'r1m', 'r1 masculino', 'ala r1 m', 'ala r1 masculino') AND deleted_at IS NULL);

    -- R1 F: 15 leitos
    UPDATE "Ala" SET "leitos" = 15 WHERE LOWER(TRIM("nome")) IN ('r1 f', 'r1-f', 'r1f', 'r1 feminino', 'ala r1 f', 'ala r1 feminino');
    INSERT INTO "Ala" ("id", "nome", "descricao", "leitos", "created_at")
    SELECT 'ala-r1f-uuid', 'R1 F', 'Ala R1 Feminino (15 leitos)', 15, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Ala" WHERE LOWER(TRIM("nome")) IN ('r1 f', 'r1-f', 'r1f', 'r1 feminino', 'ala r1 f', 'ala r1 feminino') AND deleted_at IS NULL);

    -- UCP: 10 leitos
    UPDATE "Ala" SET "leitos" = 10 WHERE LOWER(TRIM("nome")) IN ('ucp', 'ala ucp');
    INSERT INTO "Ala" ("id", "nome", "descricao", "leitos", "created_at")
    SELECT 'ala-ucp-uuid', 'UCP', 'Unidade de Cuidados Prolongados (10 leitos)', 10, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Ala" WHERE LOWER(TRIM("nome")) IN ('ucp', 'ala ucp') AND deleted_at IS NULL);

    -- CL1: 10 leitos
    UPDATE "Ala" SET "leitos" = 10 WHERE LOWER(TRIM("nome")) IN ('cl1', 'cl 1', 'ala cl1', 'ala cl 1', 'clinica 1');
    INSERT INTO "Ala" ("id", "nome", "descricao", "leitos", "created_at")
    SELECT 'ala-cl1-uuid', 'CL1', 'Ala Clínica 1 (10 leitos)', 10, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Ala" WHERE LOWER(TRIM("nome")) IN ('cl1', 'cl 1', 'ala cl1', 'ala cl 1', 'clinica 1') AND deleted_at IS NULL);

    -- CL2: 10 leitos
    UPDATE "Ala" SET "leitos" = 10 WHERE LOWER(TRIM("nome")) IN ('cl2', 'cl 2', 'ala cl2', 'ala cl 2', 'clinica 2');
    INSERT INTO "Ala" ("id", "nome", "descricao", "leitos", "created_at")
    SELECT 'ala-cl2-uuid', 'CL2', 'Ala Clínica 2 (10 leitos)', 10, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Ala" WHERE LOWER(TRIM("nome")) IN ('cl2', 'cl 2', 'ala cl2', 'ala cl 2', 'clinica 2') AND deleted_at IS NULL);

    -- CASA MENINOS: 3 leitos
    UPDATE "Ala" SET "leitos" = 3 WHERE LOWER(TRIM("nome")) IN ('casa meninos', 'casa dos meninos', 'ala casa meninos', 'ala casa dos meninos');
    INSERT INTO "Ala" ("id", "nome", "descricao", "leitos", "created_at")
    SELECT 'ala-casameninos-uuid', 'Casa Meninos', 'Casa dos Meninos (3 leitos)', 3, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Ala" WHERE LOWER(TRIM("nome")) IN ('casa meninos', 'casa dos meninos', 'ala casa meninos', 'ala casa dos meninos') AND deleted_at IS NULL);

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
    ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "created_at" TEXT;
    ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "deleted_at" TEXT;
  `;
  try {
    await executePostgres(q);
  } catch (err) {
    console.warn("Aviso ao assegurar tabelas de recepção:", err);
  }
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

// Configurações e capacidades oficiais de leitos das alas
export const ALA_CONFIG_LEITOS = {
  "n1": 39, "ala n1": 39, "ala-n1": 39,
  "n2": 39, "ala n2": 39, "ala-n2": 39,
  "r1 m": 10, "r1-m": 10, "r1m": 10, "r1 masculino": 10, "ala r1 m": 10, "ala r1 masculino": 10,
  "r1 f": 15, "r1-f": 15, "r1f": 15, "r1 feminino": 15, "ala r1 f": 15, "ala r1 feminino": 15,
  "ucp": 10, "ala ucp": 10,
  "cl1": 10, "cl 1": 10, "ala cl1": 10, "ala cl 1": 10, "clinica 1": 10,
  "cl2": 10, "cl 2": 10, "ala cl2": 10, "ala cl 2": 10, "clinica 2": 10,
  "casa meninos": 3, "casa dos meninos": 3, "ala casa meninos": 3, "ala casa dos meninos": 3
};

export function getAlaCapacity(ala) {
  if (!ala) return 10;
  const dbLeitos = Number(ala.leitos);
  if (dbLeitos && !isNaN(dbLeitos) && dbLeitos > 0) return dbLeitos;

  const norm = String(ala.nome || "").trim().toLowerCase();
  if (ALA_CONFIG_LEITOS[norm]) return ALA_CONFIG_LEITOS[norm];

  if (norm.includes("n1")) return 39;
  if (norm.includes("n2")) return 39;
  if (norm.includes("r1") && (norm.includes("m") || norm.includes("masc"))) return 10;
  if (norm.includes("r1") && (norm.includes("f") || norm.includes("fem"))) return 15;
  if (norm.includes("ucp")) return 10;
  if (norm.includes("cl1") || norm.includes("cl 1")) return 10;
  if (norm.includes("cl2") || norm.includes("cl 2")) return 10;
  if (norm.includes("menino")) return 3;

  return Number(ala.totalLeitos || ala.capacidade || 10) || 10;
}

// Operações de Pacientes
export const PacienteService = {
  async list({ status = "all", alaId = "all", search = "" } = {}) {
    await ensureRecepcaoTables();
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
    const idade = data.idade ? parseInt(data.idade, 10) : null;
    const idadeSql = idade !== null && !isNaN(idade) ? idade : "NULL";

    const q = `
      INSERT INTO "Paciente" (
        "id", "nome", "prontuario", "idade", "alaId", "alaNome", "leito", "status", "observacoes", "dataAlta", "created_at"
      ) VALUES (
        '${id}', '${safeNome}', '${safeProntuario}', ${idadeSql}, '${safeAlaId}', '${safeAlaNome}', '${safeLeito}', 'Ativo', '${safeObs}', NULL, '${now}'
      );
      NOTIFY nova_admissao, '${safeNome}|${safeAlaNome}|${safeLeito}';
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
      WHERE "id" = '${id}';
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

  async reinternar(id, { nome, alaId, alaNome, leito, observacoes = "" }) {
    const now = new Date().toISOString();
    const safeAlaId = (alaId || "").replace(/'/g, "''");
    const safeAlaNome = (alaNome || "").replace(/'/g, "''");
    const safeLeito = (leito || "").trim().replace(/'/g, "''");
    const safeNome = (nome || "Paciente").trim().replace(/'/g, "''");
    const reinternacaoNote = ` [Reinternado em ${new Date().toLocaleDateString('pt-BR')}] ${observacoes || ""}`.replace(/'/g, "''");

    const q = `
      UPDATE "Paciente" SET
        "status" = 'Ativo',
        "dataAlta" = NULL,
        "alaId" = '${safeAlaId}',
        "alaNome" = '${safeAlaNome}',
        "leito" = '${safeLeito}',
        "created_at" = '${now}',
        "observacoes" = COALESCE("observacoes", '') || '${reinternacaoNote}'
      WHERE "id" = '${id}';
      NOTIFY nova_admissao, '${safeNome}|${safeAlaNome}|${safeLeito}';
    `;
    await executePostgres(q);
    await logAuditoria("REINTERNACAO", id, { alaNome, leito, reinternadoEm: now });
  }
};

// Operações de Alas
export const AlaService = {
  async list() {
    await ensureRecepcaoTables();
    const q = `SELECT * FROM "Ala" WHERE deleted_at IS NULL ORDER BY "nome" ASC`;
    return await queryPostgres(q);
  }
};

// Estatísticas da Recepção
export const EstatisticasService = {
  async getDashboardMetrics() {
    await ensureRecepcaoTables();
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

      // Ocupação por ala
      const ocupacaoPorAla = alas.map(ala => {
        const internadosNestaAla = ativos.filter(p => {
          const pAlaId = String(p.alaId || p.ala_id || "");
          const pAlaNome = String(p.alaNome || p.ala_nome || "").trim().toLowerCase();
          const aNome = String(ala.nome || "").trim().toLowerCase();
          const aId = String(ala.id || "");
          return (pAlaId && pAlaId === aId) || (pAlaNome && pAlaNome === aNome);
        });
        const capacidade = getAlaCapacity(ala);
        const ocupados = internadosNestaAla.length;
        const percentual = capacidade > 0 ? Math.min(100, Math.round((ocupados / capacidade) * 100)) : 0;
        return {
          alaId: ala.id,
          alaNome: ala.nome,
          totalLeitos: capacidade,
          ocupados,
          disponiveis: Math.max(0, capacidade - ocupados),
          percentual,
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
    await ensureRecepcaoTables();
    try {
      const q = `SELECT "id", "nome", "login", "senha", "coren", "crf", "perfil", "primeiro_acesso" FROM "Usuario" WHERE deleted_at IS NULL ORDER BY nome ASC`;
      return await queryPostgres(q);
    } catch (e) {
      console.warn("Aviso ao buscar usuários do postgres:", e);
      return [];
    }
  },

  async updatePassword(userId, newPassword) {
    const safePass = newPassword.replace(/'/g, "''");
    const q = `UPDATE "Usuario" SET "senha" = '${safePass}', "primeiro_acesso" = false WHERE "id" = '${userId}';`;
    await executePostgres(q);
  }
};

// Operações de Visitas
export const VisitaService = {
  async list({ status = "all", pacienteId = null, search = "" } = {}) {
    await ensureRecepcaoTables();
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

    const q = `
      INSERT INTO "Visita" (
        "id", "pacienteId", "pacienteNome", "prontuario", "alaNome", "leito",
        "visitanteNome", "tipoDocumento", "documentoNumero", "parentesco",
        "dataHoraEntrada", "dataHoraSaida", "status", "observacoes", "recepcionista", "created_at"
      ) VALUES (
        '${id}', '${safePacienteId}', '${safePacienteNome}', '${safeProntuario}', '${safeAlaNome}', '${safeLeito}',
        '${safeVisitanteNome}', '${tipoDocumento}', '${safeDocNumero}', '${safeParentesco}',
        '${safeEntrada}', NULL, 'Em Andamento', '${safeObs}', '${safeRecepcionista}', '${now}'
      );
    `;
    await executePostgres(q);
    await logAuditoria("CADASTRAR_VISITA", id, { visitanteNome: data.visitanteNome, pacienteNome: data.pacienteNome, tipoDocumento, documentoNumero: data.documentoNumero });
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


