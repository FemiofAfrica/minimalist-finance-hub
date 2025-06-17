import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabase } from '@/integrations/supabase/client'
import ErrorLogsViewer from '@/components/admin/ErrorLogsViewer'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}))

const mockSupabaseRpc = vi.mocked(supabase.rpc)
const mockSupabaseAuth = vi.mocked(supabase.auth)

describe('Error Logs Access Integration Test', () => {
  const mockErrorLogsFromMultipleUsers = [
    {
      id: '1',
      message: 'Error from super admin user',
      user_id: 'super-admin-id',
      user_email: 'admin@example.com',
      error_type: 'javascript',
      severity: 'high',
      resolved: false,
      created_at: '2024-12-15T14:30:00Z',
      url: 'https://app.com/dashboard',
      stack: 'Error stack trace...'
    },
    {
      id: '2',
      message: 'Error from regular user 1',
      user_id: 'user-1-id',
      user_email: 'user1@example.com',
      error_type: 'api',
      severity: 'medium',
      resolved: false,
      created_at: '2024-12-15T13:15:00Z',
      url: 'https://app.com/transactions',
      stack: 'API error stack...'
    },
    {
      id: '3',
      message: 'Error from regular user 2',
      user_id: 'user-2-id',
      user_email: 'user2@example.com',
      error_type: 'react',
      severity: 'critical',
      resolved: false,
      created_at: '2024-12-15T12:00:00Z',
      url: 'https://app.com/reports',
      stack: 'React error stack...'
    },
    {
      id: '4',
      message: 'Another error from user 1',
      user_id: 'user-1-id',
      user_email: 'user1@example.com',
      error_type: 'network',
      severity: 'low',
      resolved: true,
      created_at: '2024-12-15T11:30:00Z',
      url: 'https://app.com/settings',
      stack: 'Network error stack...'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock super admin user
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'super-admin-id',
          email: 'admin@example.com',
          user_metadata: {},
          app_metadata: { is_super_admin: true }
        }
      },
      error: null
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Super Admin Cross-User Access', () => {
    it('should show errors from all users when super admin accesses error logs', async () => {
      // Mock successful response with errors from multiple users
      mockSupabaseRpc.mockImplementation((functionName) => {
        if (functionName === 'get_recent_errors') {
          return Promise.resolve({
            data: mockErrorLogsFromMultipleUsers,
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      render(<ErrorLogsViewer />)

      // Wait for error logs to load
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Total errors count
      })

      // Verify we can see errors from multiple users
      expect(screen.getByText('Error from super admin user')).toBeInTheDocument()
      expect(screen.getByText('Error from regular user 1')).toBeInTheDocument()
      expect(screen.getByText('Error from regular user 2')).toBeInTheDocument()

      // Verify different user emails are shown
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('user1@example.com')).toBeInTheDocument()
      expect(screen.getByText('user2@example.com')).toBeInTheDocument()

      // Verify the function was called correctly
      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_recent_errors', { hours_back: 24 })
    })

    it('should handle permission errors for non-super-admin users', async () => {
      // Mock permission error (simulating non-super-admin access)
      mockSupabaseRpc.mockImplementation((functionName) => {
        if (functionName === 'get_recent_errors') {
          return Promise.resolve({
            data: null,
            error: new Error('Only super admins can access error logs')
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      render(<ErrorLogsViewer />)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch error logs/)).toBeInTheDocument()
        expect(screen.getByText(/Only super admins can access error logs/)).toBeInTheDocument()
      })
    })
  })

  describe('Super Admin Access', () => {
    it('should show correct statistics for errors from all users', async () => {
      mockSupabaseRpc.mockImplementation((functionName) => {
        if (functionName === 'get_recent_errors') {
          return Promise.resolve({
            data: mockErrorLogsFromMultipleUsers,
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      render(<ErrorLogsViewer />)

      await waitFor(() => {
        // Total errors: 4
        expect(screen.getByText('4')).toBeInTheDocument()
      })

      // Critical errors: 1 (user-2's error)
      const criticalCount = screen.getAllByText('1').find(el => 
        el.closest('.text-destructive')
      )
      expect(criticalCount).toBeInTheDocument()

      // Unresolved errors: 3 (all except user-1's second error)
      expect(screen.getByText('3')).toBeInTheDocument()

      // Resolved errors: 1 (user-1's second error)
      const resolvedCount = screen.getAllByText('1').find(el => 
        el.closest('.text-green-600')
      )
      expect(resolvedCount).toBeInTheDocument()
    })

    it('should be able to resolve errors from any user', async () => {
      mockSupabaseRpc.mockImplementation((functionName, params) => {
        if (functionName === 'get_recent_errors') {
          return Promise.resolve({
            data: mockErrorLogsFromMultipleUsers,
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

      const user = userEvent.setup()
      render(<ErrorLogsViewer />)

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.getByText('Error from regular user 1')).toBeInTheDocument()
      })

      // Click on an error from a different user
      await user.click(screen.getByText('Error from regular user 1'))

      // Wait for error details to appear
      await waitFor(() => {
        expect(screen.getByText('Resolve Error')).toBeInTheDocument()
      })

      // Click resolve button
      await user.click(screen.getByText('Resolve Error'))

      // Verify resolve function was called
      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith('resolve_error', { error_id: '2' })
      })
    })
  })

  describe('Error Log Filtering and Display', () => {
    it('should handle permission errors gracefully', async () => {
      // Mock permission error (simulating non-super-admin access)
      mockSupabaseRpc.mockImplementation((functionName) => {
        if (functionName === 'get_recent_errors') {
          return Promise.resolve({
            data: null,
            error: new Error('Only super admins can access error logs')
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      render(<ErrorLogsViewer />)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch error logs/)).toBeInTheDocument()
        expect(screen.getByText(/Only super admins can access error logs/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Log Filtering and Display', () => {
    it('should correctly filter errors by severity across all users', async () => {
      mockSupabaseRpc.mockImplementation((functionName) => {
        if (functionName === 'get_recent_errors') {
          return Promise.resolve({
            data: mockErrorLogsFromMultipleUsers,
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const user = userEvent.setup()
      render(<ErrorLogsViewer />)

      // Wait for errors to load
      await waitFor(() => {
        expect(screen.getByText('Error from super admin user')).toBeInTheDocument()
      })

      // Filter by critical severity
      await user.click(screen.getByDisplayValue('All Severities'))
      await user.click(screen.getByText('Critical'))

      // Should only show critical error from user-2
      expect(screen.getByText('Error from regular user 2')).toBeInTheDocument()
      expect(screen.queryByText('Error from super admin user')).not.toBeInTheDocument()
      expect(screen.queryByText('Error from regular user 1')).not.toBeInTheDocument()
    })

    it('should show errors from different time ranges', async () => {
      mockSupabaseRpc.mockImplementation((functionName, params) => {
        if (functionName === 'get_recent_errors') {
          // Simulate different results based on time range
          if (params?.hours_back === 1) {
            return Promise.resolve({
              data: mockErrorLogsFromMultipleUsers.slice(0, 1), // Only most recent
              error: null
            })
          }
          return Promise.resolve({
            data: mockErrorLogsFromMultipleUsers,
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const user = userEvent.setup()
      render(<ErrorLogsViewer />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument()
      })

      // Change time range to last hour
      await user.click(screen.getByDisplayValue('Last 24 Hours'))
      await user.click(screen.getByText('Last Hour'))

      // Should call function with different parameter
      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith('get_recent_errors', { hours_back: 1 })
      })

      // Should show fewer errors
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument() // Updated total count
      })
    })
  })

  describe('Real Database Integration Scenarios', () => {
    it('should handle empty error logs gracefully', async () => {
      mockSupabaseRpc.mockImplementation((functionName) => {
        if (functionName === 'get_recent_errors') {
          return Promise.resolve({
            data: [],
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      render(<ErrorLogsViewer />)

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Total errors count
      })

      // Should show empty state or no error rows
      expect(screen.queryByText('Error from')).not.toBeInTheDocument()
    })

    it('should refresh data and maintain cross-user visibility', async () => {
      let callCount = 0
      mockSupabaseRpc.mockImplementation((functionName) => {
        if (functionName === 'get_recent_errors') {
          callCount++
          if (callCount === 1) {
            // First call - show 2 errors
            return Promise.resolve({
              data: mockErrorLogsFromMultipleUsers.slice(0, 2),
              error: null
            })
          } else {
            // Second call - show all errors (simulating new errors added)
            return Promise.resolve({
              data: mockErrorLogsFromMultipleUsers,
              error: null
            })
          }
        }
        return Promise.resolve({ data: null, error: null })
      })

      const user = userEvent.setup()
      render(<ErrorLogsViewer />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })

      // Click refresh button
      await user.click(screen.getByText('Refresh'))

      // Should show updated count
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument()
      })

      // Should still show errors from multiple users
      expect(screen.getByText('Error from super admin user')).toBeInTheDocument()
      expect(screen.getByText('Error from regular user 2')).toBeInTheDocument()
    })
  })
}) 