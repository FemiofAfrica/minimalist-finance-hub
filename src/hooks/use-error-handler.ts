import { useCallback } from 'react';
import { errorLogger } from '@/utils/errorLogger';

type ErrorHandlerOptions = {
  componentName?: string;
  userId?: string;
  endpoint?: string;
  isAuthError?: boolean;
};

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const handleError = useCallback(
    (error: Error) => {
      const { componentName, userId, endpoint, isAuthError } = options;

      if (isAuthError) {
        errorLogger.logAuthError(error, userId);
        return;
      }

      if (endpoint) {
        errorLogger.logAPIError(endpoint, error);
        return;
      }

      if (componentName) {
        errorLogger.logComponentError(componentName, error);
        return;
      }

      // Default error logging
      errorLogger.logError(error);
    },
    [options]
  );

  return { handleError };
}