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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Add Family Member</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="+91 9876543210"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={handleSearchUser}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                            >
                                Search
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Search for existing user or add new member via WhatsApp
                        </p>
                    </div>

                    {searchResult && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 font-medium">
                                {searchResult.notRegistered ? (
                                    `Ready to invite ${phone} via WhatsApp`
                                ) : (
                                    `Found: ${searchResult.full_name} (${searchResult.email})`
                                )}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleAddMember}
                            disabled={loading || !searchResult}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
                        >
                            {loading ? 'Processing...' : '📱 Send via WhatsApp'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}