import re

with open('src/components/admin/NotificationTestCenter.tsx', 'r') as f:
    content = f.read()

# Add preview states
content = content.replace(
    'const [lastSentType, setLastSentType] = useState<string | null>(null)',
    '''const [lastSentType, setLastSentType] = useState<string | null>(null)
  
  // Preview state
  const [previewUsers, setPreviewUsers] = useState<User[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewCount, setPreviewCount] = useState(0)'''
)

# Add preview function before getUserDisplayName
getUserDisplayName_pattern = r'(\s+const getUserDisplayName = \(user: User\) => \{)'
preview_function = '''
  const previewSegmentUsers = async () => {
    if (segmentType === 'time_based') {
      try {
        setPreviewLoading(true)
        
        const now = new Date()
        let threshold = new Date()
        
        switch (durationUnit) {
          case 'hours':
            threshold.setHours(now.getHours() - parseInt(duration))
            break
          case 'days':
            threshold.setDate(now.getDate() - parseInt(duration))
            break
          case 'weeks':
            threshold.setDate(now.getDate() - (parseInt(duration) * 7))
            break
          case 'months':
            threshold.setMonth(now.getMonth() - parseInt(duration))
            break
        }

        const filteredUsers = users.filter(user => {
          const userCreatedAt = new Date(user.created_at || 0)
          return userCreatedAt >= threshold
        })

        setPreviewUsers(filteredUsers.slice(0, 5))
        setPreviewCount(filteredUsers.length)
      } catch (error) {
        console.error('Error previewing segment:', error)
      } finally {
        setPreviewLoading(false)
      }
    } else if (segmentType === 'all_users') {
      setPreviewUsers(users.slice(0, 5))
      setPreviewCount(users.length)
    } else if (segmentType === 'super_admins') {
      const superAdmins = users.filter(user => 
        user.raw_user_meta_data?.is_super_admin === true || 
        user.user_metadata?.is_super_admin === true
      )
      setPreviewUsers(superAdmins.slice(0, 5))
      setPreviewCount(superAdmins.length)
    }
  }

  // Update preview when segment parameters change
  useEffect(() => {
    if (users.length > 0) {
      previewSegmentUsers()
    }
  }, [segmentType, duration, durationUnit, users])

\\1'''

content = re.sub(getUserDisplayName_pattern, preview_function, content)

with open('src/components/admin/NotificationTestCenter.tsx', 'w') as f:
    f.write(content)

print('Added preview functionality to NotificationTestCenter') 