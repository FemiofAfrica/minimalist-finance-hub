import { supabase } from '@/lib/supabase'

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  url: string
  userAgent: string
  userId?: string
  userEmail?: string
  errorType: 'javascript' | 'api' | 'network' | 'react' | 'unhandled'
  severity: 'low' | 'medium' | 'high' | 'critical'
  additionalContext?: Record<string, any>
}

class ErrorNotificationService {
  private static instance: ErrorNotificationService
  private throttleMap = new Map<string, number>()
  private readonly THROTTLE_WINDOW = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_NOTIFICATIONS_PER_HOUR = 10
  private notificationCount = 0
  private notificationResetTime = Date.now() + 60 * 60 * 1000 // 1 hour

  private constructor() {
    this.initializeGlobalErrorHandlers()
  }

  static getInstance(): ErrorNotificationService {
    if (!ErrorNotificationService.instance) {
      ErrorNotificationService.instance = new ErrorNotificationService()
    }
    return ErrorNotificationService.instance
  }

  private initializeGlobalErrorHandlers() {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: this.determineSeverity(event.message, event.error?.stack),
        additionalContext: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'unhandled',
        severity: this.determineSeverity(event.reason?.message, event.reason?.stack),
        additionalContext: {
          reason: event.reason
        }
      })
    })
  }

  private determineSeverity(message: string, stack?: string): 'low' | 'medium' | 'high' | 'critical' {
    const content = `${message} ${stack || ''}`.toLowerCase()
    
    // Critical errors - payment, auth, security, database
    if (content.includes('payment') || 
        content.includes('auth') || 
        content.includes('security') || 
        content.includes('database') ||
        content.includes('unauthorized') ||
        content.includes('forbidden')) {
      return 'critical'
    }
    
    // High severity - network errors, API failures, 500 errors, timeouts
    if (content.includes('network') || 
        content.includes('fetch') || 
        content.includes('500') || 
        content.includes('timeout') ||
        content.includes('connection') ||
        content.includes('api')) {
      return 'high'
    }
    
    // Medium severity - component errors, 404s, validation
    if (content.includes('component') || 
        content.includes('404') || 
        content.includes('validation') ||
        content.includes('render') ||
        content.includes('props')) {
      return 'medium'
    }
    
    // Low severity - everything else
    return 'low'
  }

  private shouldThrottle(errorKey: string): boolean {
    const now = Date.now()
    
    // Reset notification count every hour
    if (now > this.notificationResetTime) {
      this.notificationCount = 0
      this.notificationResetTime = now + 60 * 60 * 1000
    }
    
    // Check hourly limit
    if (this.notificationCount >= this.MAX_NOTIFICATIONS_PER_HOUR) {
      return true
    }
    
    // Check if same error was reported recently
    const lastReported = this.throttleMap.get(errorKey)
    if (lastReported && (now - lastReported) < this.THROTTLE_WINDOW) {
      return true
    }
    
    return false
  }

  private async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch {
      return null
    }
  }

  async reportError(errorReport: ErrorReport) {
    try {
      const user = await this.getCurrentUser()
      
      // Add user context if available
      if (user) {
        errorReport.userId = user.id
        errorReport.userEmail = user.email
      }

      // Create throttle key based on error message and type
      const errorKey = `${errorReport.errorType}:${errorReport.message.substring(0, 100)}`
      
      // Check if we should throttle this error
      if (this.shouldThrottle(errorKey)) {
        return
      }

      // Only notify admins for medium+ severity errors
      if (!['medium', 'high', 'critical'].includes(errorReport.severity)) {
        return
      }

      // Store error in database
      const { error } = await supabase
        .from('error_logs')
        .insert([{
          message: errorReport.message,
          stack: errorReport.stack,
          component_stack: errorReport.componentStack,
          url: errorReport.url,
          user_agent: errorReport.userAgent,
          user_id: errorReport.userId,
          user_email: errorReport.userEmail,
          error_type: errorReport.errorType,
          severity: errorReport.severity,
          additional_context: errorReport.additionalContext
        }])

      if (error) {
        console.error('Failed to store error log:', error)
        return
      }

      // Update throttle map
      this.throttleMap.set(errorKey, Date.now())
      this.notificationCount++

      // Send notifications to super admins
      await this.notifyAdmins(errorReport)

    } catch (error) {
      console.error('Failed to report error:', error)
    }
  }

  private async notifyAdmins(errorReport: ErrorReport) {
    try {
      // Send push notification for all medium+ severity errors
      await this.sendPushNotification(errorReport)
      
      // Send email for critical and high severity errors
      if (['critical', 'high'].includes(errorReport.severity)) {
        await this.sendEmailNotification(errorReport)
      }
    } catch (error) {
      console.error('Failed to notify admins:', error)
    }
  }

  private async sendPushNotification(errorReport: ErrorReport) {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: `🚨 ${errorReport.severity.toUpperCase()} Error Detected`,
          message: errorReport.message.substring(0, 100),
          url: '/settings?tab=admin',
          targetType: 'segment',
          segment: 'super_admins'
        }
      })

      if (error) {
        console.error('Failed to send push notification:', error)
      }
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }

  private async sendEmailNotification(errorReport: ErrorReport) {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: `🚨 ${errorReport.severity.toUpperCase()} Error Detected`,
          message: `Error: ${errorReport.message}\n\nURL: ${errorReport.url}\n\nUser: ${errorReport.userEmail || 'Anonymous'}\n\nTime: ${new Date().toISOString()}`,
          url: '/settings?tab=admin',
          targetType: 'segment',
          segment: 'super_admins',
          shouldTriggerEmail: true
        }
      })

      if (error) {
        console.error('Failed to send email notification:', error)
      }
    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }

  // Method for manual error reporting
  async reportApiError(url: string, status: number, statusText: string, response?: any) {
    await this.reportError({
      message: `API Error: ${status} ${statusText}`,
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorType: 'api',
      severity: status >= 500 ? 'high' : 'medium',
      additionalContext: {
        apiUrl: url,
        status,
        statusText,
        response
      }
    })
  }

  async reportNetworkError(url: string, error: Error) {
    await this.reportError({
      message: `Network Error: ${error.message}`,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorType: 'network',
      severity: 'high',
      additionalContext: {
        apiUrl: url,
        errorName: error.name
      }
    })
  }

  async reportReactError(error: Error, componentStack: string) {
    await this.reportError({
      message: `React Error: ${error.message}`,
      stack: error.stack,
      componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorType: 'react',
      severity: 'high'
    })
  }
}

// Initialize the service
const errorNotificationService = ErrorNotificationService.getInstance()

export default errorNotificationService 