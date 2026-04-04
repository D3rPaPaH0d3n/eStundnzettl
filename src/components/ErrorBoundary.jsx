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
      const isDev = import.meta.env.DEV;
      const errorMsg = this.state.error?.toString() || "Unbekannter Fehler";
      const errorStack = isDev ? (this.state.error?.stack || "") : "";
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white p-6 overflow-auto">
          <div className="text-6xl mb-4">😵</div>
          <h1 className="text-2xl font-bold mb-2 text-center">
            Etwas ist schiefgelaufen
          </h1>
          <p className="text-sm text-red-400 mb-4 text-center max-w-lg">
            {isDev
              ? "Die App ist abgestürzt. Fehlermeldung:"
              : "Die App ist abgestürzt. Bitte starte die App neu."}
          </p>
          {isDev && (
          <div className="w-full max-w-lg bg-zinc-800 rounded-xl p-4 mb-6 text-left overflow-auto max-h-64">
            <input
              type="text"
              readOnly
              value={errorMsg}
              className="w-full text-red-400 font-mono text-xs bg-transparent border-0 outline-none mb-2 cursor-text"
              onClick={(e) => e.target.select()}
            />
            {errorStack && (
              <textarea
                readOnly
                value={errorStack.substring(0, 1500)}
                className="w-full text-zinc-500 font-mono text-xs bg-transparent border-0 outline-none resize-none cursor-text"
                rows={6}
                onClick={(e) => e.target.select()}
              />
            )}
          </div>
          )}
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-colors"
          >
            App neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
