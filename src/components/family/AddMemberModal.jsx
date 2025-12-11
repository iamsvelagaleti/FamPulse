import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function AddMemberModal({ familyId, currentUserRole, onClose, onMemberAdded }) {
    const { profile } = useAuth()
    const [phone, setPhone] = useState('')
    const [role, setRole] = useState('kid')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchResult, setSearchResult] = useState(null)

    const handleSearchUser = async () => {
        if (!phone.trim()) {
            setError('Please enter a phone number')
            return
        }

        setLoading(true)
        setError('')
        setSearchResult(null)

        try {
            // Search for user in profiles by phone
            const { data, error: searchError } = await supabase
                .from('profiles')
                .select('id, email, full_name, phone')
                .eq('phone', phone.trim())
                .single()

            if (searchError) {
                if (searchError.code === 'PGRST116') {
                    // User not found - allow adding with phone number
                    setError('User not registered yet. You can still send invite via WhatsApp.')
                    setSearchResult({ phone: phone.trim(), notRegistered: true })
                    return
                } else {
                    throw searchError
                }
            }

            // Check if user is already in the family
            const { data: existingMember } = await supabase
                .from('family_members')
                .select('id')
                .eq('family_id', familyId)
                .eq('user_id', data.id)
                .single()

            if (existingMember) {
                setError('This user is already a member of your family')
                return
            }

            setSearchResult(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const sendWhatsAppInvite = (phoneNumber, inviteCode, familyName) => {
        // Remove any spaces or special characters from phone
        const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '')
        
        // Create invite message
        const message = `Hi! You've been invited to join "${familyName}" on Fam Pulse 👨‍👩‍👧‍👦

Your invite code: ${inviteCode}

Steps to join:
1. Sign up at: ${window.location.origin}
2. Click "Join Family with Code"
3. Enter code: ${inviteCode}

Welcome to the family! 🎉`
        
        // Encode message for URL
        const encodedMessage = encodeURIComponent(message)
        
        // Open WhatsApp
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`
        window.open(whatsappUrl, '_blank')
    }

    const handleAddMember = async () => {
        if (!searchResult) return

        setLoading(true)
        setError('')

        try {
            // If user is registered, add them to family
            if (!searchResult.notRegistered) {
                const { error: insertError } = await supabase
                    .from('family_members')
                    .insert([{
                        family_id: familyId,
                        user_id: searchResult.id,
                        role: role
                    }])

                if (insertError) throw insertError
            }

            // Get family details for WhatsApp message
            const { data: familyData } = await supabase
                .from('families')
                .select('name, invite_code')
                .eq('id', familyId)
                .single()

            // Send WhatsApp invite
            sendWhatsAppInvite(
                searchResult.phone || phone,
                familyData.invite_code,
                familyData.name
            )

            // Show success message
            alert(`WhatsApp opened! Share the invite code: ${familyData.invite_code}`)

            onMemberAdded()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Add Family Member</h3>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {!profile?.phone && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                        <p className="text-sm text-yellow-800">
                            ⚠️ Please add your phone number to use WhatsApp invites.
                            <button 
                                onClick={() => {
                                    onClose()
                                    // This will be handled by parent component to show edit profile
                                }}
                                className="ml-2 text-yellow-900 underline"
                            >
                                Add Phone
                            </button>
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                            Phone Number
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                                className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-white/40 text-white placeholder-white/60"
                                placeholder="+91 9876543210"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={handleSearchUser}
                                disabled={loading}
                                className="px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-white/30 disabled:opacity-50 transition border border-white/30 font-medium"
                            >
                                Search
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Search for existing user or add new member via WhatsApp
                        </p>
                    </div>

                    {searchResult && (
                        <div className="p-4 bg-green-500/20 backdrop-blur-md border border-green-400/30 rounded-2xl">
                            <p className="text-sm text-green-200 font-medium">
                                {searchResult.notRegistered ? (
                                    `Ready to invite ${phone} via WhatsApp`
                                ) : (
                                    `Found: ${searchResult.full_name} (${searchResult.email})`
                                )}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-white/40 text-white"
                        >
                            {currentUserRole === 'admin' && (
                                <option value="admin_lite">Admin Lite</option>
                            )}
                            <option value="kid">Kid</option>
                        </select>
                        {currentUserRole === 'admin' && (
                            <p className="text-xs text-gray-500 mt-1">
                                Note: Only one Admin is allowed per family. You can add Admin Lite members who can manage kids.
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-2xl">
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleAddMember}
                            disabled={loading || !searchResult}
                            className="flex-1 bg-green-500/30 backdrop-blur-md text-white py-3 rounded-2xl font-semibold hover:bg-green-500/40 disabled:opacity-50 transition border border-green-400/50"
                        >
                            {loading ? 'Processing...' : '📱 Send via WhatsApp'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white/20 backdrop-blur-md text-white py-3 rounded-2xl font-semibold hover:bg-white/30 transition border border-white/30"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}