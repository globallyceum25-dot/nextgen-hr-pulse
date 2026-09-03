import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Shown in the heading so the user knows which part failed. */
  area?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors so one broken component does not blank the whole app.
 *
 * Without this, any uncaught error during render unmounts the entire React tree and
 * the user is left staring at a white page with no way to recover.
 *
 * The technical error text is deliberately kept behind a collapsed <details> so end
 * users see a professional message while support can still read the detail.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the stack in the console for debugging; do not surface it in the UI.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong{this.props.area ? ` in ${this.props.area}` : ""}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The page could not be displayed. You can try again, or reload the app.
              If this keeps happening, please contact your system administrator.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={this.reset}>Try again</Button>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
          <details className="text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px] text-muted-foreground whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
