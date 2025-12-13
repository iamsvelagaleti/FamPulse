import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function AddMemberModal({ familyId, currentUserRole, onClose, onMemberAdded }) {
    const { profile } = useAuth()

    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])
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
            const { data, error: searchError } = await supabase
                .from('profiles')
                .select('id, email, full_name, phone')
                .eq('phone', phone.trim())
                .single()

            if (searchError) {
                if (searchError.code === 'PGRST116') {
                    setError('User not registered yet. You can still send invite via WhatsApp.')
                    setSearchResult({ phone: phone.trim(), notRegistered: true })
                    return
                } else {
                    throw searchError
                }
            }

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
        const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '')
        const message = `Hi! You've been invited to join "${familyName}" on FamPulse 👨👩👧👦

Your invite code: ${inviteCode}

Steps to join:
1. Sign up at: ${window.location.origin}
2. Click "Join Family with Code"
3. Enter code: ${inviteCode}

Welcome to the family! 🎉`

        const encodedMessage = encodeURIComponent(message)
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`
        window.open(whatsappUrl, '_blank')
    }

    const handleAddMember = async () => {
        if (!searchResult) return

        setLoading(true)
        setError('')

        try {
            if (!searchResult.notRegistered) {
                const { error: insertError } = await supabase
                    .from('family_members')
                    .insert([{
                        family_id: familyId,
                        user_id: searchResult.id,
                        role: role
                    }])

                if (insertError) throw insertError

                alert('Member added successfully!')
                onMemberAdded()
                onClose()
                return
            }

            const { data: familyData } = await supabase
                .from('families')
                .select('name, invite_code')
                .eq('id', familyId)
                .single()

            sendWhatsAppInvite(
                searchResult.phone || phone,
                familyData.invite_code,
                familyData.name
            )

            alert(`WhatsApp opened! They need to sign up first, then use invite code: ${familyData.invite_code}`)
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Add Member</h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition ios-button"
                        >
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {!profile?.phone && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl mb-5">
                            <p className="text-sm text-yellow-800 font-medium">
                                ⚠️ Please add your phone number in your profile to use WhatsApp invites.
                            </p>
                        </div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                Phone Number
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                                    className="glass-input-light flex-1"
                                    placeholder="+91 9876543210"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={handleSearchUser}
                                    disabled={loading}
                                    className="btn-glass px-6 ios-button"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                                    ) : 'Search'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Search for existing user or invite new member via WhatsApp
                            </p>
                        </div>

                        {searchResult && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl animate-fade-in">
                                <p className="text-sm text-green-700 font-medium">
                                    {searchResult.notRegistered ? (
                                        `Ready to invite ${phone} via WhatsApp`
                                    ) : (
                                        `Found: ${searchResult.full_name} (${searchResult.email})`
                                    )}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="glass-input-light"
                            >
                                {currentUserRole === 'admin' && (
                                    <option value="admin_lite">Admin Lite</option>
                                )}
                                <option value="kid">Kid</option>
                            </select>
                            {currentUserRole === 'admin' && (
                                <p className="text-xs text-gray-500">
                                    Note: Only one Admin is allowed per family. You can add Admin Lite members who can manage kids.
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleAddMember}
                                disabled={loading || !searchResult}
                                className="btn-primary flex-1 ios-button"
                            >
                                {loading ? 'Processing...' : (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                                        </svg>
                                        Send via WhatsApp
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-secondary flex-1 ios-button"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
