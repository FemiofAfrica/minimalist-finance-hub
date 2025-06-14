import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'
import ErrorLogsViewer from '@/components/admin/ErrorLogsViewer'
import { supabase } from '@/integrations/supabase/client'
import errorNotificationService from '@/services/errorNotificationService'

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  }
}))

vi.mock('@/services/errorNotificationService', () => ({
  default: {
    reportError: vi.fn(),
  }
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

// Mock date-fns format function
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    const d = new Date(date)
    if (formatStr === 'MMM dd, yyyy HH:mm:ss') {
      return 'Dec 15, 2024 14:30:00'
    }
    if (formatStr === 'HH:mm') {
      return '14:30'
    }
    if (formatStr === 'MMMM dd, yyyy HH:mm:ss') {
      return 'December 15, 2024 14:30:00'
    }
    return d.toISOString()
  })
}))

// Sample error log data
const mockErrorLogs = [
  {
    id: '1',
    message: 'Critical payment processing error',
    stack: 'Error: Payment failed\n    at processPayment (payment.js:45)',
    component_stack: 'PaymentForm > PaymentButton',
    url: 'https://app.example.com/payment',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    user_id: 'user-1',
    user_email: 'user@example.com',
    error_type: 'api' as const,
    severity: 'critical' as const,
    resolved: false,
    resolved_by: null,
    created_at: '2024-12-15T14:30:00Z',
    additional_context: { paymentId: 'pay_123', amount: 100 }
  },
  {
    id: '2',
    message: 'Network timeout error',
    stack: 'Error: Request timeout\n    at fetch (network.js:12)',
    component_stack: null,
    url: 'https://app.example.com/dashboard',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    user_id: 'user-2',
    user_email: 'admin@example.com',
    error_type: 'network' as const,
    severity: 'high' as const,
    resolved: true,
    resolved_by: 'admin-1',
    created_at: '2024-12-15T13:15:00Z',
    additional_context: { timeout: 5000 }
  },
  {
    id: '3',
    message: 'Component render error',
    stack: 'Error: Cannot read property of undefined\n    at Component.render',
    component_stack: 'App > Dashboard > Chart',
    url: 'https://app.example.com/dashboard',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
    user_id: null,
    user_email: null,
    error_type: 'react' as const,
    severity: 'medium' as const,
    resolved: false,
    resolved_by: null,
    created_at: '2024-12-15T12:45:00Z',
    additional_context: { component: 'Chart' }
  },
  {
    id: '4',
    message: 'Minor validation warning',
    stack: null,
    component_stack: null,
    url: 'https://app.example.com/settings',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    user_id: 'user-3',
    user_email: 'test@example.com',
    error_type: 'javascript' as const,
    severity: 'low' as const,
    resolved: false,
    resolved_by: null,
    created_at: '2024-12-15T11:20:00Z',
    additional_context: { field: 'email' }
  }
]

