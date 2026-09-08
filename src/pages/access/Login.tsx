import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import bgImage from "../../assets/wallpaper-login.jpg"; 
import { useLoading } from "../../components/LoadingContext";

type DbStatus = "verifying" | "active" | "inactive";

interface AuthResponse {
  employeeId: number;
  name: string;
  isAdmin: boolean;
}

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasError, setHasError] = useState(false); 
  const [dbStatus, setDbStatus] = useState<DbStatus>("verifying");
  const navigate = useNavigate();
  
  const { isLoading, setLoading } = useLoading(); 

  useEffect(() => {
    const verifyConnectionAndSession = async () => {
      try {
        await invoke("check_db_connection");
        setDbStatus("active");
        
        const raw = localStorage.getItem("userSession");
        if (raw) {
          const session = JSON.parse(raw);
          if (session.employeeId && session.activeTurnId) {
             const isStillActive = await invoke<boolean>("check_turn_status", { employeeId: session.employeeId });
             if (isStillActive) {
                navigate("/dashboard");
                return;
             } else {
                localStorage.removeItem("userSession");
             }
          }
        }
      } catch (err) {
        setDbStatus("inactive");
      }
    };
    verifyConnectionAndSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    if (dbStatus !== "active") return;
    
    localStorage.removeItem("userSession");
    setHasError(false);
    setLoading(true); // <-- Mostramos overlay global

    try {
      const userSession = await invoke<AuthResponse>("authenticate", { 
        username, 
        pin: password 
      });
      
      localStorage.setItem("userSession", JSON.stringify(userSession));
      navigate("/dashboard");
    } catch (err) {
      setHasError(true);
    } finally {
      setLoading(false); // <-- Ocultamos overlay
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (hasError) setHasError(false);
  };

  const ledConfig = {
    verifying: { color: "bg-yellow-400 animate-pulse", text: "Verificando sistema..." },
    active: { color: "bg-primary animate-pulse", text: "Sistema Activo" },
    inactive: { color: "bg-red-500", text: "Sistema Inactivo" }
  };

  const isFormDisabled = dbStatus !== "active" || isLoading || hasError;

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-cover bg-center bg-no-repeat p-4 lg:justify-start lg:p-0 relative"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="flex w-full max-w-sm flex-col justify-between rounded-3xl border border-white/30 bg-surface-1/75 p-6 shadow-2xl backdrop-blur-md transition-all duration-300 sm:max-w-md lg:h-screen lg:w-1/3 lg:max-w-none lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r lg:border-white/20 lg:bg-surface-1/95 lg:p-12 lg:backdrop-blur-[2px]">
        
        <div className="pt-2 text-center lg:pt-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-bg sm:text-4xl lg:text-5xl">
            Abarrotes
          </h1>
          <span className="block text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Janny
          </span>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-primary/40 lg:w-16" />
        </div>

        <form onSubmit={handleSubmit} className="my-auto w-full space-y-5 lg:my-0 lg:pb-12">
          <h2 className="text-xl font-bold text-center text-on-bg lg:text-2xl">
            Iniciar Sesión
          </h2>

          <div>
            <label className="mb-1 block text-sm font-bold text-on-bg">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={handleInputChange(setUsername)}
              disabled={dbStatus !== "active" || isLoading}
              autoComplete="off"
              className={`w-full rounded-xl px-4 py-3 text-base text-on-bg outline-none transition backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed lg:bg-surface-3 ${
                hasError ? "bg-red-500/10 border border-red-500 focus:ring-red-500" : "bg-surface-3/80 focus:ring-2 focus:ring-primary"
              }`}
              placeholder="Ingresa tu usuario"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-on-bg">PIN de Acceso</label>
            <input
              type="password"
              value={password}
              onChange={handleInputChange(setPassword)}
              disabled={dbStatus !== "active" || isLoading}
              autoComplete="new-password"
              className={`w-full rounded-xl px-4 py-3 text-base text-on-bg outline-none transition backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed lg:bg-surface-3 tracking-widest font-mono ${
                hasError ? "bg-red-500/10 border border-red-500 focus:ring-red-500" : "bg-surface-3/80 focus:ring-2 focus:ring-primary"
              }`}
              placeholder="••••"
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={isFormDisabled}
            animate={hasError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.4, type: "tween" }}
            className={`w-full rounded-xl py-3 font-bold shadow-md transition-colors ${
              hasError 
                ? "bg-red-500 text-white cursor-not-allowed" 
                : "bg-primary text-on-color hover:bg-secondary hover:text-on-bg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
             Entrar
          </motion.button>
        </form>
      </div>

      <div className="fixed bottom-5 right-5 flex items-center gap-3 rounded-2xl border border-white/20 bg-surface-1/80 px-4 py-2.5 shadow-xl backdrop-blur-md select-none z-50">
        <div className={`h-3 w-3 rounded-full ${ledConfig[dbStatus].color}`} />
        <span className="text-xs font-bold text-on-bg/90 tracking-wide">
          {ledConfig[dbStatus].text}
        </span>
      </div>
    </div>
  );
}