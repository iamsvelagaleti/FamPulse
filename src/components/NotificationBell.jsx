import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { notificationService } from '../services/notificationService'

export default function NotificationBell({ isDark }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (!user) return

    loadNotifications()
    
    const subscription = notificationService.subscribeToNotifications(user.id, () => {
      loadNotifications()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const loadNotifications = async () => {
    const data = await notificationService.getNotifications(user.id)
    setNotifications(data)
    const count = await notificationService.getUnreadCount(user.id)
    setUnreadCount(count)
  }

  const handleMarkAsRead = async (id) => {
    await notificationService.markAsRead(id)
    loadNotifications()
  }

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(user.id)
    loadNotifications()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2 rounded-xl transition-all ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
      >
        <svg className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-800'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div onClick={() => setShowDropdown(false)} className="fixed inset-0 z-40" />
          <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`sticky top-0 p-4 border-b flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} className="text-xs text-cyan-500 hover:text-cyan-600">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                    className={`p-4 cursor-pointer transition-colors ${!notif.read ? (isDark ? 'bg-cyan-500/10' : 'bg-cyan-50') : ''} ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{notif.message}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
