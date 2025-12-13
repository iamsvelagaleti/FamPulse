import { supabase } from '../supabaseClient'

export const notificationService = {
  async notifyFamily(familyId, actorId, actionType, message) {
    try {
      await supabase.rpc('notify_family_members', {
        p_family_id: familyId,
        p_actor_id: actorId,
        p_action_type: actionType,
        p_message: message
      })
    } catch (error) {
      console.error('Notification error:', error)
    }
  },

  async getNotifications(userId, limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:profiles!actor_id(full_name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  async markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) throw error
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
  },

  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
    return count
  },

  subscribeToNotifications(userId, callback) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }
}
