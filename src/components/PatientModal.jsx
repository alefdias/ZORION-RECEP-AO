import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, UserCheck, AlertTriangle, AlertCircle, History, RotateCcw, Bed, Building2, User, FileText } from "lucide-react";
import { PacienteService } from "@/api/db";
import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";

export function PatientModal({ open, onOpenChange, patient = null, alas = [], allPatients = [], onSaved }) {
  const isEditing = Boolean(patient?.id);

  const [formData, setFormData] = useState({
    foto: "",
    nome: "",
    prontuario: "",
    idade: "",
    alaId: "",
    alaNome: "",
    leito: "",
    observacoes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa dados do formulário quando modal abre
  useEffect(() => {
    if (patient) {
      setFormData({
        foto: patient.foto || "",
        nome: patient.nome || "",
        prontuario: patient.prontuario || "",
        idade: patient.idade ? String(patient.idade) : "",
        alaId: patient.alaId || "",
        alaNome: patient.alaNome || "",
        leito: patient.leito || "",
        observacoes: patient.observacoes || "",
      });
    } else {
      setFormData({
        foto: "",
        nome: "",
        prontuario: "",
        idade: "",
        alaId: alas[0]?.id || "",
        alaNome: alas[0]?.nome || "",
        leito: "",
        observacoes: "",
      });
    }
  }, [patient, open, alas]);

  // Atualiza alaNome automaticamente quando alaId muda
  const handleAlaChange = (alaId) => {
    const selectedAla = alas.find(a => a.id === alaId);
    setFormData(prev => ({
      ...prev,
      alaId,
      alaNome: selectedAla ? selectedAla.nome : "",
    }));
  };

  // Checagem em tempo real do prontuário
  const prontuarioCheck = useMemo(() => {
    const pTrim = (formData.prontuario || "").trim();
    if (!pTrim) return { duplicateActive: null, dischargedPatient: null };

    const others = allPatients.filter(p => !patient || p.id !== patient.id);
    const isPatientAlta = (p) => String(p.status || "").trim().toLowerCase() === "alta" || p.ativo === false;
    const duplicateActive = others.find(
      p => (p.prontuario || "").trim().toLowerCase() === pTrim.toLowerCase() && !isPatientAlta(p)
    );
    const dischargedPatient = others.find(
      p => (p.prontuario || "").trim().toLowerCase() === pTrim.toLowerCase() && isPatientAlta(p)
    );

    return { duplicateActive, dischargedPatient };
  }, [formData.prontuario, allPatients, patient]);

  // Ação de restaurar paciente de alta
  const handleRestaurarPacienteAlta = (discharged) => {
    setFormData(prev => ({
      ...prev,
      nome: discharged.nome || prev.nome,
      idade: discharged.idade ? String(discharged.idade) : prev.idade,
      observacoes: discharged.observacoes || prev.observacoes,
      // O usuário pode manter ou trocar de leito/ala
      alaId: prev.alaId || discharged.alaId || (alas[0]?.id || ""),
      alaNome: prev.alaNome || discharged.alaNome || (alas[0]?.nome || ""),
      leito: prev.leito || discharged.leito || "",
    }));

    toast.info("Dados do paciente restaurados!", {
      description: "Defina a Ala e o Leito para confirmar a reinternação."
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("O nome do paciente é obrigatório.");
      return;
    }

    if (!formData.prontuario.trim()) {
      toast.error("O número do prontuário é obrigatório.");
      return;
    }

    if (prontuarioCheck.duplicateActive) {
      toast.error("Prontuário já cadastrado para um paciente ativo no hospital!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await PacienteService.update(patient.id, formData);
        toast.success("Paciente atualizado com sucesso!");
      } else {
        // Se estiver restaurando paciente com alta com o mesmo prontuário
        if (prontuarioCheck.dischargedPatient) {
          await PacienteService.reinternar(prontuarioCheck.dischargedPatient.id, {
            nome: formData.nome || prontuarioCheck.dischargedPatient.nome,
            alaId: formData.alaId,
            alaNome: formData.alaNome,
            leito: formData.leito,
            observacoes: formData.observacoes,
            foto: formData.foto,
          });
          // Se o nome foi editado, atualiza também
          if (formData.nome !== prontuarioCheck.dischargedPatient.nome || formData.idade || formData.foto) {
            await PacienteService.update(prontuarioCheck.dischargedPatient.id, formData);
          }
          toast.success("Paciente reinternado com sucesso!");
        } else {
          await PacienteService.create(formData);
          toast.success("Paciente cadastrado com sucesso!");
        }
      }

      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error("Erro ao salvar paciente: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isEditing ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"}`}>
              {isEditing ? <UserCheck className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isEditing ? "Editar Cadastro de Paciente" : "Admissão de Novo Paciente"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {isEditing 
                  ? "Atualize as informações cadastrais e localização de leito." 
                  : "Cadastre o paciente para internação imediata no hospital."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Captura de Foto do Paciente */}
          <PhotoCaptureField
            value={formData.foto}
            onChange={(foto) => setFormData(prev => ({ ...prev, foto }))}
            label="Foto do Paciente"
            helperText="Tire uma foto pela webcam ou carregue do computador"
          />

          {/* Identificação de Prontuário */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              Número do Prontuário *
            </Label>
            <Input
              value={formData.prontuario}
              onChange={(e) => setFormData(prev => ({ ...prev, prontuario: e.target.value }))}
              placeholder="Ex: 2026-0984 ou PR-1049"
              className="mt-1 font-mono uppercase text-sm font-medium"
              required
            />

            {/* Aviso de duplicidade ativa */}
            {prontuarioCheck.duplicateActive && (
              <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Atenção: Prontuário já ativo!</span>
                  <p className="mt-0.5 text-rose-700">
                    O paciente <strong>{prontuarioCheck.duplicateActive.nome}</strong> já está internado com este prontuário na ala <strong>{prontuarioCheck.duplicateActive.alaNome || "Não inf."}</strong> (Leito: {prontuarioCheck.duplicateActive.leito || "S/N"}).
                  </p>
                </div>
              </div>
            )}

            {/* Aviso de paciente com alta anterior e botão de restauração */}
            {!prontuarioCheck.duplicateActive && prontuarioCheck.dischargedPatient && (
              <div className="mt-2 p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-3 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <History className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Histórico encontrado: Paciente de Alta!</span>
                    <p className="mt-0.5 text-amber-800">
                      O paciente <strong>{prontuarioCheck.dischargedPatient.nome}</strong> já esteve internado com este prontuário e recebeu alta.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestaurarPacienteAlta(prontuarioCheck.dischargedPatient)}
                  className="bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900 font-semibold shrink-0 text-xs gap-1.5 h-8"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar / Reinternar
                </Button>
              </div>
            )}
          </div>

          {/* Nome e Idade */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-600" />
                Nome Completo do Paciente *
              </Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Maria das Graças Oliveira"
                className="mt-1 font-medium text-sm capitalize"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Idade (anos)</Label>
              <Input
                type="number"
                min="0"
                max="130"
                value={formData.idade}
                onChange={(e) => setFormData(prev => ({ ...prev, idade: e.target.value }))}
                placeholder="Ex: 45"
                className="mt-1 text-sm font-medium"
              />
            </div>
          </div>

          {/* Ala e Leito */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                Ala / Setor Hospitalar
              </Label>
              <div className="mt-1">
                <Select value={formData.alaId} onValueChange={handleAlaChange}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Selecione a Ala..." />
                  </SelectTrigger>
                  <SelectContent>
                    {alas.map(ala => (
                      <SelectItem key={ala.id} value={ala.id}>
                        {ala.nome} {ala.leitos ? `(${ala.leitos} leitos)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Bed className="w-3.5 h-3.5 text-sky-600" />
                Leito / Quarto
              </Label>
              <Input
                value={formData.leito}
                onChange={(e) => setFormData(prev => ({ ...prev, leito: e.target.value }))}
                placeholder="Ex: Leito 04 ou Q-201"
                className="mt-1 text-sm font-medium"
              />
            </div>
          </div>

          {/* Observações da Admissão */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Observações da Entrada / Admissão</Label>
            <textarea
              rows={3}
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Informações relevantes da admissão (motivo, acompanhante, médico responsável, etc.)..."
              className="w-full mt-1 p-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>

          {/* Rodapé e Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || Boolean(prontuarioCheck.duplicateActive)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold gap-1.5 px-4"
            >
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Concluir Admissão"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
