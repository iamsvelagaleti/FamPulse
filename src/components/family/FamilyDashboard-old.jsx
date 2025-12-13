import {useState, useEffect} from 'react'
import {useFamily} from '../../hooks/useFamily'
import {useAuth} from '../../contexts/AuthContext'
import JoinFamily from './JoinFamily'
import AddMemberModal from './AddMemberModal'

export default function FamilyDashboard({ isDark }) {
    const {user} = useAuth()
    const {
        families,
        currentFamily,
        familyMembers,
        loading,
        createFamily,
        updateMemberRole,
        removeMember,
        joinFamilyByCode,
        refreshFamilies
    } = useFamily()

    const [showCreateFamily, setShowCreateFamily] = useState(false)
    const [familyName, setFamilyName] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')
    const [showJoinFamily, setShowJoinFamily] = useState(false)
    const [showAddMember, setShowAddMember] = useState(false)
    const [selectedMember, setSelectedMember] = useState(null)

    const currentUserRole = familyMembers.find(m => m.user_id === user.id)?.role

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setSelectedMember(null)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    const handleCreateFamily = async (e) => {
        e.preventDefault()
        setError('')
        setCreating(true)

        const result = await createFamily(familyName)
        if (result.success) {
            setShowCreateFamily(false)
            setFamilyName('')
        } else {
            setError(result.error)
        }
        setCreating(false)
    }

    const handleRoleChange = async (memberId, newRole) => {
        const result = await updateMemberRole(memberId, newRole)
        if (!result.success) {
            alert('Failed to update role: ' + result.error)
        }
    }

    const handleRemoveMember = async (memberId) => {
        if (confirm('Are you sure you want to remove this member?')) {
            const result = await removeMember(memberId)
            if (!result.success) {
                alert('Failed to remove member: ' + result.error)
            }
        }
    }

    const canManageMember = (memberRole) => {
        if (currentUserRole === 'admin') return true
        if (currentUserRole === 'admin_lite' && memberRole === 'kid') return true
        return false
    }

    const handleInviteShare = (method) => {
        if (!currentFamily) return
        const message = `Join our family "${currentFamily.name}" on FamPulse! Use invite code: ${currentFamily.invite_code}\n\nSign up at: ${window.location.origin}`

        if (method === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
        } else if (method === 'sms') {
            window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank')
        } else if (method === 'copy') {
            navigator.clipboard.writeText(currentFamily.invite_code)
            alert('Invite code copied!')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 animate-fade-in">
                <div className="glass-card p-8">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-white text-center mt-4">Loading...</p>
                </div>
            </div>
        )
    }

    // No family - Create or Join
    if (families.length === 0) {
        return (
            <div className="max-w-md mx-auto animate-slide-up px-3 sm:px-4 py-4 sm:py-6">
                <div className="glass-card-light p-5 sm:p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 glass-card flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Get Started
                        </h2>
                        <p className="text-gray-600">
                            Create your family or join an existing one
                        </p>
                    </div>

                    {!showCreateFamily ? (
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowCreateFamily(true)}
                                className="btn-primary w-full ios-button"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Family
                                </span>
                            </button>
                            <button
                                onClick={() => setShowJoinFamily(true)}
                                className="btn-secondary w-full ios-button"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Join with Code
                                </span>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateFamily} className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Family Name
                                </label>
                                <input
                                    type="text"
                                    value={familyName}
                                    onChange={(e) => setFamilyName(e.target.value)}
                                    className="glass-input-light"
                                    placeholder="e.g., Smith Family"
                                    required
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                                    <p className="text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="btn-primary flex-1 ios-button"
                                >
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateFamily(false)}
                                    className="btn-secondary flex-1 ios-button"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {showJoinFamily && (
                    <JoinFamily
                        onClose={() => setShowJoinFamily(false)}
                        onJoined={() => window.location.reload()}
                    />
                )}
            </div>
        )
    }

    // Family Dashboard
    return (
        <div className="px-3 sm:px-4 py-4 sm:py-6">
            {/* Family Card */}
            <div className={`max-w-4xl mx-auto overflow-hidden rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white/80 backdrop-blur-xl'} shadow-lg`}>
                <div className="flex items-stretch">
                    <div className="flex items-center gap-6 overflow-x-auto p-4 sm:p-6 flex-1">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent flex-shrink-0">{currentFamily?.name}</h2>
                        <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-300 to-transparent flex-shrink-0"></div>
                        {familyMembers.map((member) => (
                            <div 
                                key={member.id} 
                                onClick={() => member.user.phone && member.user_id !== user.id && setSelectedMember(member)}
                                className={`flex flex-col items-center gap-2 min-w-[70px] ${member.user.phone && member.user_id !== user.id ? 'cursor-pointer' : ''}`}
                            >
                                <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-lg font-bold overflow-hidden shadow-lg ${member.user_id === user.id ? isDark ? 'ring-2 ring-white' : 'ring-2 ring-gray-800' : ''}`}>
                                    {member.user.avatar_url ? (
                                        <img src={member.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        member.user.full_name?.charAt(0) || 'U'
                                    )}
                                </div>
                                <p className={`text-xs font-semibold truncate max-w-[70px] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {member.user.full_name?.split(' ')[0]}
                                </p>
                            </div>
                        ))}
                    </div>
                    {(currentUserRole === 'admin' || currentUserRole === 'admin_lite') && (
                        <button
                            onClick={() => setShowAddMember(true)}
                            className="px-6 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-3xl font-bold hover:from-cyan-600 hover:to-teal-600 transition-all active:scale-95 flex-shrink-0"
                        >
                            +
                        </button>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showAddMember && (
                <AddMemberModal
                    familyId={currentFamily.id}
                    currentUserRole={currentUserRole}
                    onClose={() => setShowAddMember(false)}
                    onMemberAdded={refreshFamilies}
                />
            )}

            {selectedMember && (
                <div onClick={() => setSelectedMember(null)} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div onClick={(e) => e.stopPropagation()} className="glass-card-light p-6 max-w-sm w-full rounded-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Contact {selectedMember.user.full_name?.split(' ')[0]}</h3>
                        <div className="flex gap-3">
                            <a
                                href={`tel:${selectedMember.user.phone}`}
                                className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                                </svg>
                                Phone
                            </a>
                            <a
                                href={`https://wa.me/${selectedMember.user.phone.replace(/[^0-9+]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                                </svg>
                                WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
