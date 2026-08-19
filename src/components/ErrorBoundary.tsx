import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Mantém um log no console para depuração; não há telemetria externa no app.
    console.error('Lume crash:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-100 text-gray-800">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h1 className="text-xl font-bold mb-2">Algo deu errado</h1>
          <p className="text-gray-600 mb-6 max-w-sm">
            O Lume encontrou um problema inesperado ao processar este documento.
          </p>
          <button
            onClick={this.handleReload}
            className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={18} /> Recarregar o app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
