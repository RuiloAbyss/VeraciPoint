import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children?: ReactNode; }
interface State { hasError: boolean; errorMsg: string; errorStack: string; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, errorMsg: "", errorStack: "" };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      errorMsg: error?.message || String(error), 
      errorStack: error?.stack || "" 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error crítico capturado por React:", error, errorInfo);
    this.setState({ errorStack: errorInfo.componentStack || "" });
  }

  // Atrapa errores fuera del ciclo de vida de React (Promesas, fetch, invocaciones de Tauri)
  componentDidMount() {
    window.addEventListener("error", this.handleGlobalError);
    window.addEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleGlobalError);
    window.removeEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  handleGlobalError = (event: ErrorEvent) => {
    this.setState({
      hasError: true,
      errorMsg: event.message || "Error global detectado",
      errorStack: event.error?.stack || "No hay traza disponible."
    });
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    this.setState({
      hasError: true,
      errorMsg: reason?.message || (typeof reason === 'string' ? reason : "Promesa rechazada (Fallo de red o Backend)"),
      errorStack: reason?.stack || "Ocurrió fuera del árbol de componentes."
    });
  };

  public render() {
    if (this.state.hasError) {
      // Usamos CSS puro para garantizar que se renderice sin depender de Tailwind
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: '#fef2f2', color: '#7f1d1d', zIndex: 2147483647,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem', boxSizing: 'border-box',
          fontFamily: 'system-ui, sans-serif', overflowY: 'auto'
        }}>
          <span style={{ fontSize: '5rem', marginBottom: '1rem' }}>⚠️</span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 0.5rem 0' }}>Fallo del Sistema</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', fontWeight: '500' }}>
            La aplicación capturó un error y no puede continuar.
          </p>
          
          <div style={{
            width: '100%', maxWidth: '800px', backgroundColor: 'white',
            border: '2px solid #fca5a5', borderRadius: '12px', padding: '1.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', textAlign: 'left'
          }}>
            <p style={{ fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Mensaje del Error:
            </p>
            <code style={{ display: 'block', color: '#ef4444', fontSize: '1rem', fontWeight: 'bold', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
              {this.state.errorMsg}
            </code>
            
            {this.state.errorStack && (
              <>
                <p style={{ fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Traza Técnica:
                </p>
                <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {this.state.errorStack}
                  </pre>
                </div>
              </>
            )}
          </div>
          
          <button 
            onClick={() => window.location.replace('/')}
            style={{
              marginTop: '2rem', padding: '1rem 2.5rem', backgroundColor: '#dc2626',
              color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem',
              fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.4)'
            }}
          >
            Forzar Reinicio de la App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}