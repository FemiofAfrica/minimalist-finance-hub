import { supabase } from '@/integrations/supabase/client'

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
  sessionId?: string
  isAuthenticated?: boolean
}

class ErrorNotificationService {
  private static instance: ErrorNotificationService
  private throttleMap = new Map<string, number>()
  private readonly THROTTLE_WINDOW = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_NOTIFICATIONS_PER_HOUR = 10
  private notificationCount = 0
  private notificationResetTime = Date.now() + 60 * 60 * 1000 // 1 hour
  private sessionId: string

  private constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeGlobalErrorHandlers()
  }

  static getInstance(): ErrorNotificationService {
    if (!ErrorNotificationService.instance) {
      ErrorNotificationService.instance = new ErrorNotificationService()
    }
    return ErrorNotificationService.instance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        userAgent: navigator.userAgent,
        errorType: 'javascript',
        severity: this.determineSeverity(event.message, event.error?.stack),
        additionalContext: {
          lineno: event.lineno,
          colno: event.colno,
          filename: event.filename
        }
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: event.reason?.message || 'Unhandled promise rejection',
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
    
    if (content.includes('auth') || content.includes('payment') || 
        content.includes('database') || content.includes('supabase') ||
        content.includes('login') || content.includes('signup') ||
        content.includes('password') || content.includes('reset')) {
      return 'critical'
    }
    
    if (content.includes('network') || content.includes('fetch') || 
        content.includes('api') || content.includes('500') || 
        content.includes('crash') || content.includes('fatal')) {
      return 'high'
    }
    
    if (content.includes('component') || content.includes('render') || 
        content.includes('validation') || content.includes('form') ||
        content.includes('props')) {
      return 'medium'
    }
    
    return 'low'
  }

  private shouldThrottle(errorKey: string): boolean {
    const now = Date.now()
    
    if (now > this.notificationResetTime) {
      this.notificationCount = 0
      this.notificationResetTime = now + 60 * 60 * 1000
    }
    
    if (this.notificationCount >= this.MAX_NOTIFICATIONS_PER_HOUR) {
      return true
    }
    
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
      
      if (user) {
        errorReport.userId = user.id
        errorReport.userEmail = user.email
        errorReport.isAuthenticated = true
      } else {
        errorReport.userId = null
        errorReport.userEmail = `anonymous_${this.sessionId}@unauthenticated.local`
        errorReport.sessionId = this.sessionId
        errorReport.isAuthenticated = false
      }

      const userIdentifier = user?.id || this.sessionId
      const errorKey = `${errorReport.errorType}:${errorReport.message.substring(0, 100)}:${userIdentifier}`
      
      if (this.shouldThrottle(errorKey)) {
        return
      }

      const shouldLog = errorReport.severity === 'critical' || 
                       ['medium', 'high', 'critical'].includes(errorReport.severity)
      
      if (!shouldLog) {
        return
      }

      const enhancedContext = {
        ...errorReport.additionalContext,
        sessionId: this.sessionId,
        isAuthenticated: errorReport.isAuthenticated,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        url: window.location.href,
        referrer: document.referrer
      }

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
          additional_context: enhancedContext
        }])

      if (error) {
        console.error('Failed to store error log:', error)
        return
      }

      this.throttleMap.set(errorKey, Date.now())
      this.notificationCount++

      await this.notifyAdmins(errorReport)

    } catch (error) {
      console.error('Failed to report error:', error)
    }
  }

  private async notifyAdmins(errorReport: ErrorReport) {
    try {
      await this.sendPushNotification(errorReport)
      
      if (['critical', 'high'].includes(errorReport.severity)) {
        await this.sendEmailNotification(errorReport)
      }
    } catch (error) {
      console.error('Failed to notify admins:', error)
    }
  }

  private async sendPushNotification(errorReport: ErrorReport) {
    try {
      const userContext = errorReport.isAuthenticated 
        ? `User: ${errorReport.userEmail}`
        : `Anonymous User (Session: ${errorReport.sessionId?.slice(-8)})`

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: `🚨 ${errorReport.severity.toUpperCase()} Error Detected`,
          message: `${errorReport.message.substring(0, 80)}\n${userContext}`,
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
      const userContext = errorReport.isAuthenticated 
        ? `User: ${errorReport.userEmail}`
        : `Anonymous User\nSession ID: ${errorReport.sessionId}`

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: `🚨 ${errorReport.severity.toUpperCase()} Error Detected`,
          message: `Error: ${errorReport.message}\n\nURL: ${errorReport.url}\n\n${userContext}\n\nTime: ${new Date().toISOString()}`,
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

  async reportAuthError(error: Error, context: string) {
    await this.reportError({
      message: `Auth Error: ${error.message}`,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorType: 'unhandled',
      severity: 'critical',
      additionalContext: {
        authContext: context,
        errorName: error.name
      }
    })
  }
}

const errorNotificationService = ErrorNotificationService.getInstance()

export default errorNotificationService 