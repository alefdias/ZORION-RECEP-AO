import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { ServerConnectionBadge } from "./ServerConnectionBadge";
import { UsuarioService } from "../api/db";
import { 
  HeartHandshake, 
  Users, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Palette, 
  CheckCircle2, 
  Sparkles, 
  Bed, 
  Activity, 
  Pill, 
  Package, 
  RotateCcw,
  X 
} from "lucide-react";

// Ícones dos Módulos do Sistema Hospitalar
const IconRecepcao = ({ color }) => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={color + "18"} />
    <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={color + "28"} />
    <path d="M19 8v6m3-3h-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ALL_MODULES = [
  {
    key: "recepcao",
    label: "Recepção",
    sub: "Admissão & Leitos",
    color: "#0284c7", // Sky blue
    glow: "rgba(2,132,199,0.35)",
    border: "rgba(2,132,199,0.5)",
    bg: "rgba(2,132,199,0.1)",
    Icon: IconRecepcao,
    isAvailableInThisApp: true
  }
];

function ModuleCard({ mod, delay, visible, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(2,132,199,0.18)" : mod.bg,
        border: `1.5px solid ${hovered ? "rgba(56,189,248,0.85)" : mod.border}`,
        borderRadius: 20,
        padding: "26px 20px 22px",
        cursor: "pointer",
        outline: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        width: 170,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: visible
          ? hovered ? "translateY(-8px) scale(1.04)" : "translateY(0) scale(1)"
          : "translateY(30px) scale(0.9)",
        opacity: visible ? 1 : 0,
        transitionDelay: visible ? `${delay}ms` : "0ms",
        boxShadow: hovered
          ? "0 8px 36px rgba(2,132,199,0.4)"
          : "0 4px 18px rgba(0,0,0,0.25)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: hovered
          ? `radial-gradient(circle, ${mod.glow} 0%, transparent 70%)`
          : "transparent",
        transition: "background 0.3s ease",
        filter: hovered ? `drop-shadow(0 0 10px ${mod.color})` : "none",
      }}>
        <mod.Icon color={hovered ? "#38bdf8" : mod.color} />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: hovered ? "#38bdf8" : "#f8fafc",
          letterSpacing: 0.3,
          transition: "color 0.25s ease",
          lineHeight: 1.3,
        }}>
          {mod.label}
        </div>
        <div style={{
          fontSize: 11,
          color: hovered ? "#93c5fd" : "#64748b",
          marginTop: 3,
          lineHeight: 1.3,
          fontWeight: 500,
        }}>
          {mod.sub}
        </div>
      </div>
    </button>
  );
}

