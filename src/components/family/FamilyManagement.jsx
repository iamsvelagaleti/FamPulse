import {useFamily} from '../../hooks/useFamily'
import {useAuth} from '../../contexts/AuthContext'
import {useState, useEffect} from 'react'
import {supabase} from '../../supabaseClient'

export default function FamilyManagement({onClose}) {
    const {user} = useAuth()
    const {
        currentFamily,
        familyMembers,
        updateMemberRole,
        removeMember
    } = useFamily()
    const [isEditingName, setIsEditingName] = useState(false)
    const [familyName, setFamilyName] = useState(currentFamily?.name || '')
    const [showCopied, setShowCopied] = useState(false)

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (isEditingName) {
                    setIsEditingName(false)
                    setFamilyName(currentFamily?.name)
                } else {
                    onClose()
                }
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose, isEditingName, currentFamily?.name])

    const currentUserRole = familyMembers.find(m => m.user_id === user.id)?.role

    const handleUpdateFamilyName = async () => {
        if (!familyName.trim() || familyName === currentFamily?.name) {
            setIsEditingName(false)
            return
        }

        const { error } = await supabase
            .from('families')
            .update({ name: familyName })
            .eq('id', currentFamily.id)

        if (error) {
            alert('Failed to update family name: ' + error.message)
        } else {
            setIsEditingName(false)
            window.location.reload()
        }
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
        return currentUserRole === 'admin_lite' && memberRole === 'kid';

    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="modal-content max-w-2xl w-full max-h-[80vh] overflow-hidden"
                     onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            {isEditingName ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="text"
                                        value={familyName}
                                        onChange={(e) => setFamilyName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateFamilyName()}
                                        className="text-2xl font-bold text-gray-900 border-b-2 border-cyan-500 outline-none px-2 bg-white/50 rounded-t-lg"
                                        autoFocus
                                    />
                                    <button onClick={handleUpdateFamilyName} className="p-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </button>
                                    <button onClick={() => { setIsEditingName(false); setFamilyName(currentFamily?.name) }} className="p-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                                    Manage <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">{currentFamily?.name}</span>
                                    {currentUserRole === 'admin' && (
                                        <button onClick={() => { setFamilyName(currentFamily?.name || ''); setIsEditingName(true); }} className="p-1 hover:bg-gray-100 rounded-lg transition ml-1" title="Edit family name">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    )}
                                </h2>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-xl transition ios-button"
                            >
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="p-6 overflow-y-auto max-h-[60vh] ios-scrollbar">
                        {(currentUserRole === 'admin' || currentUserRole === 'admin_lite') && (
                            <div className="p-3 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">Invite Code:</span>
                                        <span className="text-lg font-mono font-bold text-gray-900 tracking-wider">
                                            {currentFamily.invite_code}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const message = `Join our family "${currentFamily.name}" on FamPulse! Use invite code: ${currentFamily.invite_code}\n\nSign up at: ${window.location.origin}`
                                                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
                                            }}
                                            className="p-2 bg-green-500 text-white rounded-xl ios-button"
                                            title="Share via WhatsApp"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(currentFamily.invite_code)
                                                setShowCopied(true)
                                                setTimeout(() => setShowCopied(false), 2000)
                                            }}
                                            className="p-2 bg-gray-500 text-white rounded-xl ios-button"
                                            title="Copy code"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 text-left">
                                Family Members ({familyMembers.length})
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {familyMembers.map((member) => (
                                <div
                                    key={member.id}
                                    className="glass-card p-4 hover:bg-white/15 transition ios-button"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="avatar overflow-hidden">
                                                {member.user.avatar_url ? (
                                                    <img src={member.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    member.user.full_name?.charAt(0) || 'U'
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {member.user.full_name}
                                                    {member.user_id === user.id && (
                                                        <span className="text-sm text-gray-500 ml-2">(You)</span>
                                                    )}
                                                </p>
                                                {member.user.phone && member.user_id !== user.id && (
                                                    <a href={`tel:${member.user.phone}`} className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1 mt-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        {member.user.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {currentUserRole === 'admin' && member.user_id !== user.id && canManageMember(member.role) && (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                    className={`text-sm font-semibold border-2 rounded-xl px-3 py-1.5 focus:ring-2 ios-button ${
                                                        member.role === 'admin_lite' 
                                                            ? 'bg-orange-50 border-orange-300 text-orange-700 focus:ring-orange-500' 
                                                            : 'bg-teal-50 border-teal-300 text-teal-700 focus:ring-teal-500'
                                                    }`}
                                                >
                                                    <option value="admin_lite">Admin Lite</option>
                                                    <option value="kid">Kid</option>
                                                </select>
                                            )}

                                            {!canManageMember(member.role) || member.user_id === user.id ? (
                                                <span className={`badge ${
                                                    member.role === 'admin' ? 'badge-admin' :
                                                        member.role === 'admin_lite' ? 'badge-admin-lite' :
                                                            'badge-kid'
                                                }`}>
                                                    {member.role === 'admin' ? 'Admin' :
                                                        member.role === 'admin_lite' ? 'Admin Lite' :
                                                            'Kid'}
                                                </span>
                                            ) : null}

                                            {canManageMember(member.role) && member.user_id !== user.id && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition ios-button"
                                                    title="Remove member"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth={2}
                                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Copied Toast */}
                    {showCopied && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-cyan-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium animate-fade-in z-10">
                            ✓ Code copied!
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
