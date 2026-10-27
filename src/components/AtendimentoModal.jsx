import React, { useState, useEffect } from "react";
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
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Stethoscope
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa o formulário com dados atuais ou do atendimento em edição
  useEffect(() => {
    if (!open) return;

    const agora = new Date();
    const hojeStr = agora.toISOString().split("T")[0];
    const horaAtual = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

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
    } else {
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
  }, [open, atendimento]);

  // Se o usuário selecionar um paciente da lista
  const handleSelectPatient = (pacId) => {
    if (!pacId || pacId === "outro") {
      setFormData(prev => ({ ...prev, pacienteId: "", prontuario: "" }));
      return;
    }
    const pac = patients.find(p => String(p.id) === String(pacId));
    if (pac) {
      setFormData(prev => ({
        ...prev,
        pacienteId: pac.id,
        pacienteNome: pac.nome,
        prontuario: pac.prontuario || "",
        alaDestinoId: pac.alaId || prev.alaDestinoId,
        alaDestinoNome: pac.alaNome || prev.alaDestinoNome
      }));
    }
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
    if (!formData.pacienteNome.trim()) {
      toast.error("Por favor, informe o nome do paciente.");
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
                Registro de horário de entrada, triagem médica e encaminhamento
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1. SELEÇÃO / DIGITAÇÃO DO PACIENTE */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-600" />
                Identificação do Paciente
              </Label>
              <span className="text-[10px] text-slate-400">
                Selecione um paciente cadastrado ou digite livremente
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Buscar Paciente Cadastrado:
                </Label>
                <Select
                  value={formData.pacienteId || "outro"}
                  onValueChange={handleSelectPatient}
                >
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                    <SelectValue placeholder="Selecione um paciente existente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="outro">✍️ Outro / Digitar Manualmente</SelectItem>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} {p.prontuario ? `(Pront: ${p.prontuario})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Prontuário (Opcional):
                </Label>
                <Input
                  placeholder="Ex: 13999"
                  value={formData.prontuario}
                  onChange={(e) => setFormData(prev => ({ ...prev, prontuario: e.target.value }))}
                  className="h-9 text-xs bg-white border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                Nome Completo do Paciente: <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="Nome completo do paciente..."
                value={formData.pacienteNome}
                onChange={(e) => setFormData(prev => ({ ...prev, pacienteNome: e.target.value }))}
                className="h-9 text-xs bg-white border-slate-300 font-bold text-slate-800"
              />
            </div>
          </div>

          {/* 2. DATAS E HORÁRIOS AUTOMÁTICOS */}
          <div className="space-y-3">
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

          {/* 3. MOTIVO (ALTA OU ADMISSÃO) & DESTINO */}
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
              placeholder="Ex: Queixa principal, acompanhante, observações da triagem..."
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
              disabled={isSubmitting}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 cursor-pointer shadow-sm"
            >
              {isSubmitting ? "Salvando..." : (atendimento ? "Salvar Alterações" : "Registrar Atendimento")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
