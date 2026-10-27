import React, { useState, useMemo } from "react";
import { 
  Clock, 
  Search, 
  PlusCircle, 
  Trash2, 
  Filter, 
  Building2, 
  Calendar,
  AlertCircle,
  FileText,
  Printer,
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  User,
  Users,
  Timer,
  ChevronRight,
  Edit,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AtendimentoRecepcaoService } from "@/api/db";
import { AtendimentoModal } from "@/components/AtendimentoModal";

export function AtendimentosRecepcao({
  atendimentos = [],
  patients = [],
  alas = [],
  currentUser = null,
  onNewPatient = null,
  onRefresh
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dataFilter, setDataFilter] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [motivoFilter, setMotivoFilter] = useState("all"); // "all" | "Admissão" | "Alta" | "Observação"
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [atendimentoToEdit, setAtendimentoToEdit] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);

  const hojeStr = format(new Date(), "yyyy-MM-dd");

  // Métricas do Painel Superior
  const metrics = useMemo(() => {
    let totalHoje = 0;
    let emEspera = 0;
    let emConsultorio = 0;
    let admissoesHoje = 0;
    let altasHoje = 0;

    let somaMinutos = 0;
    let contComTempo = 0;

    (atendimentos || []).forEach(a => {
      const isHoje = a.dataAdmissao === hojeStr;
      if (isHoje) {
        totalHoje++;
        if (a.motivo === "Admissão") admissoesHoje++;
        if (a.motivo === "Alta") altasHoje++;
      }

      if (!a.horarioSaidaConsultorio) {
        if (a.horarioEntradaConsultorio) {
          emConsultorio++;
        } else {
          emEspera++;
        }
      }

      // Cálculo para tempo médio
      if (a.tempoAtendimento) {
        const matchH = a.tempoAtendimento.match(/(\d+)\s*h/);
        const matchM = a.tempoAtendimento.match(/(\d+)\s*min/);
        let m = 0;
        if (matchH) m += parseInt(matchH[1], 10) * 60;
        if (matchM) m += parseInt(matchM[1], 10);
        if (m > 0) {
          somaMinutos += m;
          contComTempo++;
        }
      }
    });

    const mediaMin = contComTempo > 0 ? Math.round(somaMinutos / contComTempo) : 0;
    const tempoMedioFmt = mediaMin >= 60 
      ? `${Math.floor(mediaMin / 60)}h ${mediaMin % 60}m` 
      : `${mediaMin} min`;

    return {
      totalHoje,
      emEspera,
      emConsultorio,
      admissoesHoje,
      altasHoje,
      tempoMedioFmt: contComTempo > 0 ? tempoMedioFmt : "--"
    };
  }, [atendimentos, hojeStr]);

  // Lista filtrada
  const filteredAtendimentos = useMemo(() => {
    return (atendimentos || []).filter(a => {
      // Filtro de data (se selecionada)
      if (dataFilter && a.dataAdmissao !== dataFilter) {
        return false;
      }

      // Filtro de motivo
      if (motivoFilter !== "all" && String(a.motivo || "").toLowerCase() !== motivoFilter.toLowerCase()) {
        return false;
      }

      // Filtro de busca textual
      if (searchTerm.trim()) {
        const s = searchTerm.trim().toLowerCase();
        const nome = (a.pacienteNome || "").toLowerCase().includes(s);
        const pront = (a.prontuario || "").toLowerCase().includes(s);
        const ala = (a.alaDestinoNome || "").toLowerCase().includes(s);
        const obs = (a.observacoes || "").toLowerCase().includes(s);
        if (!nome && !pront && !ala && !obs) return false;
      }

      return true;
    });
  }, [atendimentos, dataFilter, motivoFilter, searchTerm]);

  // Ação rápida: Carimbar horário diretamente na linha da tabela
  const handleAcaoRapidaHorario = async (item, campo) => {
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    try {
      await AtendimentoRecepcaoService.update(item.id, {
        ...item,
        [campo]: hora
      });
      toast.success(`Horário registrado: ${hora}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar horário rápido.");
    }
  };

  // Excluir registro
  const handleDelete = async (id, nome) => {
    if (!confirm(`Deseja realmente excluir o registro de atendimento de "${nome}"?`)) {
      return;
    }
    try {
      setIsDeletingId(id);
      await AtendimentoRecepcaoService.delete(id);
      toast.success("Registro de atendimento excluído com sucesso.");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir atendimento.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleOpenNew = () => {
    setAtendimentoToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setAtendimentoToEdit(item);
    setModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA ABA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Stethoscope className="w-7 h-7 text-sky-600" />
              Controle de Atendimento & Triagem
            </h2>
            <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-xs font-bold">
              Recepção
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro de entrada, tempo de espera, consultório médico e encaminhamento para alas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-xs h-9 gap-1.5 border-slate-300 font-semibold cursor-pointer"
            title="Imprimir relatório da tabela"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </Button>

          <Button
            onClick={handleOpenNew}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 gap-1.5 shadow-md cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      {/* CARDS DE RESUMO DO DIA */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="bg-white border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Hoje</p>
              <h3 className="text-2xl font-black text-slate-800 mt-0.5">{metrics.totalHoje}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aguardando</p>
              <h3 className="text-2xl font-black text-amber-600 mt-0.5">{metrics.emEspera}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Em Consulta</p>
              <h3 className="text-2xl font-black text-indigo-600 mt-0.5">{metrics.emConsultorio}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admissões</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{metrics.admissoesHoje}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-xs hover:shadow-md transition-shadow col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tempo Médio</p>
              <h3 className="text-xl font-black text-slate-800 mt-0.5">{metrics.tempoMedioFmt}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Timer className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Buscar por paciente, prontuário, ala..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Filtro de Data */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-500">Data:</span>
            <input
              type="date"
              value={dataFilter}
              onChange={(e) => setDataFilter(e.target.value)}
              className="text-xs bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            />
            {dataFilter && (
              <button
                onClick={() => setDataFilter("")}
                className="text-[10px] text-slate-400 hover:text-slate-700 ml-1 cursor-pointer font-bold"
                title="Limpar filtro de data (mostrar todos)"
              >
                ✕
              </button>
            )}
          </div>

          {/* Botão Hoje Rápido */}
          <Button
            size="sm"
            variant={dataFilter === hojeStr ? "default" : "outline"}
            onClick={() => setDataFilter(hojeStr)}
            className={`text-xs h-8 px-2.5 cursor-pointer ${dataFilter === hojeStr ? "bg-sky-600 hover:bg-sky-700 text-white" : ""}`}
          >
            Hoje
          </Button>

          {/* Filtro de Motivo */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setMotivoFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                motivoFilter === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setMotivoFilter("Admissão")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                motivoFilter === "Admissão" ? "bg-white text-sky-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Admissão
            </button>
            <button
              onClick={() => setMotivoFilter("Alta")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                motivoFilter === "Alta" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Alta
            </button>
          </div>
        </div>
      </div>

      {/* TABELA DE ATENDIMENTOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-3 text-center">Data</th>
                <th className="py-3 px-3 text-center">Entrada</th>
                <th className="py-3 px-3 text-center">Aviso Equipe</th>
                <th className="py-3 px-3 text-center">Entrada Consultório</th>
                <th className="py-3 px-3 text-center">Saída Consultório</th>
                <th className="py-3 px-3 text-center">Motivo</th>
                <th className="py-3 px-3 text-center">Ala Destino</th>
                <th className="py-3 px-3 text-center">Tempo Atendimento</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAtendimentos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Stethoscope className="w-8 h-8 text-slate-300 stroke-1" />
                      <p className="font-semibold">Nenhum atendimento registrado para os filtros selecionados.</p>
                      <Button
                        size="sm"
                        onClick={handleOpenNew}
                        className="bg-sky-600 hover:bg-sky-700 text-white text-xs mt-2"
                      >
                        + Registrar Primeiro Atendimento
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAtendimentos.map((item) => {
                  const dataFmt = item.dataAdmissao 
                    ? format(parseISO(item.dataAdmissao), "dd/MM/yyyy") 
                    : "--";

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Paciente */}
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.pacienteNome ? item.pacienteNome.charAt(0).toUpperCase() : "P"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {item.pacienteNome}
                            </div>
                            {item.prontuario && (
                              <div className="text-[10px] font-mono text-slate-400">
                                Pront: {item.prontuario}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Data Admissão */}
                      <td className="py-3 px-3 text-center font-mono text-slate-600 text-[11px]">
                        {dataFmt}
                      </td>

                      {/* Horário Entrada */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-sky-800">
                        {item.horarioEntrada || "--"}
                      </td>

                      {/* Horário Aviso Equipe */}
                      <td className="py-3 px-3 text-center font-mono">
                        {item.horarioAvisoEquipe ? (
                          <span className="text-slate-700 font-semibold">{item.horarioAvisoEquipe}</span>
                        ) : (
                          <button
                            onClick={() => handleAcaoRapidaHorario(item, "horarioAvisoEquipe")}
                            className="text-[10px] bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                            title="Marcar aviso da equipe agora"
                          >
                            + Avisar
                          </button>
                        )}
                      </td>

                      {/* Horário Entrada Consultório */}
                      <td className="py-3 px-3 text-center font-mono">
                        {item.horarioEntradaConsultorio ? (
                          <span className="text-slate-700 font-semibold">{item.horarioEntradaConsultorio}</span>
                        ) : (
                          <button
                            onClick={() => handleAcaoRapidaHorario(item, "horarioEntradaConsultorio")}
                            className="text-[10px] bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                            title="Marcar entrada no consultório agora"
                          >
                            + Entrou
                          </button>
                        )}
                      </td>

                      {/* Horário Saída Consultório */}
                      <td className="py-3 px-3 text-center font-mono">
                        {item.horarioSaidaConsultorio ? (
                          <span className="text-emerald-700 font-bold">{item.horarioSaidaConsultorio}</span>
                        ) : (
                          <button
                            onClick={() => handleAcaoRapidaHorario(item, "horarioSaidaConsultorio")}
                            className="text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                            title="Marcar saída do consultório agora"
                          >
                            + Saiu
                          </button>
                        )}
                      </td>

                      {/* Motivo (Admissão / Alta) */}
                      <td className="py-3 px-3 text-center">
                        {item.motivo === "Admissão" ? (
                          <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] font-bold">
                            🏥 Admissão
                          </Badge>
                        ) : item.motivo === "Alta" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            ✅ Alta
                          </Badge>
                        ) : item.motivo === "Observação" ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                            👁️ Observação
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-medium text-slate-600">
                            {item.motivo || "Atendimento"}
                          </Badge>
                        )}
                      </td>

                      {/* Ala Destino */}
                      <td className="py-3 px-3 text-center">
                        {item.alaDestinoNome ? (
                          <span className="font-semibold text-slate-700 text-xs flex items-center justify-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {item.alaDestinoNome}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">--</span>
                        )}
                      </td>

                      {/* Tempo de Atendimento */}
                      <td className="py-3 px-3 text-center font-mono">
                        {item.tempoAtendimento ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                            ⏱️ {item.tempoAtendimento}
                          </Badge>
                        ) : item.horarioEntrada && !item.horarioSaidaConsultorio ? (
                          <span className="text-[10px] text-amber-600 font-semibold animate-pulse">
                            ⏳ Em andamento
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Editar Atendimento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.pacienteNome)}
                            disabled={isDeletingId === item.id}
                            title="Excluir Registro"
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

        {/* Rodapé da tabela com contagem */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Mostrando <b>{filteredAtendimentos.length}</b> atendimento(s)
          </span>
          <span className="text-[11px] text-slate-400">
            Zorion Recepção • Controle de Acolhimento e Consultório
          </span>
        </div>
      </div>

      {/* Modal de Cadastro / Edição */}
      <AtendimentoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        atendimento={atendimentoToEdit}
        patients={patients}
        alas={alas}
        currentUser={currentUser}
        onNewPatient={onNewPatient}
        onSaved={onRefresh}
      />
    </div>
  );
}
