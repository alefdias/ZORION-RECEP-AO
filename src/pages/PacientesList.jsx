import React, { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  PlusCircle, 
  Edit2, 
  LogOut, 
  RotateCcw, 
  Building2, 
  Bed, 
  CheckCircle2, 
  History, 
  Calendar,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PacientesList({ 
  patients = [], 
  alas = [], 
  initialStatusFilter = "ativo",
  onNewPatient, 
  onEditPatient, 
  onDarAlta, 
  onReinternar 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter); // "ativo" | "alta" | "all"
  const [selectedAla, setSelectedAla] = useState("all");

  const isPatientAlta = (p) => {
    if (!p) return false;
    const s = String(p.status || "").trim().toLowerCase();
    return s === "alta" || p.ativo === false;
  };

  const filteredPatients = useMemo(() => {
    return (patients || []).filter(p => {
      const isAlta = isPatientAlta(p);
      // Status filter
      if (statusFilter === "ativo" && isAlta) return false;
      if (statusFilter === "alta" && !isAlta) return false;

      // Ala filter
      if (selectedAla !== "all") {
        if (p.alaId !== selectedAla && p.alaNome !== selectedAla) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const nomeMatch = (p.nome || "").toLowerCase().includes(term);
        const prontMatch = (p.prontuario || "").toLowerCase().includes(term);
        const leitoMatch = (p.leito || "").toLowerCase().includes(term);
        const alaMatch = (p.alaNome || "").toLowerCase().includes(term);
        if (!nomeMatch && !prontMatch && !leitoMatch && !alaMatch) return false;
      }

      return true;
    });
  }, [patients, statusFilter, selectedAla, searchTerm]);

  const countAtivos = useMemo(() => (patients || []).filter(p => !isPatientAlta(p)).length, [patients]);
  const countAltas = useMemo(() => (patients || []).filter(p => isPatientAlta(p)).length, [patients]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Header & Controles */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Users className="w-6 h-6 text-sky-600" />
              Gestão de Pacientes & Admissões
            </h1>
            <p className="text-xs text-slate-500">
              Controle de internação, edição cadastral e histórico hospitalar.
            </p>
          </div>

          <Button
            onClick={onNewPatient}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-xl shadow-md gap-2 h-10 text-xs sm:text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Admissão de Paciente
          </Button>
        </div>

        {/* Filtros e Busca */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          {/* Busca por texto */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nome do Paciente, Prontuário ou Leito..."
              className="pl-9 h-10 text-xs sm:text-sm"
            />
          </div>

          {/* Filtro de Status */}
          <div className="md:col-span-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Internados Ativos ({countAtivos})</SelectItem>
                <SelectItem value="alta">Altas Concedidas ({countAltas})</SelectItem>
                <SelectItem value="all">Todos ({patients.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Ala */}
          <div className="md:col-span-3">
            <Select value={selectedAla} onValueChange={setSelectedAla}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Todas as Alas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Alas</SelectItem>
                {alas.map(ala => (
                  <SelectItem key={ala.id} value={ala.id}>
                    {ala.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela de Pacientes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Exibindo <strong>{filteredPatients.length}</strong> de <strong>{patients.length}</strong> pacientes
          </span>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="text-sky-600 hover:underline font-semibold"
            >
              Limpar busca
            </button>
          )}
        </div>

        {filteredPatients.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Nenhum paciente encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-6">Prontuário</th>
                  <th className="py-3 px-6">Nome do Paciente</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Ala & Leito</th>
                  <th className="py-3 px-6">Idade</th>
                  <th className="py-3 px-6">Data de Admissão</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPatients.map(p => {
                  const isAlta = isPatientAlta(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-sky-800 text-sm">
                        {p.prontuario || "—"}
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{p.nome}</div>
                        {p.observacoes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm" title={p.observacoes}>
                            {p.observacoes}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {isAlta ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                            <History className="w-3 h-3 text-slate-500" />
                            Alta Hospitalar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Internado
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">{p.alaNome || "Sem Ala"}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Bed className="w-3 h-3 text-slate-400" />
                          Leito: {p.leito || "S/N"}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {p.idade ? `${p.idade} anos` : "—"}
                      </td>

                      <td className="py-4 px-6 text-slate-500">
                        {p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                        {isAlta && p.dataAlta && (
                          <div className="text-[10px] text-rose-500 font-semibold">
                            Alta em {format(new Date(p.dataAlta), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditPatient(p)}
                          className="h-8 text-xs font-semibold text-slate-700 hover:text-sky-600 hover:bg-sky-50"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>

                        {isAlta && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReinternar(p)}
                            className="h-8 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Reinternar
                          </Button>
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
    </div>
  );
}
