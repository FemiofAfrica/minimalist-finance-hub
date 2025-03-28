import React from 'react';
import ErrorBoundary from './ErrorBoundary';

type WithErrorBoundaryOptions = {
  componentName?: string;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
};

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const {
    componentName = WrappedComponent.displayName || WrappedComponent.name,
    fallback,
    onError,
    onReset
  } = options;

  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary
        componentName={componentName}
        fallback={fallback}
        onError={onError}
        onReset={onReset}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withErrorBoundary(${componentName})`;

  return WithErrorBoundary;
}