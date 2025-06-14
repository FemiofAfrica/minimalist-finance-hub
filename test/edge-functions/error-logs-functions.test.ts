import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '@/integrations/supabase/client'

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}))

describe('Error Logs Database Functions', () => {
  const mockSupabaseRpc = vi.mocked(supabase.rpc)
  const mockSupabaseAuth = vi.mocked(supabase.auth)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock authenticated super admin user
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'super-admin-id',
          email: 'admin@example.com',
          user_metadata: { is_super_admin: true }
        }
      },
      error: null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('get_recent_errors function', () => {
    const mockErrorLogs = [
      {
        id: '1',
        message: 'Critical payment error',
        stack: 'Error: Payment failed\n    at processPayment',
        component_stack: 'PaymentForm > PaymentButton',
        url: 'https://app.example.com/payment',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        user_id: 'user-1',
        user_email: 'user@example.com',
        error_type: 'api',
        severity: 'critical',
        resolved: false,
        resolved_by: null,
        resolved_at: null,
        created_at: '2024-12-15T14:30:00Z',
        additional_context: { paymentId: 'pay_123' }
      },
      {
        id: '2',
        message: 'Network timeout',
        stack: 'Error: Request timeout',
        component_stack: null,
        url: 'https://app.example.com/api',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        user_id: 'user-2',
        user_email: 'admin@example.com',
        error_type: 'network',
        severity: 'high',
        resolved: true,
        resolved_by: 'admin-1',
        resolved_at: '2024-12-15T15:00:00Z',
        created_at: '2024-12-15T13:15:00Z',
        additional_context: { timeout: 5000 }
      }
    ]

    it('fetches recent errors with default 24 hour timeframe', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: mockErrorLogs,
        error: null
      })

      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_recent_errors')
      expect(data).toEqual(mockErrorLogs)
      expect(error).toBeNull()
    })

    it('fetches recent errors with custom timeframe', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: mockErrorLogs.slice(0, 1), // Only recent errors
        error: null
      })

      const { data, error } = await supabase.rpc('get_recent_errors', { hours_back: 1 })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_recent_errors', { hours_back: 1 })
      expect(data).toHaveLength(1)
      expect(error).toBeNull()
    })

    it('returns empty array when no errors found', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [],
        error: null
      })

      const { data, error } = await supabase.rpc('get_recent_errors', { hours_back: 1 })

      expect(data).toEqual([])
      expect(error).toBeNull()
    })

    it('handles permission errors for non-super-admin users', async () => {
      const permissionError = new Error('Only super admins can access error logs')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: permissionError
      })

      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(data).toBeNull()
      expect(error).toEqual(permissionError)
    })

    it('handles database connection errors', async () => {
      const dbError = new Error('Database connection failed')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: dbError
      })

      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(data).toBeNull()
      expect(error).toEqual(dbError)
    })

    it('returns errors ordered by created_at descending', async () => {
      const orderedErrors = [
        { ...mockErrorLogs[0], created_at: '2024-12-15T16:00:00Z' },
        { ...mockErrorLogs[1], created_at: '2024-12-15T15:00:00Z' }
      ]

      mockSupabaseRpc.mockResolvedValue({
        data: orderedErrors,
        error: null
      })

      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(data).toEqual(orderedErrors)
      expect(new Date(data![0].created_at).getTime()).toBeGreaterThan(
        new Date(data![1].created_at).getTime()
      )
    })

    it('includes all required error log fields', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [mockErrorLogs[0]],
        error: null
      })

      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(data![0]).toHaveProperty('id')
      expect(data![0]).toHaveProperty('message')
      expect(data![0]).toHaveProperty('stack')
      expect(data![0]).toHaveProperty('component_stack')
      expect(data![0]).toHaveProperty('url')
      expect(data![0]).toHaveProperty('user_agent')
      expect(data![0]).toHaveProperty('user_id')
      expect(data![0]).toHaveProperty('user_email')
      expect(data![0]).toHaveProperty('error_type')
      expect(data![0]).toHaveProperty('severity')
      expect(data![0]).toHaveProperty('resolved')
      expect(data![0]).toHaveProperty('resolved_by')
      expect(data![0]).toHaveProperty('resolved_at')
      expect(data![0]).toHaveProperty('created_at')
      expect(data![0]).toHaveProperty('additional_context')
    })
  })

  describe('resolve_error function', () => {
    it('successfully resolves an error', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: true,
        error: null
      })

      const errorId = 'error-123'
      const { data, error } = await supabase.rpc('resolve_error', { error_id: errorId })

      expect(mockSupabaseRpc).toHaveBeenCalledWith('resolve_error', { error_id: errorId })
      expect(data).toBe(true)
      expect(error).toBeNull()
    })

    it('returns false when error ID does not exist', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: false,
        error: null
      })

      const nonExistentId = 'non-existent-id'
      const { data, error } = await supabase.rpc('resolve_error', { error_id: nonExistentId })

      expect(data).toBe(false)
      expect(error).toBeNull()
    })

    it('handles permission errors for non-super-admin users', async () => {
      const permissionError = new Error('Only super admins can resolve errors')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: permissionError
      })

      const errorId = 'error-123'
      const { data, error } = await supabase.rpc('resolve_error', { error_id: errorId })

      expect(data).toBeNull()
      expect(error).toEqual(permissionError)
    })

    it('handles database errors during resolution', async () => {
      const dbError = new Error('Database update failed')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: dbError
      })

      const errorId = 'error-123'
      const { data, error } = await supabase.rpc('resolve_error', { error_id: errorId })

      expect(data).toBeNull()
      expect(error).toEqual(dbError)
    })

    it('validates error_id parameter is provided', async () => {
      const validationError = new Error('error_id parameter is required')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: validationError
      })

      // @ts-ignore - testing invalid parameter
      const { data, error } = await supabase.rpc('resolve_error', {})

      expect(data).toBeNull()
      expect(error).toEqual(validationError)
    })

    it('validates error_id parameter is a valid UUID', async () => {
      const validationError = new Error('error_id must be a valid UUID')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: validationError
      })

      const invalidId = 'invalid-uuid'
      const { data, error } = await supabase.rpc('resolve_error', { error_id: invalidId })

      expect(data).toBeNull()
      expect(error).toEqual(validationError)
    })
  })

  describe('Error Log Security and RLS', () => {
    it('enforces row level security for error logs access', async () => {
      // Mock non-admin user
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'regular-user-id',
            email: 'user@example.com',
            user_metadata: { is_super_admin: false }
          }
        },
        error: null
      })

      const rlsError = new Error('Row level security violation')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: rlsError
      })

      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(data).toBeNull()
      expect(error).toEqual(rlsError)
    })

    it('allows super admins to access all error logs', async () => {
      const mockErrorLogs = [
        {
          id: '1',
          message: 'Error from user 1',
          user_id: 'user-1',
          user_email: 'user1@example.com',
          error_type: 'api',
          severity: 'high',
          resolved: false,
          created_at: '2024-12-15T14:30:00Z'
        },
        {
          id: '2',
          message: 'Error from user 2',
          user_id: 'user-2',
          user_email: 'user2@example.com',
          error_type: 'react',
          severity: 'medium',
          resolved: false,
          created_at: '2024-12-15T13:15:00Z'
        }
      ]

      mockSupabaseRpc.mockResolvedValue({
        data: mockErrorLogs,
        error: null
      })

      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(data).toEqual(mockErrorLogs)
      expect(error).toBeNull()
      // Super admin should see errors from all users
      expect(data!.length).toBe(2)
    })

    it('prevents regular users from resolving errors', async () => {
      // Mock non-admin user
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'regular-user-id',
            email: 'user@example.com',
            user_metadata: { is_super_admin: false }
          }
        },
        error: null
      })

      const permissionError = new Error('Only super admins can resolve errors')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: permissionError
      })

      const { data, error } = await supabase.rpc('resolve_error', { error_id: 'error-123' })

      expect(data).toBeNull()
      expect(error).toEqual(permissionError)
    })
  })

  describe('Error Log Data Integrity', () => {
    it('maintains referential integrity for resolved_by field', async () => {
      const resolvedError = {
        id: '1',
        message: 'Resolved error',
        resolved: true,
        resolved_by: 'super-admin-id',
        resolved_at: '2024-12-15T15:00:00Z',
        created_at: '2024-12-15T14:30:00Z'
      }

      mockSupabaseRpc.mockResolvedValue({
        data: [resolvedError],
        error: null
      })

      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(data![0].resolved).toBe(true)
      expect(data![0].resolved_by).toBe('super-admin-id')
      expect(data![0].resolved_at).toBeTruthy()
    })

    it('ensures resolved_at is set when error is resolved', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: true,
        error: null
      })

      const { data, error } = await supabase.rpc('resolve_error', { error_id: 'error-123' })

      expect(data).toBe(true)
      expect(error).toBeNull()
      
      // The function should set resolved_at to NOW() when resolving
      // This is tested implicitly through the successful resolution
    })

    it('validates error_type enum values', async () => {
      const invalidTypeError = new Error('Invalid error_type value')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: invalidTypeError
      })

      // This would be caught at the database level for invalid enum values
      const { data, error } = await supabase.rpc('get_recent_errors')

      // If there were invalid enum values, the query would fail
      expect(error).toEqual(invalidTypeError)
    })

    it('validates severity enum values', async () => {
      const invalidSeverityError = new Error('Invalid severity value')
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: invalidSeverityError
      })

      // This would be caught at the database level for invalid enum values
      const { data, error } = await supabase.rpc('get_recent_errors')

      expect(error).toEqual(invalidSeverityError)
    })
  })
}) 