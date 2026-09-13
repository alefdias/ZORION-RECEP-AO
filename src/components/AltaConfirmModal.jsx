import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogOut, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PacienteService } from "@/api/db";

export function AltaConfirmModal({ open, onOpenChange, patient, onConfirmed }) {
  const [motivo, setMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!patient) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await PacienteService.darAlta(patient.id, motivo);
      toast.success(`Alta registrada para ${patient.nome}!`);
      onOpenChange(false);
      setMotivo("");
      if (onConfirmed) onConfirmed();
    } catch (e) {
      toast.error("Erro ao registrar alta: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Confirmar Alta Hospitalar</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                O paciente será marcado como Alta e o leito será liberado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
            <p><strong>Paciente:</strong> {patient.nome}</p>
            <p><strong>Prontuário:</strong> {patient.prontuario || "Não informado"}</p>
            <p><strong>Localização:</strong> {patient.alaNome || "Sem Ala"} — Leito: {patient.leito || "S/N"}</p>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Observações da Alta (opcional)</Label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Alta médica concedida pelo Dr. Silva, acompanhante orientado..."
              className="w-full mt-1 p-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isSubmitting ? "Registrando..." : "Confirmar Alta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
