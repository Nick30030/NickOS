import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { ObservabilityService } from '../../services/observability/ObservabilityService';

interface Props {
  children: ReactNode;
  sectionName?: string;
  onReset?: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`NICK OS Error in ${this.props.sectionName || 'Root'}:`, error, errorInfo);
    ObservabilityService.recordError('runtime', error, {
      section: this.props.sectionName || 'Root',
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (!this.props.sectionName) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Section-level contained Error Boundary
      if (this.props.sectionName) {
        return (
          <div className="p-6 my-4 bg-neutral-900/80 border border-neutral-800 rounded-xl text-neutral-100 shadow-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-200">
                    {this.props.sectionName} Temporarily Unavailable
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    An error was isolated in this module. The rest of NICK OS remains fully operational.
                  </p>
                </div>
                {this.state.error && (
                  <pre className="text-[11px] font-mono bg-neutral-950 border border-neutral-850 p-2.5 rounded-lg text-rose-300 text-left overflow-x-auto max-h-24">
                    {this.state.error.message}
                  </pre>
                )}
                <div className="pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={this.handleReset}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Retry {this.props.sectionName}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Root App-level Error Boundary
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-950 text-neutral-100">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">System Execution Fault</h2>
              <p className="text-xs text-neutral-400 mt-1">
                An unexpected condition was intercepted in the execution runtime.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[11px] font-mono bg-neutral-950 border border-neutral-850 p-3 rounded-lg text-rose-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <Button
              variant="primary"
              onClick={this.handleReset}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="w-full"
            >
              Restart Runtime
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
