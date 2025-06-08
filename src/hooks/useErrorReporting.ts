import { useCallback } from 'react'
import errorNotificationService from '@/services/errorNotificationService'

export const useErrorReporting = () => {
  const reportError = useCallback(async (
    error: Error | string,
    context?: {
      component?: string
      action?: string
      additionalData?: Record<string, any>
    }
  ) => {
    const message = typeof error === 'string' ? error : error.message
    const stack = typeof error === 'string' ? undefined : error.stack

    await errorNotificationService.reportError({
      message,
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorType: 'react',
      severity: 'medium',
      additionalContext: {
        component: context?.component,
        action: context?.action,
        ...context?.additionalData
      }
    })
  }, [])

  const reportApiError = useCallback(async (
    url: string,
    status: number,
    statusText: string,
    response?: any,
    context?: { component?: string }
  ) => {
    await errorNotificationService.reportApiError(url, status, statusText, response)
  }, [])

  const reportNetworkError = useCallback(async (
    url: string,
    error: Error,
    context?: { component?: string }
  ) => {
    await errorNotificationService.reportNetworkError(url, error)
  }, [])

  const reportCriticalError = useCallback(async (
    message: string,
    context?: {
      component?: string
      additionalData?: Record<string, any>
    }
  ) => {
    await errorNotificationService.reportError({
      message,
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorType: 'react',
      severity: 'critical',
      additionalContext: {
        component: context?.component,
        ...context?.additionalData
      }
    })
  }, [])

  return {
    reportError,
    reportApiError,
    reportNetworkError,
    reportCriticalError
  }
}

export default useErrorReporting 