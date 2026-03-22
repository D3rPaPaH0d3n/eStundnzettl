import React from "react";

/**
 * Global Error Boundary - fängt unerwartete Render-Fehler ab
 * und zeigt einen Fallback statt einem weißen Screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">😵</div>
            <h1 className="text-xl font-bold text-zinc-800 dark:text-white mb-2">
              Etwas ist schiefgelaufen
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Ein unerwarteter Fehler ist aufgetreten. Deine Daten sind sicher gespeichert.
            </p>
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-zinc-900 dark:bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-zinc-800 dark:hover:bg-emerald-700 transition-colors"
            >
              App neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
