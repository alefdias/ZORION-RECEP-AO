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
  AlertCircle,
  UserPlus
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
    motivo: "Consulta",
    alaDestinoId: "",
    alaDestinoNome: "",
    observacoes: ""
  });

  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Modo: "banco" = selecionar do banco | "externo" = paciente externo (ainda não cadastrado)
  const [modoEntrada, setModoEntrada] = useState("banco");

  // Inicializa o formulário com dados atuais ou do atendimento em edição
  useEffect(() => {
    if (!open) return;

    const agora = new Date();
    const hojeStr = agora.toISOString().split("T")[0];
    const horaAtual = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setPatientSearch("");
    setModoEntrada("banco");

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
        motivo: atendimento.motivo || "Consulta",
        alaDestinoId: atendimento.alaDestinoId || "",
        alaDestinoNome: atendimento.alaDestinoNome || "",
        observacoes: atendimento.observacoes || ""
      });

      const pac = patients?.find(p => String(p.id) === String(atendimento.pacienteId));
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
        motivo: "Consulta",
        alaDestinoId: "",
        alaDestinoNome: "",
        observacoes: ""
      });
    }
  }, [open, atendimento]);

  // Filtra pacientes cadastrados no banco de dados pela busca
  const filteredPatients = useMemo(() => {
    if (!patients || patients.length === 0) return [];
    if (!patientSearch.trim()) return patients.slice(0, 15);
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

    // Permite salvar: paciente do banco OU paciente externo (nome digitado manualmente)
    if (!formData.pacienteNome || !formData.pacienteNome.trim()) {
      toast.error("Informe o nome do paciente para prosseguir.");
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
      <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <DialogHeader className="shrink-0 bg-gradient-to-r from-sky-700 to-cyan-700 px-5 py-3.5 text-white pr-12">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                {atendimento ? "Editar Atendimento de Recepção" : "Novo Atendimento / Admissão"}
              </DialogTitle>
              <p className="text-[11px] text-sky-100">
                Registro de acolhimento e consultório para paciente cadastrado
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. SELEÇÃO DO PACIENTE */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-600" />
                Paciente <span className="text-red-500">*</span>
              </Label>

              {/* Toggle: banco vs externo */}
              {!atendimento && (
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => { setModoEntrada("banco"); setSelectedPatient(null); setFormData(prev => ({ ...prev, pacienteId: "", pacienteNome: "", prontuario: "" })); }}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${modoEntrada === "banco" ? "bg-white text-sky-700 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    🔍 Buscar no Banco
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModoEntrada("externo"); setSelectedPatient(null); setFormData(prev => ({ ...prev, pacienteId: "", pacienteNome: "", prontuario: "" })); }}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${modoEntrada === "externo" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    👤 Paciente Externo
                  </button>
                </div>
              )}
            </div>

            {modoEntrada === "externo" && !atendimento ? (
              /* MODO EXTERNO: paciente que ainda não existe no sistema */
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Paciente ainda não cadastrado no hospital. Poderá ser admitido ou não após a consulta.</span>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Nome Completo:</Label>
                  <Input
                    type="text"
                    placeholder="Nome completo do paciente..."
                    value={formData.pacienteNome}
                    onChange={(e) => setFormData(prev => ({ ...prev, pacienteNome: e.target.value }))}
                    className="h-9 text-xs bg-white border-slate-300"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Prontuário (se houver):</Label>
                  <Input
                    type="text"
                    placeholder="Número do prontuário (opcional)..."
                    value={formData.prontuario}
                    onChange={(e) => setFormData(prev => ({ ...prev, prontuario: e.target.value }))}
                    className="h-9 text-xs bg-white border-slate-300 font-mono"
                  />
                </div>
              </div>
            ) : selectedPatient ? (
              /* CARD DO PACIENTE SELECIONADO */
              <div className="p-3 rounded-xl bg-white border border-sky-200 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {selectedPatient.nome ? selectedPatient.nome.charAt(0).toUpperCase() : "P"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm truncate" title={selectedPatient.nome}>
                        {selectedPatient.nome}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Confirmado
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="font-mono text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                        Pront: <b>{selectedPatient.prontuario || "S/ Prontuário"}</b>
                      </span>
                      {selectedPatient.alaNome && (
                        <span className="text-[11px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md">
                          Ala: {selectedPatient.alaNome}
                        </span>
                      )}
                      {selectedPatient.leito && (
                        <span className="text-[11px] text-slate-600 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          Leito: {selectedPatient.leito}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!atendimento && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearPatient}
                    className="shrink-0 h-8 px-2.5 text-xs text-slate-600 hover:text-sky-700 hover:border-sky-300 font-semibold cursor-pointer bg-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Trocar
                  </Button>
                )}
              </div>
            ) : (
              /* CAMPO DE BUSCA E SELEÇÃO DE PACIENTES CADASTRADOS */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome, prontuário ou ala..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white border-slate-300 focus-visible:ring-sky-500"
                    autoFocus
                  />
                </div>

                {/* Lista de pacientes filtrados do banco */}
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-inner">
                  {filteredPatients.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Nenhum paciente cadastrado encontrado com esse termo.
                    </div>
                  ) : (
                    filteredPatients.map(p => (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectPatient(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectPatient(p);
                          }
                        }}
                        className="w-full text-left p-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 text-xs truncate group-hover:text-sky-700">
                            {p.nome}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-mono">Pront: <b>{p.prontuario || "Não informado"}</b></span>
                            {p.alaNome && (
                              <>
                                <span>•</span>
                                <span>Ala: <b>{p.alaNome}</b></span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-100 group-hover:bg-sky-600 group-hover:text-white px-2 py-0.5 rounded-lg shrink-0 transition-colors">
                          Selecionar ➔
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Botão de aviso se o paciente ainda não estiver cadastrado */}
                <div className="pt-0.5 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px] text-slate-400">
                    O paciente não está cadastrado?
                  </span>
                  <button
                    type="button"
                    onClick={handleCadastrarNovoPaciente}
                    className="text-[11px] text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Cadastrar Paciente Primeiro
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. DATAS E HORÁRIOS */}
          <div className="space-y-2.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Linha do Tempo de Atendimento
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Data Admissão */}
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

              {/* Horário de Entrada (Recepção) */}
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
              <div className="flex items-center gap-2 flex-wrap p-2 rounded-xl bg-sky-50/70 border border-sky-100 text-xs">
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

          {/* 3. MOTIVO & ALA DE DESTINO */}
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

          {/* 4. Observações */}
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

          <DialogFooter className="shrink-0 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
              disabled={isSubmitting || !formData.pacienteNome?.trim()}
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
