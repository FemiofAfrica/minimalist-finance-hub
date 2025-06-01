import React, { Component, ReactNode } from 'react';
import { Card } from '../ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console for debugging
    console.error('Demo component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Card className="p-8">
          <div className="flex items-center justify-center min-h-[200px] text-center">
            <div>
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {this.props.fallbackTitle || 'Demo Temporarily Unavailable'}
              </h3>
              <p className="text-muted-foreground">
                {this.props.fallbackMessage || 
                 'This demo feature is experiencing technical difficulties. Please try refreshing the page or come back later.'}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="mt-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 