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
  Filter,
  User,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  KeyRound,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PacienteService, queryPostgres } from "@/api/db";

export function PacientesList({ 
  patients = [], 
  alas = [], 
  currentUser = null,
  initialStatusFilter = "ativo",
  onNewPatient, 
  onEditPatient, 
  onDarAlta, 
  onReinternar,
  onRefresh
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter); // "ativo" | "alta" | "all"
  const [selectedAla, setSelectedAla] = useState("all");

  // Estados para o Modal de Edição (Nome e Ala)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editForm, setEditForm] = useState({
    nome: "",
    prontuario: "",
    alaId: "",
    alaNome: "",
    leito: ""
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estados para o Modal de Exclusão (com motivo e senha de login)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleteSenha, setDeleteSenha] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenEdit = (p) => {
    setEditingPatient(p);
    setEditForm({
      nome: p.nome || "",
      prontuario: p.prontuario || "",
      alaId: p.alaId || (alas[0]?.id || ""),
      alaNome: p.alaNome || (alas[0]?.nome || ""),
      leito: p.leito || ""
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.nome.trim()) {
      toast.error("O nome do paciente é obrigatório.");
      return;
    }
    setIsSavingEdit(true);
    try {
      const selectedAlaObj = (alas || []).find(a => String(a.id) === String(editForm.alaId));
      await PacienteService.update(editingPatient.id, {
        ...editingPatient,
        nome: editForm.nome.trim(),
        prontuario: editForm.prontuario.trim(),
        alaId: editForm.alaId,
        alaNome: selectedAlaObj ? selectedAlaObj.nome : editForm.alaNome,
        leito: editForm.leito.trim()
      });
      toast.success(`Paciente "${editForm.nome}" atualizado com sucesso!`);
      setEditModalOpen(false);
      setEditingPatient(null);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar paciente: " + (e.message || ""));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenDelete = (p) => {
    setPatientToDelete(p);
    setDeleteMotivo("");
    setDeleteSenha("");
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    if (!deleteMotivo.trim()) {
      toast.error("Por favor, informe o motivo da exclusão do paciente.");
      return;
    }
    if (!deleteSenha.trim()) {
      toast.error("Por favor, digite sua senha de login para confirmar.");
      return;
    }

    setIsDeleting(true);
    try {
      const loggedUser = currentUser || {};
      let authorized = false;

      // 1. Checagem direta pela senha do usuário na sessão
      if (loggedUser.senha && loggedUser.senha === deleteSenha.trim()) {
        authorized = true;
      } else if (loggedUser.password && loggedUser.password === deleteSenha.trim()) {
        authorized = true;
      } else {
        // 2. Checagem de segurança no PostgreSQL
        try {
          const safeUser = (loggedUser.login || loggedUser.username || "").replace(/'/g, "''");
          const safePass = deleteSenha.trim().replace(/'/g, "''");
          const res = await queryPostgres(`SELECT id FROM "Usuario" WHERE ("login" = '${safeUser}' OR "id" = '${loggedUser.id}') AND "senha" = '${safePass}'`);
          if (Array.isArray(res) && res.length > 0) {
            authorized = true;
          }
        } catch (dbErr) {
          console.warn("Aviso ao checar credenciais no Postgres:", dbErr);
        }
      }

      if (!authorized) {
        toast.error("Senha de login incorreta! A exclusão não foi autorizada.");
        setIsDeleting(false);
        return;
      }

      // 3. Execução da exclusão com auditoria
      await PacienteService.delete(patientToDelete.id, {
        motivo: deleteMotivo.trim(),
        usuario: loggedUser.nome || loggedUser.login || "Recepção"
      });

      toast.success(`Paciente "${patientToDelete.nome}" excluído com sucesso!`);
      setDeleteModalOpen(false);
      setPatientToDelete(null);
      setDeleteMotivo("");
      setDeleteSenha("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir paciente: " + (err.message || ""));
    } finally {
      setIsDeleting(false);
    }
  };

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
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                            {p.foto ? (
                              <img src={p.foto} alt={p.nome} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{p.nome}</div>
                            {p.observacoes && (
                              <div className="text-[11px] text-slate-400 truncate max-w-sm" title={p.observacoes}>
                                {p.observacoes}
                              </div>
                            )}
                          </div>
                        </div>
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

                      <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(p)}
                          className="h-8 text-xs font-semibold text-slate-700 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                          title="Alterar Nome e Ala do paciente"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDelete(p)}
                          className="h-8 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border-rose-200 hover:border-rose-600 cursor-pointer transition-all"
                          title="Excluir paciente (requer motivo e senha de login)"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Excluir
                        </Button>

                        {isAlta && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReinternar(p)}
                            className="h-8 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200 cursor-pointer"
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

      {/* ─── MODAL DE EDIÇÃO: ALTERAR NOME E ALA ────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md w-[94vw] rounded-2xl p-0 overflow-visible border border-sky-200 shadow-2xl bg-white">
          <DialogHeader className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Editar Paciente</DialogTitle>
                <DialogDescription className="text-xs text-sky-100">
                  Alteração rápida de Nome, Ala de internação e Leito
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Nome Completo do Paciente: *
              </Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: João da Silva"
                className="h-10 text-sm font-semibold border-slate-300 focus-visible:ring-sky-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Prontuário:
                </Label>
                <Input
                  value={editForm.prontuario}
                  onChange={(e) => setEditForm(prev => ({ ...prev, prontuario: e.target.value }))}
                  placeholder="Ex: 1042"
                  className="h-10 text-xs font-mono font-bold border-slate-300"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Leito:
                </Label>
                <Input
                  value={editForm.leito}
                  onChange={(e) => setEditForm(prev => ({ ...prev, leito: e.target.value }))}
                  placeholder="Ex: 04-B"
                  className="h-10 text-xs font-semibold border-slate-300"
                />
              </div>
            </div>

            {/* Seleção de Ala */}
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Ala de Internação: *
              </Label>
              <Select
                value={String(editForm.alaId || "")}
                onValueChange={(val) => {
                  const alaObj = (alas || []).find(a => String(a.id) === String(val));
                  setEditForm(prev => ({
                    ...prev,
                    alaId: val,
                    alaNome: alaObj ? alaObj.nome : prev.alaNome
                  }));
                }}
              >
                <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-sky-300 text-xs font-bold bg-white text-slate-800 shadow-xs focus:ring-2 focus:ring-sky-500">
                  <SelectValue placeholder="Selecione a ala..." />
                </SelectTrigger>
                <SelectContent className="z-[10002] bg-white border border-slate-200 shadow-xl rounded-xl max-h-60">
                  {(alas || []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} className="text-xs font-semibold py-2 cursor-pointer">
                      🏥 {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Botões de 1 clique direto para as Alas */}
              {alas && alas.length > 0 && (
                <div className="mt-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Ou selecione com um clique:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5">
                    {alas.map((a) => {
                      const isSelected = String(editForm.alaId) === String(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, alaId: String(a.id), alaNome: a.nome }))}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                            isSelected
                              ? "bg-sky-600 text-white border-sky-600 ring-2 ring-sky-300 shadow-xs"
                              : "bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-800 border-slate-200"
                          }`}
                        >
                          <span>🏥</span>
                          <span>{a.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => { setEditModalOpen(false); setEditingPatient(null); }}
              className="text-xs h-9 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 cursor-pointer gap-1.5 shadow-sm"
            >
              {isSavingEdit ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL DE EXCLUSÃO COM MOTIVO E SENHA ──────────────────────── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md w-[94vw] rounded-2xl p-0 overflow-hidden border border-rose-300 shadow-2xl bg-white">
          <DialogHeader className="bg-gradient-to-r from-rose-600 to-red-700 px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                  Confirmar Exclusão de Paciente
                </DialogTitle>
                <DialogDescription className="text-xs text-rose-100">
                  Operação crítica: exige motivo e confirmação com senha de login
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {/* Card com identificação do paciente */}
            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200">
              <div className="text-xs font-bold text-rose-900">
                Paciente a ser excluído:
              </div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">
                {patientToDelete?.nome}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 font-medium mt-1">
                <span>Prontuário: <b>{patientToDelete?.prontuario || "—"}</b></span>
                <span>•</span>
                <span>Ala: <b>{patientToDelete?.alaNome || "Sem Ala"}</b></span>
                {patientToDelete?.leito && (
                  <>
                    <span>•</span>
                    <span>Leito: <b>{patientToDelete.leito}</b></span>
                  </>
                )}
              </div>
            </div>

            {/* Campo de Motivo */}
            <div>
              <Label className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                Motivo da Exclusão: *
              </Label>
              <Textarea
                rows={2}
                value={deleteMotivo}
                onChange={(e) => setDeleteMotivo(e.target.value)}
                placeholder="Descreva o motivo desta exclusão (ex: cadastro em duplicidade, erro de digitação)..."
                className="text-xs bg-white border-slate-300 focus-visible:ring-rose-500 resize-none"
                autoFocus
              />
            </div>

            {/* Campo de Senha do Usuário Logado */}
            <div>
              <Label className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                Sua Senha de Login ({currentUser?.nome || currentUser?.login || "Operador"}): *
              </Label>
              <Input
                type="password"
                value={deleteSenha}
                onChange={(e) => setDeleteSenha(e.target.value)}
                placeholder="Digite sua senha de login para autorizar..."
                className="h-10 text-sm font-mono border-rose-300 focus-visible:ring-rose-500 bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmDelete();
                  }
                }}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                A confirmação da senha é obrigatória por motivos de auditoria hospitalar.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 flex gap-2 justify-end bg-slate-50/50 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              onClick={() => { setDeleteModalOpen(false); setPatientToDelete(null); }}
              className="text-xs h-9 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 cursor-pointer gap-1.5 shadow-sm active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
