import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Printer, 
  Search, 
  Calendar, 
  Users, 
  Clock, 
  LogOut, 
  Building2, 
  Bed, 
  User, 
  FileText, 
  CheckCircle2, 
  Filter,
  Download
} from "lucide-react";
import { format, parseISO, subDays, subMonths, subYears, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RecepcaoRelatorioModal({
  open,
  onOpenChange,
  initialType = "admissoes", // 'internados' | 'admissoes' | 'altas'
  patients = [],
  alas = []
}) {
  const [reportType, setReportType] = useState(initialType);
  const [periodFilter, setPeriodFilter] = useState("1d"); // '1d' | '1m' | '1a' | 'custom'
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAla, setSelectedAla] = useState("all");

  // Sincroniza initialType quando modal abre
  React.useEffect(() => {
    if (open) {
      setReportType(initialType);
    }
  }, [open, initialType]);

  // Função auxiliar para verificar status de alta
  const isPatientAlta = (p) => {
    const s = String(p.status || "").trim().toLowerCase();
    return s === "alta" || p.ativo === false;
  };

  // Filtragem dos pacientes de acordo com Tipo, Período, Busca e Ala
  const filteredRecords = useMemo(() => {
    const now = new Date();
    let startDate = null;
    let endDate = endOfDay(now);

    if (periodFilter === "1d") {
      startDate = startOfDay(subDays(now, 1));
    } else if (periodFilter === "1m") {
      startDate = startOfDay(subMonths(now, 1));
    } else if (periodFilter === "1a") {
      startDate = startOfDay(subYears(now, 1));
    } else if (periodFilter === "custom") {
      if (customStart) startDate = startOfDay(parseISO(customStart));
      if (customEnd) endDate = endOfDay(parseISO(customEnd));
    }

    return patients.filter((p) => {
      const isAlta = isPatientAlta(p);

      // Filtro por Tipo de Relatório
      if (reportType === "internados" && isAlta) return false;
      if (reportType === "altas" && !isAlta) return false;
      // Para "admissoes", pode ser qualquer paciente admitido no período

      // Filtro de Período
      let dateToCheck = null;
      if (reportType === "altas") {
        dateToCheck = p.dataAlta ? new Date(p.dataAlta) : (p.updated_at ? new Date(p.updated_at) : null);
      } else {
        dateToCheck = p.created_at ? new Date(p.created_at) : (p.dataAdmissao ? new Date(p.dataAdmissao) : null);
      }

      if (dateToCheck && !isNaN(dateToCheck.getTime())) {
        if (startDate && isBefore(dateToCheck, startDate)) return false;
        if (endDate && isAfter(dateToCheck, endDate)) return false;
      }

      // Filtro de Ala
      if (selectedAla !== "all") {
        const pAlaId = p.alaId || "";
        const pAlaNome = (p.alaNome || "").trim().toLowerCase();
        const alaObj = alas.find(a => a.id === selectedAla);
        const matchId = pAlaId === selectedAla;
        const matchNome = alaObj && pAlaNome === alaObj.nome.trim().toLowerCase();
        if (!matchId && !matchNome) return false;
      }

      // Filtro de Busca Texto
      if (searchTerm.trim()) {
        const t = searchTerm.trim().toLowerCase();
        const nomeMatch = (p.nome || "").toLowerCase().includes(t);
        const prontMatch = (p.prontuario || "").toLowerCase().includes(t);
        const alaMatch = (p.alaNome || "").toLowerCase().includes(t);
        const leitoMatch = (p.leito || "").toLowerCase().includes(t);
        if (!nomeMatch && !prontMatch && !alaMatch && !leitoMatch) return false;
      }

      return true;
    });
  }, [patients, reportType, periodFilter, customStart, customEnd, selectedAla, searchTerm, alas]);

  // Função para acionar a impressão formatada
  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "internados": return "Relatório de Pacientes Internados";
      case "admissoes": return "Relatório de Admissões Hospitalares";
      case "altas": return "Relatório de Altas Concedidas";
      default: return "Relatório Hospitalar";
    }
  };

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case "1d": return "Último 1 Dia (24h)";
      case "1m": return "Último 1 Mês (30 dias)";
      case "1a": return "Último 1 Ano (365 dias)";
      case "custom": return `Personalizado: ${customStart || 'Início'} até ${customEnd || 'Fim'}`;
      default: return "Período Geral";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 border-0 shadow-2xl rounded-2xl bg-slate-50 overflow-hidden print:max-w-none print:w-full print:h-auto print:bg-white print:shadow-none">
        {/* Cabeçalho do Modal */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 shrink-0 relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-white print:text-black print:p-2 print:border-b print:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold uppercase tracking-wider print:hidden">
                Zorion Recepção
              </span>
              <span className="text-xs text-slate-400 print:text-slate-600">
                Emitido em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 text-white print:text-slate-900">
              {getReportTitle()}
            </h2>
            <p className="text-xs text-slate-300 print:text-slate-600 mt-0.5">
              Filtro ativo: <strong className="text-sky-300 print:text-black">{getPeriodLabel()}</strong> • Total localizado: <strong>{filteredRecords.length}</strong> registro(s)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <Button
              onClick={handlePrint}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-xl shadow-md gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Relatório
            </Button>
          </div>
        </div>

        {/* Filtros e Controles (Ocultos na impressão) */}
        <div className="p-4 bg-white border-b border-slate-200/80 shrink-0 space-y-3 print:hidden">
          {/* Seleção do Tipo de Relatório */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              Tipo:
            </span>
            <button
              onClick={() => setReportType("admissoes")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === "admissoes"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Clock className="w-3 h-3 inline mr-1" />
              Admissões
            </button>
            <button
              onClick={() => setReportType("internados")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === "internados"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Users className="w-3 h-3 inline mr-1" />
              Pacientes Internados
            </button>
            <button
              onClick={() => setReportType("altas")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === "altas"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <LogOut className="w-3 h-3 inline mr-1" />
              Altas Concedidas
            </button>
          </div>

          {/* Seleção de Período: 1 Dia, 1 Mês, 1 Ano, Personalizado */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              Período:
            </span>
            <button
              onClick={() => setPeriodFilter("1d")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodFilter === "1d" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              1 Dia (24h)
            </button>
            <button
              onClick={() => setPeriodFilter("1m")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodFilter === "1m" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              1 Mês
            </button>
            <button
              onClick={() => setPeriodFilter("1a")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodFilter === "1a" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              1 Ano
            </button>
            <button
              onClick={() => setPeriodFilter("custom")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodFilter === "custom" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Personalizado
            </button>

            {/* Inputs de Data Personalizada */}
            {periodFilter === "custom" && (
              <div className="flex items-center gap-2 ml-2 animate-in fade-in">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 text-xs w-36"
                  title="Data Início"
                />
                <span className="text-xs text-slate-400">até</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 text-xs w-36"
                  title="Data Fim"
                />
              </div>
            )}
          </div>

          {/* Barra de Busca e Filtro de Ala */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, prontuário, leito ou ala..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="sm:col-span-4">
              <Select value={selectedAla} onValueChange={setSelectedAla}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as Alas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Alas</SelectItem>
                  {alas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabela de Dados & Relatório */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">Nenhum registro encontrado para este filtro.</p>
              <p className="text-xs text-slate-400">Experimente trocar o período selecionado ou limpar os termos de busca.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Paciente</th>
                    <th className="py-3 px-4">Prontuário</th>
                    <th className="py-3 px-4">Ala / Setor</th>
                    <th className="py-3 px-4">Leito</th>
                    <th className="py-3 px-4">Admissão</th>
                    <th className="py-3 px-4">Status / Alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((p) => {
                    const isAlta = isPatientAlta(p);
                    const admDate = p.created_at || p.dataAdmissao;
                    const altaDate = p.dataAlta;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Paciente com Foto */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-xs print:border-slate-300">
                              {p.foto ? (
                                <img src={p.foto} alt={p.nome} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{p.nome}</div>
                              {p.idade && (
                                <div className="text-[10px] text-slate-500">{p.idade} anos</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Prontuário */}
                        <td className="py-3 px-4 font-mono font-bold text-sky-800">
                          {p.prontuario || "—"}
                        </td>

                        {/* Ala */}
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {p.alaNome || "Ala Geral"}
                        </td>

                        {/* Leito */}
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {p.leito || "S/L"}
                        </td>

                        {/* Data de Admissão */}
                        <td className="py-3 px-4 text-slate-600">
                          {admDate ? format(new Date(admDate), "dd/MM/yyyy HH:mm") : "—"}
                        </td>

                        {/* Status / Data Alta */}
                        <td className="py-3 px-4">
                          {isAlta ? (
                            <div>
                              <Badge variant="outline" className="text-[10px] font-bold py-0.5 bg-amber-50 text-amber-700 border-amber-300">
                                Alta
                              </Badge>
                              {altaDate && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {format(new Date(altaDate), "dd/MM/yyyy HH:mm")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold py-0.5 bg-emerald-50 text-emerald-700 border-emerald-300">
                              Internado
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé com Totais */}
        <div className="p-4 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 shrink-0 print:border-t print:pt-2">
          <span>
            Total exibido: <strong>{filteredRecords.length}</strong> paciente(s)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="print:hidden text-xs"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
