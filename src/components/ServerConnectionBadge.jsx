import React, { useState, useEffect } from "react";
import { Server, ServerOff, Loader2, Settings2, ShieldCheck, Database } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { testConnection, isTauriAvailable, initDbListener } from "@/api/db";

// Credenciais técnicas padrão
const TECH_USER = "root";
const TECH_PASS = "admin123";

export function ServerConnectionBadge({ onConnectionChange }) {
  const [status, setStatus] = useState("checking");
  const [isTesting, setIsTesting] = useState(false);

  const [techModalOpen, setTechModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const [techUser, setTechUser] = useState("");
  const [techPass, setTechPass] = useState("");
  const [techError, setTechError] = useState("");

  const [ip, setIp] = useState(() => {
    const saved = localStorage.getItem("pg_ip");
    return (saved && saved !== "localhost") ? saved : "127.0.0.1";
  });
  const [dbName, setDbName] = useState(() => localStorage.getItem("pg_db") || "axion");
  const [password, setPassword] = useState(() => localStorage.getItem("pg_pass") || "");

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const savedIp = localStorage.getItem("pg_ip");
    const savedDb = localStorage.getItem("pg_db") || "axion";
    const savedPass = localStorage.getItem("pg_pass");

    if (!isTauriAvailable()) {
      setStatus("off");
      if (onConnectionChange) onConnectionChange(false);
      return;
    }

    if (!savedIp || !savedPass) {
      setStatus("off");
      if (onConnectionChange) onConnectionChange(false);
      return;
    }

    try {
      await testConnection(savedIp, savedDb, savedPass);
      setStatus("on");
      initDbListener();
      if (onConnectionChange) onConnectionChange(true);
    } catch {
      setStatus("off");
      if (onConnectionChange) onConnectionChange(false);
    }
  };

  const handleBadgeClick = () => {
    setTechUser("");
    setTechPass("");
    setTechError("");
    setTechModalOpen(true);
  };

  const handleTechLogin = () => {
    if (techUser.trim() === TECH_USER && techPass === TECH_PASS) {
      setTechModalOpen(false);
      setConfigModalOpen(true);
    } else {
      setTechError("Usuário ou senha técnica incorretos.");
    }
  };

  const handleTestAndSave = async () => {
    if (!ip || !dbName || !password) {
      toast.error("Preencha todos os campos da conexão.");
      return;
    }
    setIsTesting(true);
    try {
      const msg = await testConnection(ip, dbName, password);
      toast.success(msg || "Conexão com Servidor 1 estabelecida com sucesso!");
      localStorage.setItem("pg_ip", ip);
      localStorage.setItem("pg_db", dbName);
      localStorage.setItem("pg_pass", password);
      setStatus("on");
      initDbListener();
      setConfigModalOpen(false);
      if (onConnectionChange) onConnectionChange(true);
    } catch (e) {
      toast.error(String(e.message || e));
      setStatus("off");
      if (onConnectionChange) onConnectionChange(false);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleBadgeClick}
        title="Clique para configurar a conexão com o Servidor 1"
        className={`flex items-center gap-2 text-xs font-semibold rounded-full px-3.5 py-1.5 transition-all shadow-sm ${
          status === "checking"
            ? "text-slate-600 bg-slate-100 border border-slate-200"
            : status === "on"
            ? "text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 ring-1 ring-emerald-400/20"
            : "text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 ring-1 ring-rose-400/20"
        }`}
      >
        {status === "checking" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === "on" && <Server className="w-3.5 h-3.5 text-emerald-600" />}
        {status === "off" && <ServerOff className="w-3.5 h-3.5 text-rose-600" />}
        <span>
          {status === "checking" ? "Verificando..." : status === "on" ? "Servidor 1 Conectado" : "Servidor 1 Desconectado"}
        </span>
      </button>

      {/* Modal 1: Autenticação Técnica */}
      <Dialog open={techModalOpen} onOpenChange={setTechModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Acesso Administrativo / TI</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Insira as credenciais técnicas para gerenciar o servidor.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-medium">Usuário Técnico</Label>
              <Input
                value={techUser}
                onChange={(e) => setTechUser(e.target.value)}
                placeholder="root"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Senha</Label>
              <Input
                type="password"
                value={techPass}
                onChange={(e) => setTechPass(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleTechLogin()}
              />
            </div>
            {techError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded border border-rose-200">
                {techError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setTechModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleTechLogin} className="bg-sky-600 hover:bg-sky-700 text-white">
              Entrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Configuração PostgreSQL */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Configuração do Servidor 1</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Conecte a Recepção à base de dados central do Zorion Saúde.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">IP / Host do Servidor</Label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.100 ou 127.0.0.1"
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Nome do Banco de Dados</Label>
              <Input
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                placeholder="axion"
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Senha do Usuário postgres</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 font-mono text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleTestAndSave()}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setConfigModalOpen(false)}>
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleTestAndSave}
              disabled={isTesting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
              Testar e Conectar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
