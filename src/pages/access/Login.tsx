// src/pages/access/Login.tsx
import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";

// Assets
import bgImage from "../../assets/wallpaper-login.jpg"; 

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    console.log("Iniciando sesión con:", { username, password });
    navigate("/dashboard");
  };

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-cover bg-center bg-no-repeat p-4 lg:justify-start lg:p-0"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Panel de Login: Centrado y con blur en móvil; lateral al 33%, sin márgenes y casi sin blur en escritorio */}
      <div className="flex w-full max-w-sm flex-col justify-between rounded-3xl border border-white/30 bg-surface-1/75 p-6 shadow-2xl backdrop-blur-md transition-all duration-300 sm:max-w-md lg:h-screen lg:w-1/3 lg:max-w-none lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r lg:border-white/20 lg:bg-surface-1/95 lg:p-12 lg:backdrop-blur-[2px]">
        
        {/* Cabecera / Marca del negocio */}
        <div className="pt-2 text-center lg:pt-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-bg sm:text-4xl lg:text-5xl">
            Abarrotes
          </h1>
          <span className="block text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Janny
          </span>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-primary/40 lg:w-16" />
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="my-auto w-full space-y-5 lg:my-0 lg:pb-12"
        >
          <h2 className="text-xl font-bold text-center text-on-bg lg:text-2xl">
            Iniciar Sesión
          </h2>

          <div>
            <label className="mb-1 block text-sm font-bold text-on-bg">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-surface-3/80 px-4 py-3 text-base text-on-bg outline-none transition focus:ring-2 focus:ring-primary backdrop-blur-sm lg:bg-surface-3"
              placeholder="Ingresa tu usuario"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-on-bg">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-surface-3/80 px-4 py-3 text-base text-on-bg outline-none transition focus:ring-2 focus:ring-primary backdrop-blur-sm lg:bg-surface-3"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-primary py-3 font-bold text-on-color shadow-md transition-colors hover:bg-secondary hover:text-on-bg"
          >
            Entrar
          </button>
        </form>

        {/* Pie de marca */}
        <div className="text-center text-xs text-on-bg/40 lg:block pb-2">
          VeraciPoint
        </div>
      </div>
    </div>
  );
}