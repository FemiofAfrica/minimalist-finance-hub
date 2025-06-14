import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RefreshCw, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import errorNotificationService from '@/services/errorNotificationService'

interface ErrorLog {
  id: string
  message: string
  stack?: string
  component_stack?: string
  url: string
  user_agent?: string
  user_id?: string
  user_email?: string
  error_type: 'javascript' | 'api' | 'network' | 'react' | 'unhandled'
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
  resolved_by?: string
  created_at: string
  additional_context?: any
}

interface ErrorStats {
  total: number
  critical: number
  unresolved: number
  resolved: number
}

const ErrorLogsViewer: React.FC = () => {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [timeRange, setTimeRange] = useState('24')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stats, setStats] = useState<ErrorStats>({ total: 0, critical: 0, unresolved: 0, resolved: 0 })

  const fetchErrorLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .rpc('get_recent_errors', { hours_back: parseInt(timeRange) })

      if (supabaseError) {
        throw supabaseError
      }

      const logs = data || []
      setErrorLogs(logs)

      // Calculate stats
      const total = logs.length
      const critical = logs.filter((log: ErrorLog) => log.severity === 'critical').length
      const unresolved = logs.filter((log: ErrorLog) => !log.resolved).length
      const resolved = logs.filter((log: ErrorLog) => log.resolved).length

      setStats({ total, critical, unresolved, resolved })
    } catch (err) {
      console.error('Error fetching error logs:', err)
      setError(`Failed to fetch error logs: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const resolveError = async (errorId: string) => {
    try {
      const { error: supabaseError } = await supabase
        .rpc('resolve_error', { error_id: errorId })

      if (supabaseError) {
        throw supabaseError
      }

      // Refresh the error logs
      await fetchErrorLogs()
      setSelectedError(null)
    } catch (err) {
      console.error('Error resolving error:', err)
      setError(`Failed to resolve error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  useEffect(() => {
    fetchErrorLogs()
  }, [timeRange])

  const filteredErrors = errorLogs.filter(log => {
    if (severityFilter !== 'all' && log.severity !== severityFilter) return false
    if (typeFilter !== 'all' && log.error_type !== typeFilter) return false
    return true
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      case 'low': return <CheckCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">🚨 Error Logs</h2>
        <p className="text-muted-foreground">Monitor and manage application errors</p>
        <div className="flex justify-center gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={fetchErrorLogs}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Errors</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
            </div>
            <XCircle className="h-8 w-8 text-destructive" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unresolved</p>
              <p className="text-2xl font-bold text-warning">{stats.unresolved}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <label className="block text-sm font-medium mb-2">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last Hour</SelectItem>
                  <SelectItem value="6">Last 6 Hours</SelectItem>
                  <SelectItem value="24">Last 24 Hours</SelectItem>
                  <SelectItem value="168">Last Week</SelectItem>
                  <SelectItem value="720">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-center">
              <label className="block text-sm font-medium mb-2">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-center">
              <label className="block text-sm font-medium mb-2">Error Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="react">React</SelectItem>
                  <SelectItem value="unhandled">Unhandled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-center">
              <label className="block text-sm font-medium mb-2">Actions</label>
              <Button 
                onClick={fetchErrorLogs} 
                disabled={loading}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="mt-2 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Error Logs List */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Error Logs ({filteredErrors.length})</CardTitle>
          <CardDescription>
            Click on an error to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading error logs...</span>
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No errors found for the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredErrors.map((log) => (
                <Card
                  key={log.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedError?.id === log.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedError(selectedError?.id === log.id ? null : log)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getSeverityColor(log.severity)} className="flex items-center gap-1">
                            {getSeverityIcon(log.severity)}
                            {log.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{log.error_type}</Badge>
                          {log.resolved && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm mb-1 truncate">{log.message}</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>📅 {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</p>
                          <p>🌐 {log.url}</p>
                          {log.user_email && <p>👤 {log.user_email}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Details Modal */}
      {selectedError && (
        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              Error Details
              <Badge variant={getSeverityColor(selectedError.severity)}>
                {selectedError.severity.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              {format(new Date(selectedError.created_at), 'MMMM dd, yyyy HH:mm:ss')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Error Message</label>
              <Textarea
                value={selectedError.message}
                readOnly
                className="min-h-[60px]"
              />
            </div>

            {selectedError.stack && (
              <div>
                <label className="block text-sm font-medium mb-2">Stack Trace</label>
                <Textarea
                  value={selectedError.stack}
                  readOnly
                  className="min-h-[120px] font-mono text-xs"
                />
              </div>
            )}

            {selectedError.component_stack && (
              <div>
                <label className="block text-sm font-medium mb-2">Component Stack</label>
                <Textarea
                  value={selectedError.component_stack}
                  readOnly
                  className="min-h-[80px] font-mono text-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">URL</label>
                <p className="text-sm bg-muted p-2 rounded break-all">{selectedError.url}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Error Type</label>
                <Badge variant="outline">{selectedError.error_type}</Badge>
              </div>
            </div>

            {selectedError.user_email && (
              <div>
                <label className="block text-sm font-medium mb-2">User</label>
                <p className="text-sm bg-muted p-2 rounded">{selectedError.user_email}</p>
              </div>
            )}

            {selectedError.user_agent && (
              <div>
                <label className="block text-sm font-medium mb-2">User Agent</label>
                <p className="text-sm bg-muted p-2 rounded break-all">{selectedError.user_agent}</p>
              </div>
            )}

            {selectedError.additional_context && (
              <div>
                <label className="block text-sm font-medium mb-2">Additional Context</label>
                <Textarea
                  value={JSON.stringify(selectedError.additional_context, null, 2)}
                  readOnly
                  className="min-h-[80px] font-mono text-xs"
                />
              </div>
            )}

            <div className="flex justify-center gap-4 pt-4">
              {!selectedError.resolved && (
                <Button
                  onClick={() => resolveError(selectedError.id)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark as Resolved
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedError(null)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ErrorLogsViewer
