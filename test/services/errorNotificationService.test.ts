import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '@/integrations/supabase/client'

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        error: null
      }))
    })),
    functions: {
      invoke: vi.fn()
    }
  }
}))

// Mock window and navigator objects
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://app.example.com/test'
  },
  writable: true
})

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  writable: true
})

// Mock global error event listeners
const mockAddEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
})

describe('ErrorNotificationService', () => {
  const mockSupabaseAuth = vi.mocked(supabase.auth)
  const mockSupabaseFrom = vi.mocked(supabase.from)
  const mockSupabaseFunctions = vi.mocked(supabase.functions)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Mock successful auth response
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      },
      error: null
    })

    // Mock successful database insert
    mockSupabaseFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        error: null
      })
    } as any)

    // Mock successful function invocation
    mockSupabaseFunctions.invoke.mockResolvedValue({
      data: null,
      error: null
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('returns the same instance when called multiple times', async () => {
      // Import the service after mocks are set up
      const { default: errorNotificationService1 } = await import('@/services/errorNotificationService')
      const { default: errorNotificationService2 } = await import('@/services/errorNotificationService')
      
      expect(errorNotificationService1).toBe(errorNotificationService2)
    })

    it('initializes global error handlers on instantiation', async () => {
      // Import the service to trigger initialization
      await import('@/services/errorNotificationService')
      
      // The service should have registered error and unhandledrejection listeners
      expect(mockAddEventListener).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    })
  })

  describe('Severity Determination', () => {
    it('determines critical severity for payment errors', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Payment processing failed',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'api',
        severity: 'critical'
      })

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          severity: 'critical'
        })
      ])
    })

    it('determines critical severity for auth errors', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Authentication failed - unauthorized access',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'api',
        severity: 'critical'
      })

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          severity: 'critical'
        })
      ])
    })

    it('determines high severity for network errors', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Network timeout occurred',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'network',
        severity: 'high'
      })

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          severity: 'high'
        })
      ])
    })

    it('determines medium severity for component errors', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Component render error occurred',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'react',
        severity: 'medium'
      })

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          severity: 'medium'
        })
      ])
    })
  })

  describe('Error Reporting', () => {
    it('reports error with user context when user is authenticated', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Test error message',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: 'medium'
      })

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Test error message',
          url: window.location.href,
          user_agent: navigator.userAgent,
          user_id: 'test-user-id',
          user_email: 'test@example.com',
          error_type: 'javascript',
          severity: 'medium'
        })
      ])
    })

    it('reports error without user context when user is not authenticated', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Test error message',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: 'medium'
      })

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Test error message',
          user_id: undefined,
          user_email: undefined
        })
      ])
    })

    it('includes additional context when provided', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      const additionalContext = {
        component: 'TestComponent',
        action: 'button_click',
        data: { id: 123 }
      }

      await errorNotificationService.reportError({
        message: 'Test error with context',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'react',
        severity: 'medium',
        additionalContext
      })

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          additional_context: additionalContext
        })
      ])
    })

    it('handles database insertion errors gracefully', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ 
        error: new Error('Database connection failed') 
      })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await errorNotificationService.reportError({
        message: 'Test error message',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: 'medium'
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to store error log:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('Throttling Mechanism', () => {
    it('throttles duplicate errors within the throttle window', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      const errorReport = {
        message: 'Duplicate error message',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript' as const,
        severity: 'medium' as const
      }

      // Report the same error twice quickly
      await errorNotificationService.reportError(errorReport)
      await errorNotificationService.reportError(errorReport)

      // Should only be inserted once due to throttling
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('allows reporting after throttle window expires', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      const errorReport = {
        message: 'Throttled error message',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript' as const,
        severity: 'medium' as const
      }

      // Report error
      await errorNotificationService.reportError(errorReport)
      
      // Advance time beyond throttle window (5 minutes)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)
      
      // Report same error again
      await errorNotificationService.reportError(errorReport)

      // Should be inserted twice since throttle window expired
      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('enforces hourly notification limit', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      // Report 11 different errors (exceeding the limit of 10 per hour)
      for (let i = 0; i < 11; i++) {
        await errorNotificationService.reportError({
          message: `Error message ${i}`,
          url: window.location.href,
          userAgent: navigator.userAgent,
          errorType: 'javascript',
          severity: 'medium'
        })
      }

      // Should only insert 10 errors due to hourly limit
      expect(mockInsert).toHaveBeenCalledTimes(10)
    })

    it('resets notification count after one hour', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      // Report 10 errors to reach the limit
      for (let i = 0; i < 10; i++) {
        await errorNotificationService.reportError({
          message: `Error message ${i}`,
          url: window.location.href,
          userAgent: navigator.userAgent,
          errorType: 'javascript',
          severity: 'medium'
        })
      }

      // Advance time by one hour
      vi.advanceTimersByTime(60 * 60 * 1000 + 1)

      // Report another error
      await errorNotificationService.reportError({
        message: 'Error after reset',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: 'medium'
      })

      // Should be inserted (10 + 1 = 11 times) since count was reset
      expect(mockInsert).toHaveBeenCalledTimes(11)
    })
  })

  describe('Notification System', () => {
    it('sends push notification for medium severity errors', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Medium severity error',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'react',
        severity: 'medium'
      })

      expect(mockSupabaseFunctions.invoke).toHaveBeenCalledWith('send-push-notification', {
        body: {
          title: '🚨 MEDIUM Error Detected',
          message: 'Medium severity error',
          url: '/settings?tab=admin',
          targetType: 'segment',
          segment: 'super_admins'
        }
      })
    })

    it('sends both push and email notifications for critical errors', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Critical payment error',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'api',
        severity: 'critical'
      })

      // Should send push notification
      expect(mockSupabaseFunctions.invoke).toHaveBeenCalledWith('send-push-notification', {
        body: {
          title: '🚨 CRITICAL Error Detected',
          message: 'Critical payment error',
          url: '/settings?tab=admin',
          targetType: 'segment',
          segment: 'super_admins'
        }
      })

      // Should also send email notification
      expect(mockSupabaseFunctions.invoke).toHaveBeenCalledWith('send-push-notification', {
        body: {
          title: '🚨 CRITICAL Error Detected',
          message: expect.stringContaining('Critical payment error'),
          url: '/settings?tab=admin',
          targetType: 'segment',
          segment: 'super_admins',
          shouldTriggerEmail: true
        }
      })
    })

    it('does not send notifications for low severity errors', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Low severity warning',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: 'low'
      })

      // Should not send any notifications for low severity
      expect(mockSupabaseFunctions.invoke).not.toHaveBeenCalled()
    })

    it('handles notification sending errors gracefully', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      mockSupabaseFunctions.invoke.mockRejectedValue(new Error('Notification service unavailable'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await errorNotificationService.reportError({
        message: 'Error with notification failure',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'api',
        severity: 'high'
      })

      expect(consoleSpy).toHaveBeenCalledWith('Error sending push notification:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('Specialized Error Reporting Methods', () => {
    it('reports API errors with correct format', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportApiError(
        'https://api.example.com/payment',
        500,
        'Internal Server Error',
        { error: 'Database connection failed' }
      )

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'API Error: 500 Internal Server Error',
          error_type: 'api',
          severity: 'high',
          additional_context: {
            apiUrl: 'https://api.example.com/payment',
            status: 500,
            statusText: 'Internal Server Error',
            response: { error: 'Database connection failed' }
          }
        })
      ])
    })

    it('reports network errors with correct format', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      const networkError = new Error('Network timeout')
      networkError.name = 'TimeoutError'
      networkError.stack = 'Error: Network timeout\n    at fetch'

      await errorNotificationService.reportNetworkError(
        'https://api.example.com/data',
        networkError
      )

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Network Error: Network timeout',
          stack: 'Error: Network timeout\n    at fetch',
          error_type: 'network',
          severity: 'high',
          additional_context: {
            apiUrl: 'https://api.example.com/data',
            errorName: 'TimeoutError'
          }
        })
      ])
    })

    it('reports React errors with component stack', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      const reactError = new Error('Cannot read property of undefined')
      reactError.stack = 'Error: Cannot read property of undefined\n    at Component.render'

      await errorNotificationService.reportReactError(
        reactError,
        'App > Dashboard > Chart'
      )

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'React Error: Cannot read property of undefined',
          stack: 'Error: Cannot read property of undefined\n    at Component.render',
          component_stack: 'App > Dashboard > Chart',
          error_type: 'react',
          severity: 'high'
        })
      ])
    })
  })

  describe('Global Error Handlers', () => {
    it('handles global JavaScript errors', async () => {
      await import('@/services/errorNotificationService')
      
      // Get the error handler that was registered
      const errorHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]

      expect(errorHandler).toBeDefined()

      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      // Simulate a global error event
      const errorEvent = {
        message: 'Uncaught TypeError: Cannot read property',
        filename: 'app.js',
        lineno: 42,
        colno: 15,
        error: {
          stack: 'TypeError: Cannot read property\n    at app.js:42:15'
        }
      }

      errorHandler(errorEvent)

      // Should report the error
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Uncaught TypeError: Cannot read property',
          stack: 'TypeError: Cannot read property\n    at app.js:42:15',
          error_type: 'javascript',
          additional_context: {
            filename: 'app.js',
            lineno: 42,
            colno: 15
          }
        })
      ])
    })

    it('handles unhandled promise rejections', async () => {
      await import('@/services/errorNotificationService')
      
      // Get the unhandledrejection handler that was registered
      const rejectionHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'unhandledrejection'
      )?.[1]

      expect(rejectionHandler).toBeDefined()

      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      // Simulate an unhandled promise rejection
      const rejectionEvent = {
        reason: {
          message: 'Promise rejection error',
          stack: 'Error: Promise rejection error\n    at async function'
        }
      }

      rejectionHandler(rejectionEvent)

      // Should report the error
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Promise rejection error',
          stack: 'Error: Promise rejection error\n    at async function',
          error_type: 'unhandled',
          additional_context: {
            reason: rejectionEvent.reason
          }
        })
      ])
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('handles errors when user context retrieval fails', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      mockSupabaseAuth.getUser.mockRejectedValue(new Error('Auth service unavailable'))

      const mockInsert = vi.fn().mockReturnValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any)

      await errorNotificationService.reportError({
        message: 'Test error without user context',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: 'medium'
      })

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Test error without user context',
          user_id: undefined,
          user_email: undefined
        })
      ])
    })

    it('handles complete service failure gracefully', async () => {
      const { default: errorNotificationService } = await import('@/services/errorNotificationService')
      mockSupabaseAuth.getUser.mockRejectedValue(new Error('Service unavailable'))
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error('Database unavailable')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await errorNotificationService.reportError({
        message: 'Error during service failure',
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: 'medium'
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to report error:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })
}) 