import { ErrorInfo } from 'react';

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ErrorMetadata {
  componentName?: string;
  userId?: string;
  timestamp: number;
  severity: ErrorSeverity;
  additionalInfo?: Record<string, unknown>;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private readonly isDevelopment = import.meta.env.DEV;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private getSeverity(error: Error): ErrorSeverity {
    if (error instanceof TypeError || error instanceof ReferenceError) {
      return 'high';
    }
    if (error.name === 'NetworkError' || error.name === 'AuthenticationError') {
      return 'critical';
    }
    return 'medium';
  }

  private formatError(error: Error, errorInfo?: ErrorInfo, metadata?: Partial<ErrorMetadata>) {
    const formattedError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      metadata: {
        timestamp: Date.now(),
        severity: this.getSeverity(error),
        environment: this.isDevelopment ? 'development' : 'production',
        ...metadata
      }
    };

    return formattedError;
  }

  logError(error: Error, errorInfo?: ErrorInfo, metadata?: Partial<ErrorMetadata>) {
    const formattedError = this.formatError(error, errorInfo, metadata);

    // Always log to console in development
    if (this.isDevelopment) {
      console.error('[ErrorLogger]', formattedError);
      return;
    }

    // In production, we could send to error reporting service
    // Example: Sentry, LogRocket, etc.
    try {
      // TODO: Implement error reporting service integration
      console.error('[ErrorLogger] Production Error:', formattedError);
    } catch (loggingError) {
      // Fallback logging if error reporting fails
      console.error('[ErrorLogger] Failed to log error:', loggingError);
      console.error('Original error:', formattedError);
    }
  }

  logComponentError(componentName: string, error: Error, errorInfo?: ErrorInfo) {
    this.logError(error, errorInfo, {
      componentName,
      severity: 'high'
    });
  }

  logAPIError(endpoint: string, error: Error) {
    this.logError(error, undefined, {
      additionalInfo: { endpoint },
      severity: 'high'
    });
  }

  logAuthError(error: Error, userId?: string) {
    this.logError(error, undefined, {
      userId,
      severity: 'critical',
      additionalInfo: { authFlow: true }
    });
  }
}

export const errorLogger = ErrorLogger.getInstance();