import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, 
  Users, 
  LayoutDashboard, 
  PlusCircle, 
  HeartHandshake, 
  Activity, 
  LogOut,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerConnectionBadge } from "@/components/ServerConnectionBadge";
import { PatientModal } from "@/components/PatientModal";
import { RecepcaoDashboard } from "@/pages/RecepcaoDashboard";
import { PacientesList } from "@/pages/PacientesList";
import { VisitasManager } from "@/pages/VisitasManager";
import { PacienteService, AlaService, VisitaService, EstatisticasService, initDbListener } from "@/api/db";
import { WelcomeScreenRecepcao } from "@/components/WelcomeScreenRecepcao";
import { toast } from "sonner";
import { listen } from "@tauri-apps/api/event";

export function App() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("zorion_recepcao_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "pacientes" | "visitas"
  const [pacientesStatusFilter, setPacientesStatusFilter] = useState("ativo");

  // Modais de Controle
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState(null);

  // Listener em tempo real contínuo (PostgreSQL LISTEN / NOTIFY via Rust/Tauri)
  useEffect(() => {
    let unlistenUpdate;
    let unlistenChange;

    const setupListeners = async () => {
      try {
        await initDbListener();
        unlistenUpdate = await listen("db_update", () => {
          queryClient.invalidateQueries();
        });
        unlistenChange = await listen("db_change", () => {
          queryClient.invalidateQueries();
        });
      } catch (e) {
        console.warn("Aviso ao inicializar listener de sincronização em tempo real:", e);
      }
    };

    setupListeners();

    return () => {
      if (unlistenUpdate) unlistenUpdate();
      if (unlistenChange) unlistenChange();
    };
  }, [queryClient]);

  // Queries TanStack Query
  const { data: patients = [], isLoading: loadingPatients, refetch: refetchPatients } = useQuery({
    queryKey: ["recepcao_pacientes"],
    queryFn: () => PacienteService.list({ status: "all" }),
    enabled: Boolean(currentUser),
    refetchInterval: 1500, // Complemento de segurança para sincronia instantânea
  });

  const { data: alas = [], refetch: refetchAlas } = useQuery({
    queryKey: ["recepcao_alas"],
    queryFn: () => AlaService.list(),
    enabled: Boolean(currentUser),
  });

  const { data: metrics = {}, refetch: refetchMetrics } = useQuery({
    queryKey: ["recepcao_metricas"],
    queryFn: () => EstatisticasService.getDashboardMetrics(),
    enabled: Boolean(currentUser),
    refetchInterval: 1500,
  });

  const { data: visitas = [], refetch: refetchVisitas } = useQuery({
    queryKey: ["recepcao_visitas"],
    queryFn: () => VisitaService.list(),
    enabled: Boolean(currentUser),
    refetchInterval: 1500,
  });

  const handleRefreshAll = () => {
    refetchPatients();
    refetchAlas();
    refetchMetrics();
    refetchVisitas();
  };

  const handleGoToPatients = (status = "all") => {
    setPacientesStatusFilter(status);
    setActiveTab("pacientes");
  };

  const handleOpenNewPatient = () => {
    setPatientToEdit(null);
    setPatientModalOpen(true);
  };

  const handleOpenEditPatient = (patient) => {
    setPatientToEdit(patient);
    setPatientModalOpen(true);
  };

  const handleOpenReinternar = (patient) => {
    setPatientToEdit(patient);
    setPatientModalOpen(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("zorion_recepcao_user");
    setCurrentUser(null);
    toast.info("Sessão encerrada com sucesso.");
  };

  // Se o usuário ainda não realizou login / escolheu o módulo, exibe a tela de boas-vindas
  if (!currentUser) {
    return <WelcomeScreenRecepcao onEnter={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Barra Superior */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* ZORION Brand Text Only (sem logo, idêntico aos outros módulos) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex flex-col justify-center">
              <h1 className="font-extrabold text-[22px] leading-none tracking-tight mb-0.5">
                <span className="text-sky-600">ZOR</span><span className="text-slate-900">ION</span>
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] leading-none text-slate-400 font-semibold">Hospitalar</span>
                <span className="w-1 h-1 rounded-full bg-sky-500"></span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-600 leading-none">
                  Recepção
                </span>
              </div>
            </div>
          </div>

          {/* Navegação entre Abas */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel Geral
            </button>
            <button
              onClick={() => handleGoToPatients("ativo")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pacientes"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4" />
              Pacientes ({patients.filter(p => String(p.status || "").trim().toLowerCase() !== "alta" && p.ativo !== false).length})
            </button>
            <button
              onClick={() => setActiveTab("visitas")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "visitas"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Visitas ({visitas.filter(v => !v.dataHoraSaida || v.status === "Em Andamento").length})
            </button>
          </nav>

          {/* Ações da Direita & Conexão */}
          <div className="flex items-center gap-2.5">
            <ServerConnectionBadge onConnectionChange={handleRefreshAll} />

            <Button
              onClick={handleOpenNewPatient}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 sm:px-4 py-2 rounded-xl shadow-md gap-1.5 text-xs h-9 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Admissão</span>
              <span className="sm:hidden">Novo</span>
            </Button>

            {/* Usuário Logado */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.nome ? currentUser.nome.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="text-left leading-tight pr-1">
                <div className="font-bold text-slate-800 text-xs truncate max-w-[120px]" title={currentUser.nome}>
                  {currentUser.nome || "Usuário"}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {currentUser.cargo || "Recepção"}
                </div>
              </div>
            </div>

            {/* Botão Trocar Módulo / Sair */}
            <button
              onClick={handleLogout}
              title="Trocar Módulo / Encerrar Sessão"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer ml-1"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-red-600" />
              <span className="hidden xl:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around pt-2.5 mt-2.5 border-t border-slate-100">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 py-1 text-xs font-bold ${
              activeTab === "dashboard" ? "text-sky-600" : "text-slate-500"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Painel
          </button>
          <button
            onClick={() => handleGoToPatients("ativo")}
            className={`flex items-center gap-1.5 py-1 text-xs font-bold ${
              activeTab === "pacientes" ? "text-sky-600" : "text-slate-500"
            }`}
          >
            <Users className="w-4 h-4" />
            Pacientes ({patients.filter(p => String(p.status || "").trim().toLowerCase() !== "alta" && p.ativo !== false).length})
          </button>
          <button
            onClick={() => setActiveTab("visitas")}
            className={`flex items-center gap-1.5 py-1 text-xs font-bold ${
              activeTab === "visitas" ? "text-sky-600" : "text-slate-500"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Visitas ({visitas.filter(v => !v.dataHoraSaida || v.status === "Em Andamento").length})
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 py-1 text-xs font-bold text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {activeTab === "dashboard" && (
          <RecepcaoDashboard
            metrics={metrics}
            patients={patients}
            alas={alas}
            onNewPatient={handleOpenNewPatient}
            onEditPatient={handleOpenEditPatient}
            onGoToPatients={handleGoToPatients}
          />
        )}

        {activeTab === "pacientes" && (
          <PacientesList
            key={pacientesStatusFilter}
            patients={patients}
            alas={alas}
            initialStatusFilter={pacientesStatusFilter}
            onNewPatient={handleOpenNewPatient}
            onEditPatient={handleOpenEditPatient}
            onReinternar={handleOpenReinternar}
          />
        )}

        {activeTab === "visitas" && (
          <VisitasManager
            visitas={visitas}
            patients={patients}
            currentUser={currentUser}
            onRefresh={handleRefreshAll}
          />
        )}
      </main>

      {/* Modais Globais */}
      <PatientModal
        open={patientModalOpen}
        onOpenChange={setPatientModalOpen}
        patient={patientToEdit}
        alas={alas}
        allPatients={patients}
        onSaved={handleRefreshAll}
      />

      {/* Rodapé */}
      <footer className="py-4 border-t border-slate-200/80 bg-white text-center text-xs text-slate-400">
        <p>Zorion Saúde © {new Date().getFullYear()} — Módulo Recepção & Internações</p>
      </footer>
    </div>
  );
}
export default App;
