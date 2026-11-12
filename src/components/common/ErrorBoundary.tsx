import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Khalessi ERP ErrorBoundary]', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Se detectó una interrupción inesperada en la vista
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Los datos operativos y pedidos sincronizados están protegidos. Puedes reintentar montar el módulo actual o recargar la aplicación.
                </p>
              </div>
            </div>

            {this.state.error?.message && (
              <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800/80 p-3.5 text-[11px] font-mono text-rose-300 break-words max-h-28 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reintentar Vista
              </button>
              <button
                type="button"
                onClick={this.handleHardReload}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 whitespace-nowrap shrink-0 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar Aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
