import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserCheck, Clock, CreditCard, FileText, User, Bed, Search, Building2, Calendar, Sparkles } from "lucide-react";
import { VisitaService } from "@/api/db";

export function VisitaModal({ open, onOpenChange, activePatients = [], currentUser = null, onSaved }) {
  const [pacienteSearch, setPacienteSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visitanteNome, setVisitanteNome] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("RG"); // 'RG' | 'CPF'
  const [documentoNumero, setDocumentoNumero] = useState("");
  const [parentesco, setParentesco] = useState("Familiar");
  const [dataEntrada, setDataEntrada] = useState("");
  const [horaEntrada, setHoraEntrada] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formatação inicial de data e hora atual (seguro, sem travamento de tela)
  const getTodayFormatted = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  };

  const getTimeFormatted = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const handleSetAgora = () => {
    setDataEntrada(getTodayFormatted());
    setHoraEntrada(getTimeFormatted());
  };

  // Reset ao abrir modal
  useEffect(() => {
    if (open) {
      setPacienteSearch("");
      setSelectedPatient(null);
      setVisitanteNome("");
      setTipoDocumento("RG");
      setDocumentoNumero("");
      setParentesco("Familiar");
      setDataEntrada(getTodayFormatted());
      setHoraEntrada(getTimeFormatted());
      setObservacoes("");
      setIsSubmitting(false);
    }
  }, [open]);

  // Filtra pacientes ativos
  const filteredPatients = useMemo(() => {
    if (!pacienteSearch.trim()) return activePatients.slice(0, 15);
    const s = pacienteSearch.toLowerCase();
    return activePatients.filter(p =>
      (p.nome && p.nome.toLowerCase().includes(s)) ||
      (p.prontuario && p.prontuario.toLowerCase().includes(s)) ||
      (p.alaNome && p.alaNome.toLowerCase().includes(s)) ||
      (p.leito && p.leito.toLowerCase().includes(s))
    ).slice(0, 15);
  }, [activePatients, pacienteSearch]);

  // Formatação de documento (máscara automática para CPF)
  const handleDocChange = (val) => {
    if (tipoDocumento === "CPF") {
      const digits = val.replace(/\D/g, "").slice(0, 11);
      let formatted = digits;
      if (digits.length > 9) {
        formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
      } else if (digits.length > 6) {
        formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      } else if (digits.length > 3) {
        formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
      }
      setDocumentoNumero(formatted);
    } else {
      setDocumentoNumero(val.toUpperCase());
    }
  };

  const handleTipoDocChange = (tipo) => {
    setTipoDocumento(tipo);
    setDocumentoNumero("");
  };

  // Máscara de data DD/MM/AAAA
  const handleDataChange = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setDataEntrada(formatted);
  };

  // Máscara de horário HH:mm
  const handleHoraChange = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    setHoraEntrada(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error("Selecione o paciente que será visitado.");
      return;
    }

    if (!visitanteNome.trim()) {
      toast.error("Informe o nome completo do visitante.");
      return;
    }

    if (!documentoNumero.trim()) {
      toast.error(`Informe o número do documento (${tipoDocumento}).`);
      return;
    }

    if (tipoDocumento === "CPF" && documentoNumero.replace(/\D/g, "").length !== 11) {
      toast.error("O CPF deve conter 11 dígitos.");
      return;
    }

    if (!dataEntrada || dataEntrada.length < 10) {
      toast.error("Informe a data de entrada no formato DD/MM/AAAA.");
      return;
    }

    if (!horaEntrada || horaEntrada.length < 4) {
      toast.error("Informe o horário de entrada no formato HH:mm.");
      return;
    }

    // Montar ISO seguro a partir de DD/MM/AAAA e HH:mm
    let finalIso = new Date().toISOString();
    try {
      const [dia, mes, ano] = dataEntrada.split("/").map(Number);
      const [hora, minuto] = horaEntrada.split(":").map(Number);
      const dateObj = new Date(ano, mes - 1, dia, hora || 0, minuto || 0);
      if (!isNaN(dateObj.getTime())) {
        finalIso = dateObj.toISOString();
      }
    } catch {
      finalIso = new Date().toISOString();
    }

    setIsSubmitting(true);
    try {
      await VisitaService.create({
        pacienteId: selectedPatient.id,
        pacienteNome: selectedPatient.nome,
        prontuario: selectedPatient.prontuario || "",
        alaNome: selectedPatient.alaNome || "",
        leito: selectedPatient.leito || "",
        visitanteNome: visitanteNome.trim(),
        tipoDocumento,
        documentoNumero: documentoNumero.trim(),
        parentesco: parentesco.trim(),
        dataHoraEntrada: finalIso,
        observacoes: observacoes.trim(),
        recepcionista: currentUser?.nome || "Recepção",
      });

      toast.success(`Visita registrada com sucesso para ${selectedPatient.nome}!`);
      if (onSaved) onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao registrar visita:", err);
      toast.error("Falha ao registrar visita. Verifique a conexão com o banco.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Registrar Nova Visita</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre a entrada do visitante com documento e paciente internado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Seção 1: Seleção do Paciente */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-sky-600" />
              Paciente a ser visitado *
            </Label>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-sky-50/80 border border-sky-200 rounded-xl">
                <div>
                  <div className="font-bold text-sm text-sky-950">{selectedPatient.nome}</div>
                  <div className="text-xs text-sky-700 flex items-center gap-2 mt-0.5">
                    <span>Pront: <strong>{selectedPatient.prontuario || "S/N"}</strong></span>
                    <span>•</span>
                    <span>Ala: <strong>{selectedPatient.alaNome || "Geral"}</strong></span>
                    <span>•</span>
                    <span>Leito: <strong>{selectedPatient.leito || "S/N"}</strong></span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs h-7 px-2.5 text-slate-600 hover:text-red-600 cursor-pointer"
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Buscar paciente por nome, prontuário ou leito..."
                    value={pacienteSearch}
                    onChange={(e) => setPacienteSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                  {filteredPatients.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Nenhum paciente internado ativo encontrado.
                    </div>
                  ) : (
                    filteredPatients.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className="w-full text-left p-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-800 group-hover:text-sky-700">
                            {p.nome}
                          </div>
                          <div className="text-[11px] text-slate-500 flex gap-2 mt-0.5">
                            <span>Pront: {p.prontuario || "S/N"}</span>
                            <span>Ala: {p.alaNome || "Geral"}</span>
                            <span>Leito: {p.leito || "S/N"}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-sky-600 bg-sky-100 px-2 py-0.5 rounded group-hover:bg-sky-200">
                          Selecionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: Dados do Visitante */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Nome Completo do Visitante *
              </Label>
              <Input
                type="text"
                placeholder="Ex: Carlos Alberto da Silva"
                value={visitanteNome}
                onChange={(e) => setVisitanteNome(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>

            {/* Documento: Escolha entre RG ou CPF */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  Documento de Identificação *
                </span>
                <span className="text-[11px] text-slate-500">Escolha o tipo:</span>
              </Label>

              <div className="grid grid-cols-12 gap-2">
                {/* Seletor RG ou CPF */}
                <div className="col-span-4 flex rounded-xl border border-slate-200 p-1 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => handleTipoDocChange("RG")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tipoDocumento === "RG"
                        ? "bg-white text-sky-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    RG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoDocChange("CPF")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tipoDocumento === "CPF"
                        ? "bg-white text-sky-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    CPF
                  </button>
                </div>

                {/* Input do Documento */}
                <div className="col-span-8">
                  <Input
                    type="text"
                    placeholder={tipoDocumento === "CPF" ? "000.000.000-00" : "Número do RG"}
                    value={documentoNumero}
                    onChange={(e) => handleDocChange(e.target.value)}
                    className="h-10 text-sm font-mono tracking-wide"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Parentesco e Horário de Entrada (Separado para nunca travar a tela) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Grau de Parentesco / Relação
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Mãe, Filho(a), Cônjuge"
                  value={parentesco}
                  onChange={(e) => setParentesco(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              {/* Data de Entrada */}
              <div className="sm:col-span-4">
                <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Data Entrada *
                  </span>
                </Label>
                <Input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dataEntrada}
                  onChange={(e) => handleDataChange(e.target.value)}
                  className="h-10 text-sm font-mono"
                  required
                />
              </div>

              {/* Hora de Entrada + Botão Agora */}
              <div className="sm:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Hora *
                  </Label>
                  <button
                    type="button"
                    onClick={handleSetAgora}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer flex items-center gap-0.5"
                    title="Preencher com data e hora atuais"
                  >
                    <Sparkles className="w-3 h-3" />
                    Agora
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="HH:mm"
                  value={horaEntrada}
                  onChange={(e) => handleHoraChange(e.target.value)}
                  className="h-10 text-sm font-mono"
                  required
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Observações / Pertences (Opcional)
              </Label>
              <Input
                type="text"
                placeholder="Ex: Acompanhante noturno, autorização da enfermagem..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Rodapé / Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 px-5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Registrando...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Cadastrar Entrada</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
