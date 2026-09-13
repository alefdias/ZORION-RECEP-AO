import React, { useMemo } from "react";
import { 
  Users, 
  UserCheck, 
  LogOut, 
  Building2, 
  Bed, 
  PlusCircle, 
  Clock, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAlaCapacity } from "@/api/db";

export function RecepcaoDashboard({ 
  metrics, 
  patients = [], 
  alas = [], 
  onNewPatient, 
  onEditPatient, 
  onDarAlta, 
  onGoToPatients 
}) {
  const isPatientAlta = (p) => {
    if (!p) return false;
    const statusStr = String(p.status || "").trim().toLowerCase();
    return statusStr === "alta" || p.ativo === false;
  };

  const activePatients = useMemo(() => {
    return (patients || []).filter(p => !isPatientAlta(p));
  }, [patients]);

  const altaPatients = useMemo(() => {
    return (patients || []).filter(p => isPatientAlta(p));
  }, [patients]);

  const admissoesHoje = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const todayLocale = new Date().toLocaleDateString("pt-BR");
    return (patients || []).filter(p => {
      const dt = p.created_at || p.data_admissao || p.dataInternacao || "";
      return dt.includes(todayIso) || dt.includes(todayLocale);
    }).length;
  }, [patients]);

  const ocupacaoPorAla = useMemo(() => {
    return (alas || []).map(ala => {
      const ocupados = (patients || []).filter(p => {
        if (isPatientAlta(p)) return false;
        return (
          (p.alaId && p.alaId === ala.id) ||
          (p.alaNome && ala.nome && p.alaNome.trim().toLowerCase() === ala.nome.trim().toLowerCase())
        );
      }).length;
      const totalLeitos = getAlaCapacity(ala);
      const disponiveis = Math.max(0, totalLeitos - ocupados);
      const percentual = totalLeitos > 0 ? Math.min(100, Math.round((ocupados / totalLeitos) * 100)) : 0;
      return {
        alaId: ala.id,
        alaNome: ala.nome,
        ocupados,
        disponiveis,
        totalLeitos,
        percentual
      };
    });
  }, [alas, patients]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner de Boas-Vindas & Ações Rápidas */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-sky-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-sky-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Recepção Hospitalar Ativa
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Painel Geral de Internações & Leitos
          </h1>
          <p className="text-sky-100/80 text-sm max-w-xl">
            Gerenciamento simplificado e em tempo real de pacientes internados, admissões e disponibilidade de leitos hospitalares.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <Button
            onClick={onNewPatient}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 gap-2 h-11 text-sm transition-transform active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            Nova Admissão
          </Button>
          <Button
            variant="outline"
            onClick={() => onGoToPatients && onGoToPatients("all")}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md font-semibold px-4 py-2.5 rounded-xl gap-2 h-11 text-sm"
          >
            Ver Todos Pacientes ({patients.length})
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Internados */}
        <div 
          onClick={() => onGoToPatients && onGoToPatients("ativo")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          title="Clique para ver os pacientes internados"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-sky-600 transition-colors">
              Pacientes Internados
            </span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{activePatients.length}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ativos
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Ocupando leitos nas alas</p>
        </div>

        {/* Admissões Hoje */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Admissões Hoje</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{admissoesHoje}</span>
            <span className="text-xs font-medium text-slate-500">cadastros</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Entradas registradas nas últimas 24h</p>
        </div>

        {/* Altas Registradas */}
        <div 
          onClick={() => onGoToPatients && onGoToPatients("alta")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          title="Clique para ver o histórico de altas concedidas"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors">
              Altas Concedidas
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <LogOut className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{altaPatients.length}</span>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Histórico
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Leitos liberados</p>
        </div>

        {/* Total de Alas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Alas Hospitalares</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{alas.length || 0}</span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Setores
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Configuradas no sistema</p>
        </div>
      </div>

      {/* Ocupação por Ala */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bed className="w-5 h-5 text-sky-600" />
              Ocupação & Disponibilidade de Leitos por Ala
            </h2>
            <p className="text-xs text-slate-500">Capacidade e taxa de ocupação em tempo real</p>
          </div>
          <Badge variant="outline" className="text-xs font-medium bg-slate-50">
            {ocupacaoPorAla.length} alas monitoradas
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {ocupacaoPorAla.map(ala => {
            const isCritical = ala.percentual >= 90;
            const isWarning = ala.percentual >= 70 && ala.percentual < 90;

            return (
              <div 
                key={ala.alaId || ala.alaNome}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800">{ala.alaNome}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isCritical 
                      ? "bg-rose-100 text-rose-700" 
                      : isWarning 
                      ? "bg-amber-100 text-amber-800" 
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {ala.percentual}% ocupado
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.min(100, ala.percentual)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span><strong>{ala.ocupados}</strong> internados</span>
                  <span><strong>{ala.disponiveis}</strong> leitos livres</span>
                  <span>Total: {ala.totalLeitos}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admissões Recentes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              Últimos Pacientes Internados
            </h2>
            <p className="text-xs text-slate-500">Admissões recentes ativas no hospital</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGoToPatients}
            className="text-sky-600 hover:text-sky-700 font-semibold text-xs gap-1"
          >
            Ver todos ({activePatients.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {activePatients.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Nenhum paciente internado no momento.</p>
            <Button size="sm" onClick={onNewPatient} className="bg-sky-600 hover:bg-sky-700 text-white text-xs">
              Cadastrar Primeiro Paciente
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-6">Prontuário</th>
                  <th className="py-3 px-6">Paciente</th>
                  <th className="py-3 px-6">Ala & Leito</th>
                  <th className="py-3 px-6">Idade</th>
                  <th className="py-3 px-6">Data Admissão</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activePatients.slice(0, 6).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-sky-700">
                      {p.prontuario || "—"}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900 text-sm">{p.nome}</div>
                      {p.observacoes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.observacoes}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-700">{p.alaNome || "Sem Ala"}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Bed className="w-3 h-3 text-slate-400" />
                        Leito: {p.leito || "S/N"}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">
                      {p.idade ? `${p.idade} anos` : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditPatient(p)}
                        className="h-7 text-xs text-slate-600 hover:text-sky-600 hover:bg-sky-50"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
