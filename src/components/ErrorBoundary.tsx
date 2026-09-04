// src/components/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children?: ReactNode; }
interface State { hasError: boolean; errorMsg: string; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, errorMsg: "" };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error crítico capturado:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-red-50/90 p-6 text-red-900 backdrop-blur-sm z-50 absolute inset-0">
          <span className="text-5xl mb-4">⚠️</span>
          <h1 className="text-3xl font-extrabold mb-2">Error de Sistema</h1>
          <p className="mb-6 font-semibold">Algo falló al cargar esta pantalla.</p>
          <div className="font-mono text-sm bg-white border border-red-200 p-4 rounded-xl shadow-inner mb-6 max-w-2xl w-full text-center text-red-600">
            {this.state.errorMsg}
          </div>
          <button 
            className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md transition-colors"
            onClick={() => window.location.href = '/'}
          >
            Reiniciar Aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}