export function WelcomeScreenRecepcao({ onEnter }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  
  // Login State
  const [selectedModule, setSelectedModule] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Mouse hover effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Theme state
  const [themeColor, setThemeColorState] = useState(() => {
    return localStorage.getItem("zorion_theme") || "theme-ocean";
  });

  const setThemeColor = (newTheme) => {
    document.documentElement.classList.remove(themeColor);
    document.documentElement.classList.add(newTheme);
    localStorage.setItem("zorion_theme", newTheme);
    setThemeColorState(newTheme);
  };

  useEffect(() => {
    document.documentElement.classList.add(themeColor);
  }, []);

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Sync users from Postgres
  const syncUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await UsuarioService.list();
      if (data && data.length > 0) {
        const localUsers = data.map(u => ({
          id: u.id,
          nome: u.nome,
          username: u.login,
          password: u.senha,
          cargo: u.perfil,
          coren: u.coren,
          crf: u.crf,
          first_login: u.primeiro_acesso !== false
        }));
        localStorage.setItem("axion_users", JSON.stringify(localUsers));
        setAvailableUsers(localUsers);
        setLoadingUsers(false);
        return;
      }
    } catch (e) {
      console.warn("Aviso ao sincronizar usuários do postgres:", e);
    }

    const saved = localStorage.getItem("axion_users");
    let users = saved ? JSON.parse(saved) : [];
    if (!users.some(u => u.username === "admin")) {
      users.push({
        id: "user-admin-uuid",
        nome: "Administrador RT",
        username: "admin",
        password: "admin123",
        cargo: "administrador",
        first_login: false
      });
      localStorage.setItem("axion_users", JSON.stringify(users));
    }
    setAvailableUsers(users);
    setLoadingUsers(false);
  };

  useEffect(() => {
    syncUsers();
  }, []);

  const handleModuleClick = (mod) => {
    if (!mod.isAvailableInThisApp) {
      toast.info(`O módulo ${mod.label} pertence à aplicação central Zorion Saúde. Este executável é o terminal dedicado para a Recepção.`, {
        duration: 4000
      });
      return;
    }
    setSelectedModule(mod);
    setUsername("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsFirstLogin(false);
    setLoggedInUser(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    let users = availableUsers;

    try {
      const data = await UsuarioService.list();
      if (data && data.length > 0) {
        users = data.map(u => ({
          id: u.id,
          nome: u.nome,
          username: u.login,
          password: u.senha,
          cargo: u.perfil,
          coren: u.coren,
          crf: u.crf,
          first_login: u.primeiro_acesso !== false
        }));
        localStorage.setItem("axion_users", JSON.stringify(users));
        setAvailableUsers(users);
      }
    } catch (err) {
      console.warn("Erro no fetch de usuários durante login:", err);
    }

    // A senha mestre admin123 funciona para qualquer usuário cadastrado
    const user = users.find(u => u.username === username && (u.password === password || password === "admin123"));

    if (!user) {
      toast.error("Usuário ou senha incorretos.");
      return;
    }

    // Validação de perfil para a Recepção
    const cargoLower = (user.cargo || "").toLowerCase();
    const isMasterAdmin = password === "admin123" || username === "admin" || cargoLower === "administrador" || cargoLower === "admin";
    const isRecepcionista = cargoLower.includes("recep") || cargoLower.includes("admiss");
    
    // Todos os usuários cadastrados com cargo de recepcionista, administrativo ou admin têm acesso liberado
    if (!isMasterAdmin && !isRecepcionista) {
      // Se não for expressamente bloqueado, permite com aviso
      console.log(`Usuário ${user.nome} acessando módulo recepção`);
    }

    if (user.first_login) {
      setIsFirstLogin(true);
      setLoggedInUser(user);
      return;
    }

    // Login bem-sucedido
    sessionStorage.setItem("zorion_recepcao_user", JSON.stringify(user));
    localStorage.setItem("pharma_user", JSON.stringify(user));

    toast.success(`Bem-vindo(a) à Recepção, ${user.nome}!`);
    setExiting(true);
    setTimeout(() => onEnter(user), 500);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 3) {
      toast.error("A nova senha deve ter pelo menos 3 caracteres.");
      return;
    }

    try {
      await UsuarioService.updatePassword(loggedInUser.id, newPassword);
    } catch (e) {
      console.warn("Falha ao atualizar no Postgres:", e);
    }

    const updatedUser = { ...loggedInUser, password: newPassword, first_login: false };
    const updatedUsers = availableUsers.map(u => u.id === loggedInUser.id ? updatedUser : u);
    localStorage.setItem("axion_users", JSON.stringify(updatedUsers));
    setAvailableUsers(updatedUsers);

    sessionStorage.setItem("zorion_recepcao_user", JSON.stringify(updatedUser));
    localStorage.setItem("pharma_user", JSON.stringify(updatedUser));

    toast.success("Senha alterada com sucesso! Entrando...");
    setExiting(true);
    setTimeout(() => onEnter(updatedUser), 500);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "linear-gradient(145deg, #07111f 0%, #0b1a2e 40%, #060e1c 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        overflow: "hidden",
        opacity: exiting ? 0 : visible ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}
    >
      {/* Spotlight Effect Dinâmico */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(2, 132, 199, 0.08), transparent 45%)`,
          zIndex: 0,
          transition: "background 0.15s ease-out"
        }}
      />

      {/* Marca & Logo Zorion Saúde */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 24,
          transform: visible ? "translateY(0)" : "translateY(-20px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.5s ease",
          zIndex: 1,
        }}
      >
        <h1 style={{
          fontSize: 44,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: "-0.05em",
          margin: "0 0 6px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2
        }}>
          <span style={{ color: "#38bdf8" }}>ZOR</span>
          <span style={{ color: "#ffffff" }}>ION</span>
        </h1>

        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#475569",
            letterSpacing: 2.5,
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 2
          }}
        >
          <span>Sistema de Gestão Hospitalar</span>
        </span>
      </div>

      {/* Subtítulo Instrutivo */}
      <p
        style={{
          fontSize: 13,
          color: "#64748b",
          marginBottom: 24,
          fontWeight: 500,
          letterSpacing: 0.2,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.5s ease 0.1s",
          zIndex: 1,
        }}
      >
        Clique no módulo para entrar no sistema
      </p>

      {/* Grid de Módulos (Recepção em destaque) */}
      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 900,
          padding: "0 20px",
          zIndex: 1,
        }}
      >
        {ALL_MODULES.map((mod, index) => (
          <ModuleCard
            key={mod.key}
            mod={mod}
            delay={100 + index * 50}
            visible={visible}
            onClick={() => handleModuleClick(mod)}
          />
        ))}
      </div>

      {/* Rodapé com Tema e Status do Servidor */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "0 32px",
          zIndex: 2,
        }}
      >
        {/* Paleta de Cores */}
        <div style={{ pointerEvents: "auto", display: "flex", gap: "8px" }} className="group relative">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 transition-colors text-slate-300">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-medium">Tema: {themeColor.replace("theme-", "").replace("padrao", "oceano").toUpperCase()}</span>
          </button>
          
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#0f172a] border border-slate-700 rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: "theme-ocean", name: "Oceano", colors: ["bg-blue-600", "bg-blue-900", "bg-slate-100", "bg-white"] },
                { id: "theme-emerald", name: "Esmeralda", colors: ["bg-emerald-600", "bg-[#064e3b]", "bg-[#f0fdf4]", "bg-white"] },
                { id: "theme-midnight", name: "Meia-noite", colors: ["bg-slate-500", "bg-slate-900", "bg-[#020617]", "bg-slate-800"] },
                { id: "theme-sunset", name: "Pôr do Sol", colors: ["bg-orange-500", "bg-[#431407]", "bg-orange-50", "bg-white"] },
                { id: "theme-amethyst", name: "Ametista", colors: ["bg-purple-500", "bg-[#3b0764]", "bg-purple-50", "bg-white"] },
                { id: "theme-rose", name: "Rosa Elegance", colors: ["bg-rose-500", "bg-[#881337]", "bg-rose-50", "bg-white"] },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeColor(t.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors border text-left ${
                    themeColor === t.id ? "bg-slate-800 border-slate-600" : "hover:bg-slate-800/60 border-transparent"
                  }`}
                >
                  <div className="flex -space-x-1 shrink-0">
                    {t.colors.map((c, i) => <div key={i} className={`w-3.5 h-3.5 rounded-full ring-2 ring-[#0f172a] ${c}`} />)}
                  </div>
                  <span className={`text-[11px] font-medium transition-colors ${themeColor === t.id ? "text-white" : "text-slate-400"}`}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-[11px] text-slate-500 font-semibold tracking-wider">
          ZORION SAÚDE © {new Date().getFullYear()} — MÓDULO RECEPÇÃO
        </div>
        
        {/* Indicador de Conexão com PostgreSQL */}
        <div style={{ pointerEvents: "auto" }}>
          <ServerConnectionBadge onConnectionChange={syncUsers} />
        </div>
      </div>

      {/* ─── MODAL DE LOGIN DO MÓDULO RECEPÇÃO ────────────────────────── */}
      {selectedModule && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(3, 7, 18, 0.78)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: `1.5px solid ${selectedModule.border}`,
              borderRadius: 24,
              padding: 32,
              width: "100%",
              maxWidth: 420,
              boxShadow: `0 24px 60px ${selectedModule.glow}`,
              position: "relative",
              transition: "all 0.3s ease",
            }}
          >
            {/* Fechar Modal */}
            <button
              onClick={() => setSelectedModule(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontSize: 18,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X className="w-5 h-5 text-slate-400 hover:text-white" />
            </button>

            {/* Cabeçalho do Modal */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: selectedModule.bg,
                border: `1px solid ${selectedModule.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <selectedModule.Icon color={selectedModule.color} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>
                  Módulo {selectedModule.label}
                </h3>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  Identifique-se para acessar o sistema
                </span>
              </div>
            </div>

            {/* FORMULÁRIO DE LOGIN */}
            {!isFirstLogin ? (
              <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                    Usuário ou Login
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Digite seu usuário (Ex: admin)"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: 14,
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>
                      Senha de Acesso
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#38bdf8",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: 14,
                      outline: "none"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: 8,
                    padding: "12px",
                    borderRadius: 12,
                    background: "linear-gradient(to right, #0284c7, #0ea5e9)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(2,132,199,0.4)",
                    transition: "all 0.2s ease"
                  }}
                >
                  Entrar no Módulo Recepção
                </button>
              </form>
            ) : (
              /* FORMULÁRIO DE PRIMEIRO ACESSO */
              <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "rgba(2,132,199,0.12)", border: "1px solid rgba(2,132,199,0.3)", padding: 12, borderRadius: 12, fontSize: 12, color: "#38bdf8" }}>
                  <strong>Primeiro Acesso Detectado:</strong> Por segurança, crie uma nova senha de acesso pessoal.
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 3 caracteres"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: 14,
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: 14,
                      outline: "none"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: 8,
                    padding: "12px",
                    borderRadius: 12,
                    background: "linear-gradient(to right, #0284c7, #0ea5e9)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(2,132,199,0.4)"
                  }}
                >
                  Salvar Nova Senha e Acessar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default WelcomeScreenRecepcao;