describe('ErrorLogsViewer', () => {
  const mockSupabaseRpc = vi.mocked(supabase.rpc)
  const mockErrorNotificationService = vi.mocked(errorNotificationService.reportError)
  const mockToast = vi.mocked(toast)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful response for get_recent_errors
    mockSupabaseRpc.mockImplementation((functionName) => {
      if (functionName === 'get_recent_errors') {
        return Promise.resolve({
          data: mockErrorLogs,
          error: null
        })
      }
      if (functionName === 'resolve_error') {
        return Promise.resolve({
          data: true,
          error: null
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the main header and description', async () => {
      render(<ErrorLogsViewer />)
      
      expect(screen.getByText('🚨 Error Logs')).toBeInTheDocument()
      expect(screen.getByText('Monitor and manage application errors')).toBeInTheDocument()
    })

    it('renders the test error logging button', async () => {
      render(<ErrorLogsViewer />)
      
      expect(screen.getByRole('button', { name: /test error logging/i })).toBeInTheDocument()
    })

    it('renders all stats cards', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Errors')).toBeInTheDocument()
        expect(screen.getByText('Critical')).toBeInTheDocument()
        expect(screen.getByText('Unresolved')).toBeInTheDocument()
        expect(screen.getByText('Resolved')).toBeInTheDocument()
      })
    })

    it('renders filter controls', async () => {
      render(<ErrorLogsViewer />)
      
      expect(screen.getByText('Time Range')).toBeInTheDocument()
      expect(screen.getByText('Severity')).toBeInTheDocument()
      expect(screen.getByText('Error Type')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })
  })

  describe('Data Fetching and Display', () => {
    it('fetches and displays error logs on mount', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith('get_recent_errors', { hours_back: 24 })
      })

      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
        expect(screen.getByText('Network timeout error')).toBeInTheDocument()
        expect(screen.getByText('Component render error')).toBeInTheDocument()
        expect(screen.getByText('Minor validation warning')).toBeInTheDocument()
      })
    })

    it('calculates and displays correct statistics', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument() // Total errors
        expect(screen.getByText('1')).toBeInTheDocument() // Critical errors
        expect(screen.getByText('3')).toBeInTheDocument() // Unresolved errors
        expect(screen.getByText('1')).toBeInTheDocument() // Resolved errors
      })
    })

    it('displays loading state while fetching data', () => {
      mockSupabaseRpc.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<ErrorLogsViewer />)
      
      expect(screen.getByText('Loading error logs...')).toBeInTheDocument()
    })

    it('displays empty state when no errors found', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: [], error: null })
      
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('No errors found for the selected filters.')).toBeInTheDocument()
      })
    })

    it('displays error state when fetch fails', async () => {
      const errorMessage = 'Failed to fetch error logs'
      mockSupabaseRpc.mockResolvedValue({ 
        data: null, 
        error: new Error(errorMessage) 
      })
      
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText(`Failed to fetch error logs: ${errorMessage}`)).toBeInTheDocument()
      })
    })
  })

  describe('Error Log Display', () => {
    it('displays error badges with correct severity colors and icons', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        const criticalBadge = screen.getByText('CRITICAL')
        const highBadge = screen.getByText('HIGH')
        const mediumBadge = screen.getByText('MEDIUM')
        const lowBadge = screen.getByText('LOW')
        
        expect(criticalBadge).toBeInTheDocument()
        expect(highBadge).toBeInTheDocument()
        expect(mediumBadge).toBeInTheDocument()
        expect(lowBadge).toBeInTheDocument()
      })
    })

    it('displays error type badges', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('api')).toBeInTheDocument()
        expect(screen.getByText('network')).toBeInTheDocument()
        expect(screen.getByText('react')).toBeInTheDocument()
        expect(screen.getByText('javascript')).toBeInTheDocument()
      })
    })

    it('shows resolved badge for resolved errors', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Resolved')).toBeInTheDocument()
      })
    })

    it('displays formatted timestamps', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getAllByText('Dec 15, 2024 14:30:00')).toHaveLength(1)
        expect(screen.getAllByText('14:30')).toHaveLength(4) // Time for each error
      })
    })

    it('displays user email when available', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('👤 user@example.com')).toBeInTheDocument()
        expect(screen.getByText('👤 admin@example.com')).toBeInTheDocument()
        expect(screen.getByText('👤 test@example.com')).toBeInTheDocument()
      })
    })

    it('displays URLs for all errors', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('🌐 https://app.example.com/payment')).toBeInTheDocument()
        expect(screen.getByText('🌐 https://app.example.com/dashboard')).toBeInTheDocument()
        expect(screen.getByText('🌐 https://app.example.com/settings')).toBeInTheDocument()
      })
    })
  })

  describe('Filtering Functionality', () => {
    it('filters errors by time range', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith('get_recent_errors', { hours_back: 24 })
      })

      // Change time range to 1 hour
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours')
      fireEvent.click(timeRangeSelect)
      
      const oneHourOption = screen.getByText('Last Hour')
      fireEvent.click(oneHourOption)
      
      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith('get_recent_errors', { hours_back: 1 })
      })
    })

    it('filters errors by severity', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
        expect(screen.getByText('Minor validation warning')).toBeInTheDocument()
      })

      // Filter to show only critical errors
      const severitySelect = screen.getByDisplayValue('All Severities')
      fireEvent.click(severitySelect)
      
      const criticalOption = screen.getByText('Critical')
      fireEvent.click(criticalOption)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
        expect(screen.queryByText('Minor validation warning')).not.toBeInTheDocument()
      })
    })

    it('filters errors by type', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
        expect(screen.getByText('Component render error')).toBeInTheDocument()
      })

      // Filter to show only API errors
      const typeSelect = screen.getByDisplayValue('All Types')
      fireEvent.click(typeSelect)
      
      const apiOption = screen.getByText('API')
      fireEvent.click(apiOption)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
        expect(screen.queryByText('Component render error')).not.toBeInTheDocument()
      })
    })

    it('combines multiple filters correctly', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
        expect(screen.getByText('Network timeout error')).toBeInTheDocument()
      })

      // Filter by high severity
      const severitySelect = screen.getByDisplayValue('All Severities')
      fireEvent.click(severitySelect)
      fireEvent.click(screen.getByText('High'))

      // Filter by network type
      const typeSelect = screen.getByDisplayValue('All Types')
      fireEvent.click(typeSelect)
      fireEvent.click(screen.getByText('Network'))
      
      await waitFor(() => {
        expect(screen.getByText('Network timeout error')).toBeInTheDocument()
        expect(screen.queryByText('Critical payment processing error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Details Modal', () => {
    it('opens error details modal when error is clicked', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      // Click on the first error
      fireEvent.click(screen.getByText('Critical payment processing error'))
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument()
        expect(screen.getByText('December 15, 2024 14:30:00')).toBeInTheDocument()
      })
    })

    it('displays all error details in modal', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Critical payment processing error'))
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Critical payment processing error')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Error: Payment failed\n    at processPayment (payment.js:45)')).toBeInTheDocument()
        expect(screen.getByDisplayValue('PaymentForm > PaymentButton')).toBeInTheDocument()
        expect(screen.getByText('https://app.example.com/payment')).toBeInTheDocument()
        expect(screen.getByText('user@example.com')).toBeInTheDocument()
        expect(screen.getByDisplayValue('{\n  "paymentId": "pay_123",\n  "amount": 100\n}')).toBeInTheDocument()
      })
    })

    it('shows resolve button for unresolved errors', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Critical payment processing error'))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as resolved/i })).toBeInTheDocument()
      })
    })

    it('does not show resolve button for already resolved errors', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Network timeout error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Network timeout error'))
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /mark as resolved/i })).not.toBeInTheDocument()
      })
    })

    it('closes modal when close button is clicked', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Critical payment processing error'))
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /close/i }))
      
      await waitFor(() => {
        expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
      })
    })

    it('toggles modal when same error is clicked twice', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      // Click to open
      fireEvent.click(screen.getByText('Critical payment processing error'))
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument()
      })

      // Click again to close
      fireEvent.click(screen.getByText('Critical payment processing error'))
      
      await waitFor(() => {
        expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Resolution', () => {
    it('resolves error successfully', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Critical payment processing error'))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark as resolved/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /mark as resolved/i }))
      
      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith('resolve_error', { error_id: '1' })
      })
    })

    it('handles error resolution failure', async () => {
      mockSupabaseRpc.mockImplementation((functionName) => {
        if (functionName === 'get_recent_errors') {
          return Promise.resolve({ data: mockErrorLogs, error: null })
        }
        if (functionName === 'resolve_error') {
          return Promise.resolve({ data: null, error: new Error('Resolution failed') })
        }
        return Promise.resolve({ data: null, error: null })
      })

      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Critical payment processing error'))
      fireEvent.click(screen.getByRole('button', { name: /mark as resolved/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText('Failed to resolve error: Resolution failed')).toBeInTheDocument()
      })
    })

    it('refreshes data after successful resolution', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Critical payment processing error'))
      fireEvent.click(screen.getByRole('button', { name: /mark as resolved/i }))
      
      await waitFor(() => {
        // Should call get_recent_errors twice: once on mount, once after resolution
        expect(mockSupabaseRpc).toHaveBeenCalledTimes(3) // mount + resolve + refresh
      })
    })

    it('closes modal after successful resolution', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Critical payment processing error'))
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /mark as resolved/i }))
      
      await waitFor(() => {
        expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
      })
    })
  })

  describe('Test Error Logging', () => {
    it('logs a test error successfully', async () => {
      mockErrorNotificationService.mockResolvedValue(undefined)
      
      render(<ErrorLogsViewer />)
      
      const testButton = screen.getByRole('button', { name: /test error logging/i })
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(mockErrorNotificationService).toHaveBeenCalledWith({
          message: 'Test error from Error Logs Viewer',
          url: 'http://localhost:3000/',
          userAgent: expect.any(String),
          errorType: 'react',
          severity: 'medium',
          additionalContext: {
            component: 'ErrorLogsViewer',
            action: 'Test Error Button',
            timestamp: expect.any(String)
          }
        })
      })

      expect(mockToast.success).toHaveBeenCalledWith('Test error logged successfully! Refresh to see it.')
    })

    it('handles test error logging failure', async () => {
      mockErrorNotificationService.mockRejectedValue(new Error('Failed to log error'))
      
      render(<ErrorLogsViewer />)
      
      const testButton = screen.getByRole('button', { name: /test error logging/i })
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to log test error')
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('refreshes data when refresh button is clicked', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledTimes(1)
      })

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshButton)
      
      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledTimes(2)
      })
    })

    it('shows loading state during refresh', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockSupabaseRpc.mockImplementation(() => promise)
      
      render(<ErrorLogsViewer />)
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshButton)
      
      expect(screen.getByText('Loading error logs...')).toBeInTheDocument()
      
      // Resolve the promise
      resolvePromise!({ data: mockErrorLogs, error: null })
      
      await waitFor(() => {
        expect(screen.queryByText('Loading error logs...')).not.toBeInTheDocument()
      })
    })

    it('disables refresh button during loading', async () => {
      mockSupabaseRpc.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<ErrorLogsViewer />)
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /test error logging/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      const errorCard = screen.getByText('Critical payment processing error').closest('[role="button"]') ||
                       screen.getByText('Critical payment processing error').closest('div')
      
      if (errorCard) {
        errorCard.focus()
        fireEvent.keyDown(errorCard, { key: 'Enter', code: 'Enter' })
        
        await waitFor(() => {
          expect(screen.getByText('Error Details')).toBeInTheDocument()
        })
      }
    })

    it('provides proper text alternatives for icons', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        // Icons should have proper aria-labels or be decorative
        const icons = screen.getAllByRole('img', { hidden: true })
        expect(icons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles malformed error data gracefully', async () => {
      const malformedData = [
        {
          id: '1',
          message: null, // Invalid message
          error_type: 'api',
          severity: 'high',
          resolved: false,
          created_at: '2024-12-15T14:30:00Z'
        }
      ]

      mockSupabaseRpc.mockResolvedValue({ data: malformedData, error: null })
      
      render(<ErrorLogsViewer />)
      
      // Should not crash and should handle gracefully
      await waitFor(() => {
        expect(screen.getByText('Error Logs (1)')).toBeInTheDocument()
      })
    })

    it('handles very long error messages', async () => {
      const longMessage = 'A'.repeat(1000)
      const longErrorData = [{
        ...mockErrorLogs[0],
        message: longMessage
      }]

      mockSupabaseRpc.mockResolvedValue({ data: longErrorData, error: null })
      
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        // Should truncate or handle long messages appropriately
        expect(screen.getByText(longMessage)).toBeInTheDocument()
      })
    })

    it('handles missing optional fields', async () => {
      const minimalErrorData = [{
        id: '1',
        message: 'Minimal error',
        url: 'https://app.example.com',
        error_type: 'javascript',
        severity: 'low',
        resolved: false,
        created_at: '2024-12-15T14:30:00Z'
        // Missing: stack, component_stack, user_agent, user_id, user_email, additional_context
      }]

      mockSupabaseRpc.mockResolvedValue({ data: minimalErrorData, error: null })
      
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Minimal error')).toBeInTheDocument()
      })

      // Click to open details
      fireEvent.click(screen.getByText('Minimal error'))
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument()
        // Should not show sections for missing data
        expect(screen.queryByText('Stack Trace')).not.toBeInTheDocument()
        expect(screen.queryByText('Component Stack')).not.toBeInTheDocument()
        expect(screen.queryByText('User')).not.toBeInTheDocument()
      })
    })

    it('handles network errors during data fetching', async () => {
      mockSupabaseRpc.mockRejectedValue(new Error('Network error'))
      
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText('Failed to fetch error logs: Network error')).toBeInTheDocument()
      })
    })

    it('handles concurrent filter changes', async () => {
      render(<ErrorLogsViewer />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })

      // Rapidly change multiple filters
      const severitySelect = screen.getByDisplayValue('All Severities')
      const typeSelect = screen.getByDisplayValue('All Types')
      
      fireEvent.click(severitySelect)
      fireEvent.click(screen.getByText('Critical'))
      
      fireEvent.click(typeSelect)
      fireEvent.click(screen.getByText('API'))
      
      // Should handle concurrent changes without errors
      await waitFor(() => {
        expect(screen.getByText('Critical payment processing error')).toBeInTheDocument()
      })
    })
  })
})
