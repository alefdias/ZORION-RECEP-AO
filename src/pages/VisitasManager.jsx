import React, { useState, useMemo } from "react";
import { 
  UserCheck, 
  Clock, 
  CreditCard, 
  Search, 
  PlusCircle, 
  LogOut, 
  CheckCircle2, 
  Trash2, 
  Filter, 
  Building2, 
  Bed, 
  Calendar,
  AlertCircle,
  FileText,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { VisitaService } from "@/api/db";
import { VisitaModal } from "@/components/VisitaModal";

export function VisitasManager({ 
  visitas = [], 
  patients = [], 
  currentUser = null,
  onRefresh 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "em_andamento" | "concluida"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessingId, setIsProcessingId] = useState(null);

  // Filtra pacientes ativos para o cadastro
  const activePatients = useMemo(() => {
    return (patients || []).filter(p => {
      const s = String(p.status || "").trim().toLowerCase();
      return s !== "alta" && p.ativo !== false;
    });
  }, [patients]);

  // Contadores
  const metrics = useMemo(() => {
    const hojeStr = format(new Date(), "yyyy-MM-dd");
    let emAndamento = 0;
    let hoje = 0;

    (visitas || []).forEach(v => {
      const isEmAndamento = !v.dataHoraSaida || v.status === "Em Andamento";
      if (isEmAndamento) emAndamento++;

      if (v.dataHoraEntrada && v.dataHoraEntrada.startsWith(hojeStr)) {
        hoje++;
      }
    });

    return {
      emAndamento,
      hoje,
      total: visitas.length
    };
  }, [visitas]);

  // Filtragem da lista
  const filteredVisitas = useMemo(() => {
    return (visitas || []).filter(v => {
      const isEmAndamento = !v.dataHoraSaida || v.status === "Em Andamento";
      if (statusFilter === "em_andamento" && !isEmAndamento) return false;
      if (statusFilter === "concluida" && isEmAndamento) return false;

      if (searchTerm.trim()) {
        const t = searchTerm.trim().toLowerCase();
        const visitante = (v.visitanteNome || "").toLowerCase().includes(t);
        const doc = (v.documentoNumero || "").toLowerCase().includes(t);
        const paciente = (v.pacienteNome || "").toLowerCase().includes(t);
        const prontuario = (v.prontuario || "").toLowerCase().includes(t);
        const ala = (v.alaNome || "").toLowerCase().includes(t);
        const leito = (v.leito || "").toLowerCase().includes(t);
        if (!visitante && !doc && !paciente && !prontuario && !ala && !leito) return false;
      }

      return true;
    });
  }, [visitas, statusFilter, searchTerm]);

  // Ação de registrar saída
  const handleRegistrarSaida = async (visita) => {
    try {
      setIsProcessingId(visita.id);
      await VisitaService.registrarSaida(visita.id);
      toast.success(`Saída de ${visita.visitanteNome} registrada com sucesso!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Erro ao registrar saída:", err);
      toast.error("Erro ao registrar saída do visitante.");
    } finally {
      setIsProcessingId(null);
    }
  };

  // Excluir registro
  const handleDelete = async (visita) => {
    if (!window.confirm(`Tem certeza que deseja excluir o registro da visita de "${visita.visitanteNome}"?`)) {
      return;
    }
    try {
      setIsProcessingId(visita.id);
      await VisitaService.delete(visita.id);
      toast.success("Registro de visita excluído.");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Erro ao excluir visita:", err);
      toast.error("Erro ao excluir registro de visita.");
    } finally {
      setIsProcessingId(null);
    }
  };

  const formatHora = (isoDate) => {
    if (!isoDate) return "--:--";
    try {
      return format(parseISO(isoDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Header & Controles */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <UserCheck className="w-6 h-6 text-sky-600" />
              Controle de Visitas & Portaria
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Registro de entrada e saída de familiares e visitantes nos leitos hospitalares.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-xl shadow-md gap-2 text-xs sm:text-sm h-10 cursor-pointer w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Cadastrar Nova Visita</span>
          </Button>
        </div>

        {/* Cards de Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/70 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">No Hospital Agora</div>
              <div className="text-2xl font-black text-sky-950 mt-0.5">{metrics.emAndamento}</div>
            </div>
            <div className="relative">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Visitas Hoje</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{metrics.hoje}</div>
            </div>
            <Calendar className="w-6 h-6 text-slate-400" />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Total de Registros</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{metrics.total}</div>
            </div>
            <UserCheck className="w-6 h-6 text-slate-400" />
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por visitante, RG, CPF ou paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs bg-slate-50/60 border-slate-200"
            />
          </div>

          {/* Abas de Status */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas ({visitas.length})
            </button>
            <button
              onClick={() => setStatusFilter("em_andamento")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === "em_andamento"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Em Andamento ({metrics.emAndamento})
            </button>
            <button
              onClick={() => setStatusFilter("concluida")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === "concluida"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Saída Registrada ({visitas.length - metrics.emAndamento})
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Visitas */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Visitante</th>
                <th className="py-3.5 px-4">Documento</th>
                <th className="py-3.5 px-4">Paciente Visitado</th>
                <th className="py-3.5 px-4">Entrada</th>
                <th className="py-3.5 px-4">Saída / Status</th>
                <th className="py-3.5 px-4">Recepção / Obs</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisitas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600">Nenhum registro de visita encontrado.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchTerm ? "Tente alterar os termos da busca." : "Clique em 'Cadastrar Nova Visita' para registrar a primeira entrada."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVisitas.map((v) => {
                  const isEmAndamento = !v.dataHoraSaida || v.status === "Em Andamento";
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Visitante */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                            {v.foto ? (
                              <img src={v.foto} alt={v.visitanteNome} className="w-full h-full object-cover" />
                            ) : v.foto_recusada ? (
                              <div className="w-full h-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-xs" title={v.foto_recusada_motivo || "Foto recusada pelo visitante"}>
                                🚫
                              </div>
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{v.visitanteNome}</span>
                              {v.foto_recusada && (
                                <Badge variant="outline" className="text-[9px] font-bold py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-300" title={v.foto_recusada_motivo || "Termo de recusa registrado"}>
                                  Recusa Foto
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {v.parentesco ? `Vínculo: ${v.parentesco}` : "Visitante"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Documento RG/CPF */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            v.tipoDocumento === "CPF" 
                              ? "bg-purple-100 text-purple-700 border border-purple-200" 
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}>
                            {v.tipoDocumento || "RG"}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {v.documentoNumero}
                          </span>
                        </div>
                      </td>

                      {/* Paciente Visitado */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sky-950 text-xs">
                          {v.pacienteNome}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Pront: <strong>{v.prontuario || "S/N"}</strong></span>
                          <span>•</span>
                          <span>{v.alaNome || "Ala Geral"}</span>
                          <span>•</span>
                          <span>Leito: <strong>{v.leito || "S/N"}</strong></span>
                        </div>
                      </td>

                      {/* Entrada */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-medium">{formatHora(v.dataHoraEntrada)}</span>
                        </div>
                      </td>

                      {/* Saída / Status */}
                      <td className="py-3.5 px-4">
                        {isEmAndamento ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Em Andamento
                          </span>
                        ) : (
                          <div className="text-slate-600">
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <LogOut className="w-3 h-3 text-slate-400" />
                              <span>{formatHora(v.dataHoraSaida)}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Recepção / Obs */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <div className="text-[11px] text-slate-700 truncate" title={v.observacoes}>
                          {v.observacoes ? v.observacoes : <span className="text-slate-400 italic">Sem observações</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Resp: {v.recepcionista || "Recepção"}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEmAndamento && (
                            <Button
                              onClick={() => handleRegistrarSaida(v)}
                              disabled={isProcessingId === v.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold h-7 px-2.5 rounded-lg gap-1 shadow-xs cursor-pointer"
                              title="Registrar saída do visitante agora"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Registrar Saída</span>
                            </Button>
                          )}

                          <button
                            onClick={() => handleDelete(v)}
                            disabled={isProcessingId === v.id}
                            title="Excluir registro"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro */}
      <VisitaModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        activePatients={activePatients}
        currentUser={currentUser}
        onSaved={onRefresh}
      />
    </div>
  );
}
