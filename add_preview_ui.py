import re

with open('src/components/admin/NotificationTestCenter.tsx', 'r') as f:
    content = f.read()

# Add preview UI after the segment warning messages and before the send button
preview_ui = '''              {/* Segment Preview */}
              {users.length > 0 && (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">📊 Target Preview</h4>
                  {previewLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-green-700">Calculating target users...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-green-800 font-medium">
                        📈 {previewCount} user{previewCount !== 1 ? 's' : ''} will receive this notification
                      </p>
                      {previewUsers.length > 0 && (
                        <div className="text-xs text-green-700">
                          <p className="mb-1">👥 Sample users:</p>
                          <div className="space-y-1">
                            {previewUsers.map((user, index) => (
                              <div key={user.id} className="flex items-center justify-center gap-2">
                                <span>{getUserDisplayName(user)}</span>
                                <span className="text-green-600">({user.email})</span>
                              </div>
                            ))}
                            {previewCount > 5 && (
                              <p className="text-green-600 italic">...and {previewCount - 5} more</p>
                            )}
                          </div>
                        </div>
                      )}
                      {previewCount === 0 && (
                        <p className="text-sm text-amber-700">⚠️ No users match the current criteria</p>
                      )}
                    </div>
                  )}
                </div>
              )}

'''

# Find the position before the send button in segment section
send_button_pattern = r'(\s+<div className="text-center">\s+<Button[^>]*onClick=\{\(\) => sendNotification\(\'segment\'\)\})'

content = re.sub(send_button_pattern, preview_ui + r'\1', content)

with open('src/components/admin/NotificationTestCenter.tsx', 'w') as f:
    f.write(content)

print('Added preview UI to User Segment section') 