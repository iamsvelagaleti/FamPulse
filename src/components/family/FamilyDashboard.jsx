import {useState} from 'react'
import {useFamily} from '../../hooks/useFamily'
import {useAuth} from '../../contexts/AuthContext'
import JoinFamily from './JoinFamily'
import AddMemberModal from './AddMemberModal'

export default function FamilyDashboard() {
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

    const currentUserRole = familyMembers.find(m => m.user_id === user.id)?.role

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
            <div className="max-w-md mx-auto animate-slide-up">
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
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-slide-up">
            {/* Family Header Card */}
            <div className="glass-card-light p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{currentFamily?.name}</h2>
                        <p className="text-gray-600 text-sm">{familyMembers.length} members</p>
                    </div>
                    {(currentUserRole === 'admin' || currentUserRole === 'admin_lite') && (
                        <button
                            onClick={() => setShowAddMember(true)}
                            className="btn-primary ios-button"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Add Member
                            </span>
                        </button>
                    )}
                </div>

                {/* Invite Code Section */}
                {(currentUserRole === 'admin' || currentUserRole === 'admin_lite') && (
                    <div className="glass-card p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-white/80 mb-1">Invite Code</p>
                                <p className="text-2xl font-mono font-bold text-white tracking-wider">
                                    {currentFamily?.invite_code}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleInviteShare('whatsapp')}
                                    className="p-3 glass-card hover:bg-white/20 transition ios-button"
                                    title="Share via WhatsApp"
                                >
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleInviteShare('copy')}
                                    className="p-3 glass-card hover:bg-white/20 transition ios-button"
                                    title="Copy code"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Members List */}
            <div className="glass-card-light p-4 sm:p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Family Members</h3>
                <div className="space-y-3">
                    {familyMembers.map((member) => (
                        <div
                            key={member.id}
                            className="glass-card p-4 hover:bg-white/15 transition ios-button"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="avatar">
                                        {member.user.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">
                                            {member.user.full_name}
                                            {member.user_id === user.id && (
                                                <span className="text-sm text-white/60 ml-2">(You)</span>
                                            )}
                                        </p>
                                        <p className="text-sm text-white/70">{member.user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={`badge ${
                                        member.role === 'admin' ? 'badge-admin' :
                                            member.role === 'admin_lite' ? 'badge-admin-lite' :
                                                'badge-kid'
                                    }`}>
                                        {member.role === 'admin' ? 'Admin' :
                                            member.role === 'admin_lite' ? 'Admin Lite' :
                                                'Kid'}
                                    </span>

                                    {canManageMember(member.role) && member.user_id !== user.id && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-600 rounded-xl transition ios-button"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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
        </div>
    )
}
