import React, { useState, useEffect, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  User, 
  Calendar, 
  Building2, 
  FileText, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Stethoscope,
  PlusCircle,
  UserCheck,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { AtendimentoRecepcaoService } from "@/api/db";

export function AtendimentoModal({
  open,
  onOpenChange,
  atendimento = null,
  patients = [],
  alas = [],
  currentUser = null,
  onNewPatient = null,
  onSaved
}) {
  const [formData, setFormData] = useState({
    pacienteId: "",
    pacienteNome: "",
    prontuario: "",
    dataAdmissao: "",
    horarioEntrada: "",
    horarioAvisoEquipe: "",
    horarioEntradaConsultorio: "",
    horarioSaidaConsultorio: "",
    motivo: "Admissão",
    alaDestinoId: "",
    alaDestinoNome: "",
    observacoes: ""
  });

  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa o formulário com dados atuais ou do atendimento em edição
  useEffect(() => {
    if (!open) return;

    const agora = new Date();
    const hojeStr = agora.toISOString().split("T")[0];
    const horaAtual = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setPatientSearch("");

    if (atendimento) {
      setFormData({
        pacienteId: atendimento.pacienteId || "",
        pacienteNome: atendimento.pacienteNome || "",
        prontuario: atendimento.prontuario || "",
        dataAdmissao: atendimento.dataAdmissao || hojeStr,
        horarioEntrada: atendimento.horarioEntrada || horaAtual,
        horarioAvisoEquipe: atendimento.horarioAvisoEquipe || "",
        horarioEntradaConsultorio: atendimento.horarioEntradaConsultorio || "",
        horarioSaidaConsultorio: atendimento.horarioSaidaConsultorio || "",
        motivo: atendimento.motivo || "Admissão",
        alaDestinoId: atendimento.alaDestinoId || "",
        alaDestinoNome: atendimento.alaDestinoNome || "",
        observacoes: atendimento.observacoes || ""
      });

      const pac = patients.find(p => String(p.id) === String(atendimento.pacienteId));
      if (pac) {
        setSelectedPatient(pac);
      } else {
        setSelectedPatient({
          id: atendimento.pacienteId,
          nome: atendimento.pacienteNome,
          prontuario: atendimento.prontuario,
          alaNome: atendimento.alaDestinoNome
        });
      }
    } else {
      setSelectedPatient(null);
      setFormData({
        pacienteId: "",
        pacienteNome: "",
        prontuario: "",
        dataAdmissao: hojeStr,
        horarioEntrada: horaAtual,
        horarioAvisoEquipe: "",
        horarioEntradaConsultorio: "",
        horarioSaidaConsultorio: "",
        motivo: "Admissão",
        alaDestinoId: "",
        alaDestinoNome: "",
        observacoes: ""
      });
    }
  }, [open, atendimento, patients]);

  // Filtra pacientes cadastrados no banco de dados pela busca
  const filteredPatients = useMemo(() => {
    if (!patients || patients.length === 0) return [];
    if (!patientSearch.trim()) return patients.slice(0, 15); // Primeiros 15 para navegação rápida
    const term = patientSearch.trim().toLowerCase();
    return patients.filter(p => {
      const nome = (p.nome || "").toLowerCase().includes(term);
      const pront = (p.prontuario || "").toLowerCase().includes(term);
      const ala = (p.alaNome || "").toLowerCase().includes(term);
      return nome || pront || ala;
    }).slice(0, 20);
  }, [patients, patientSearch]);

  // Ao selecionar um paciente do banco
  const handleSelectPatient = (pac) => {
    setSelectedPatient(pac);
    setFormData(prev => ({
      ...prev,
      pacienteId: pac.id,
      pacienteNome: pac.nome,
      prontuario: pac.prontuario || "",
      alaDestinoId: pac.alaId || prev.alaDestinoId || "",
      alaDestinoNome: pac.alaNome || prev.alaDestinoNome || ""
    }));
  };

  // Desfazer seleção para buscar outro paciente
  const handleClearPatient = () => {
    setSelectedPatient(null);
    setFormData(prev => ({
      ...prev,
      pacienteId: "",
      pacienteNome: "",
      prontuario: ""
    }));
  };

  // Helper rápido para carimbar "Agora" no horário
  const setHoraAgora = (campo) => {
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setFormData(prev => ({ ...prev, [campo]: hora }));
  };

  // Cálculos dinâmicos em tela
  const tempoEsperaCalc = AtendimentoRecepcaoService.calcularDiferenca(
    formData.horarioEntrada, 
    formData.horarioEntradaConsultorio
  );
  const tempoConsultorioCalc = AtendimentoRecepcaoService.calcularDiferenca(
    formData.horarioEntradaConsultorio, 
    formData.horarioSaidaConsultorio
  );
  const tempoTotalCalc = AtendimentoRecepcaoService.calcularDiferenca(
    formData.horarioEntrada, 
    formData.horarioSaidaConsultorio
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pacienteId || !formData.pacienteNome) {
      toast.error("Selecione um paciente cadastrado no banco de dados para prosseguir.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (atendimento?.id) {
        await AtendimentoRecepcaoService.update(atendimento.id, {
          ...formData,
          recepcionista: currentUser?.nome || "Recepção"
        });
        toast.success("Atendimento atualizado com sucesso!");
      } else {
        await AtendimentoRecepcaoService.create({
          ...formData,
          recepcionista: currentUser?.nome || "Recepção"
        });
        toast.success("Atendimento registrado com sucesso!");
      }

      if (onSaved) onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar atendimento: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCadastrarNovoPaciente = () => {
    onOpenChange(false);
    if (onNewPatient) {
      setTimeout(() => {
        onNewPatient();
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <DialogHeader className="bg-gradient-to-r from-sky-700 to-cyan-700 p-5 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {atendimento ? "Editar Atendimento de Recepção" : "Novo Atendimento / Admissão"}
              </DialogTitle>
              <p className="text-xs text-sky-100">
                Registro de fluxo de entrada e consultório para paciente cadastrado
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1. SELEÇÃO DO PACIENTE (EXCLUSIVAMENTE DO BANCO DE DADOS) */}
          <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-600" />
                Paciente Cadastrado no Banco de Dados <span className="text-red-500">*</span>
              </Label>
              {selectedPatient && !atendimento && (
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Trocar Paciente
                </button>
              )}
            </div>

            {selectedPatient ? (
              /* CARD DO PACIENTE SELECIONADO (DADOS FIXOS DO BANCO) */
              <div className="p-3.5 rounded-xl bg-white border border-sky-200 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedPatient.nome ? selectedPatient.nome.charAt(0).toUpperCase() : "P"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {selectedPatient.nome}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 border-slate-300 text-slate-700">
                        Prontuário: {selectedPatient.prontuario || "S/ Prontuário"}
                      </Badge>
                      {selectedPatient.alaNome && (
                        <Badge variant="outline" className="text-[10px] bg-indigo-50 border-indigo-200 text-indigo-700">
                          Ala: {selectedPatient.alaNome}
                        </Badge>
                      )}
                      {selectedPatient.leito && (
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Leito: {selectedPatient.leito}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-emerald-600 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Confirmado</span>
                </div>
              </div>
            ) : (
              /* CAMPO DE BUSCA E SELEÇÃO DE PACIENTES CADASTRADOS */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Digite o nome ou prontuário do paciente cadastrado..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white border-slate-300"
                    autoFocus
                  />
                </div>

                {/* Lista de pacientes filtrados do banco */}
                <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-inner">
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Nenhum paciente cadastrado encontrado com esse termo.
                    </div>
                  ) : (
                    filteredPatients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPatient(p)}
                        className="w-full text-left p-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-xs truncate group-hover:text-sky-700">
                            {p.nome}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Prontuário: <b>{p.prontuario || "Não informado"}</b>
                            {p.alaNome ? ` • Ala: ${p.alaNome}` : ""}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 group-hover:bg-sky-100 px-2 py-0.5 rounded-lg shrink-0">
                          Selecionar ➔
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Botão de aviso se o paciente ainda não estiver cadastrado */}
                <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px] text-slate-400">
                    O paciente não está na lista?
                  </span>
                  <button
                    type="button"
                    onClick={handleCadastrarNovoPaciente}
                    className="text-[11px] text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Cadastrar Paciente Primeiro
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. DATAS E HORÁRIOS AUTOMÁTICOS */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Linha do Tempo de Atendimento
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Data Admissão (Automática) */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Data de Admissão:
                </Label>
                <Input
                  type="date"
                  required
                  value={formData.dataAdmissao}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataAdmissao: e.target.value }))}
                  className="h-9 text-xs bg-white border-slate-300 font-medium"
                />
              </div>

              {/* Horário de Entrada (Automático) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[11px] font-semibold text-slate-500">
                    Horário de Entrada (Recepção):
                  </Label>
                  <button
                    type="button"
                    onClick={() => setHoraAgora("horarioEntrada")}
                    className="text-[10px] text-sky-600 hover:text-sky-800 font-bold cursor-pointer"
                  >
                    ⏱️ Agora
                  </button>
                </div>
                <Input
                  type="time"
                  required
                  value={formData.horarioEntrada}
                  onChange={(e) => setFormData(prev => ({ ...prev, horarioEntrada: e.target.value }))}
                  className="h-9 text-xs bg-white border-slate-300 font-mono font-bold text-sky-800"
                />
              </div>

              {/* Horário de Aviso da Equipe */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[11px] font-semibold text-slate-500">
                    Horário de Aviso da Equipe:
                  </Label>
                  <button
                    type="button"
                    onClick={() => setHoraAgora("horarioAvisoEquipe")}
                    className="text-[10px] text-sky-600 hover:text-sky-800 font-bold cursor-pointer"
                  >
                    ⏱️ Agora
                  </button>
                </div>
                <Input
                  type="time"
                  value={formData.horarioAvisoEquipe}
                  onChange={(e) => setFormData(prev => ({ ...prev, horarioAvisoEquipe: e.target.value }))}
                  className="h-9 text-xs bg-white border-slate-300 font-mono"
                />
              </div>

              {/* Horário Entrada Consultório */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[11px] font-semibold text-slate-500">
                    Entrada Consultório:
                  </Label>
                  <button
                    type="button"
                    onClick={() => setHoraAgora("horarioEntradaConsultorio")}
                    className="text-[10px] text-sky-600 hover:text-sky-800 font-bold cursor-pointer"
                  >
                    ⏱️ Agora
                  </button>
                </div>
                <Input
                  type="time"
                  value={formData.horarioEntradaConsultorio}
                  onChange={(e) => setFormData(prev => ({ ...prev, horarioEntradaConsultorio: e.target.value }))}
                  className="h-9 text-xs bg-white border-slate-300 font-mono"
                />
              </div>

              {/* Horário Saída Consultório */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[11px] font-semibold text-slate-500">
                    Saída Consultório (Término):
                  </Label>
                  <button
                    type="button"
                    onClick={() => setHoraAgora("horarioSaidaConsultorio")}
                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer"
                  >
                    ⏱️ Agora
                  </button>
                </div>
                <Input
                  type="time"
                  value={formData.horarioSaidaConsultorio}
                  onChange={(e) => setFormData(prev => ({ ...prev, horarioSaidaConsultorio: e.target.value }))}
                  className="h-9 text-xs bg-white border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Painel de Cálculo em Tempo Real */}
            {(tempoEsperaCalc || tempoConsultorioCalc || tempoTotalCalc) && (
              <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 text-xs">
                {tempoEsperaCalc && (
                  <Badge variant="outline" className="bg-white border-sky-200 text-sky-700 font-semibold text-[11px]">
                    ⏳ Espera: {tempoEsperaCalc}
                  </Badge>
                )}
                {tempoConsultorioCalc && (
                  <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-700 font-semibold text-[11px]">
                    🩺 Consulta: {tempoConsultorioCalc}
                  </Badge>
                )}
                {tempoTotalCalc && (
                  <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
                    ⏱️ Tempo Total: {tempoTotalCalc}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* 3. MOTIVO (ALTA OU ADMISSÃO) & ALA QUE PACIENTE VAI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                Motivo / Desfecho:
              </Label>
              <Select
                value={formData.motivo}
                onValueChange={(val) => setFormData(prev => ({ ...prev, motivo: val }))}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-300 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admissão">🏥 Admissão / Internação</SelectItem>
                  <SelectItem value="Alta">✅ Alta / Liberado</SelectItem>
                  <SelectItem value="Observação">👁️ Observação</SelectItem>
                  <SelectItem value="Transferência">🔄 Transferência</SelectItem>
                  <SelectItem value="Consulta">🩺 Apenas Consulta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                Ala que Paciente Vai:
              </Label>
              <Select
                value={formData.alaDestinoId || "nenhuma"}
                onValueChange={(val) => {
                  if (val === "nenhuma") {
                    setFormData(prev => ({ ...prev, alaDestinoId: "", alaDestinoNome: "" }));
                  } else {
                    const ala = alas.find(a => String(a.id) === String(val));
                    setFormData(prev => ({
                      ...prev,
                      alaDestinoId: val,
                      alaDestinoNome: ala?.nome || ""
                    }));
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-300 font-semibold">
                  <SelectValue placeholder="Selecione a ala de destino..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma (Alta / Não internado)</SelectItem>
                  {alas.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              Observações / Encaminhamentos:
            </Label>
            <Textarea
              rows={2}
              placeholder="Ex: Queixa principal, acompanhante, encaminhamentos médicos..."
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              className="text-xs bg-white border-slate-300 resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.pacienteId}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : (atendimento ? "Salvar Alterações" : "Registrar Atendimento")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
