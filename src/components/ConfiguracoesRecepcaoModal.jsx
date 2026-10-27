import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Save, 
  Shield, 
  Building2 
} from "lucide-react";
import { UsuarioService } from "@/api/db";
import { toast } from "sonner";

export function ConfiguracoesRecepcaoModal({ open, onOpenChange, currentUser, onUserUpdated }) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");

  useEffect(() => {
    if (open && currentUser?.id) {
      setNome(currentUser.nome || "");
      setEmail(currentUser.email || "");
      setTelefone(currentUser.telefone || "");
      setNovaSenha("");
      setConfirmaSenha("");

      UsuarioService.get(currentUser.id).then((u) => {
        if (u) {
          setNome(u.nome || "");
          setEmail(u.email || "");
          setTelefone(u.telefone || "");
        }
      });
    }
  }, [open, currentUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (novaSenha && novaSenha !== confirmaSenha) {
      toast.error("A nova senha e a confirmação de senha não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const updatePayload = {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        senha: novaSenha || null
      };

      const updated = await UsuarioService.updateProfile(currentUser.id, updatePayload);
      if (updated) {
        const fullUser = { ...currentUser, ...updated };
        sessionStorage.setItem("zorion_recepcao_user", JSON.stringify(fullUser));
        if (onUserUpdated) onUserUpdated(fullUser);
      }

      toast.success("Dados do perfil atualizados com sucesso!");
      setNovaSenha("");
      setConfirmaSenha("");
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao salvar alterações no perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white dark:bg-slate-950">
        <div className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-white leading-tight">
                Meu Perfil & Configurações
              </DialogTitle>
              <p className="text-xs text-sky-100 mt-0.5">
                Atualize seus dados pessoais e senha de acesso à Recepção
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nome Completo
            </Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="pl-9 h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                E-mail de Contato
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recepcao@hospital.com.br"
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Telefone / Celular
              </Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Usuário / Login
              </Label>
              <Input
                value={currentUser?.login || "—"}
                disabled
                className="h-9 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cargo / Perfil
              </Label>
              <Input
                value={currentUser?.cargo || currentUser?.perfil || "Recepção / Portaria"}
                disabled
                className="h-9 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed capitalize"
              />
            </div>
          </div>

          {/* Alteração de Senha */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Lock className="w-3.5 h-3.5 text-sky-600" />
              Alterar Senha de Acesso
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Nova Senha</Label>
                <Input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Deixe em branco p/ manter"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Confirmar Senha</Label>
                <Input
                  type="password"
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold h-9 rounded-xl cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 px-5 rounded-xl gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
