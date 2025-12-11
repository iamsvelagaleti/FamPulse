import {useState} from 'react'
import {useFamily} from '../../hooks/useFamily'
import {useAuth} from '../../contexts/AuthContext'

export default function FamilyDashboard() {
    const {user} = useAuth()
    const {
        families,
        currentFamily,
        familyMembers,
        loading,
        createFamily,
        updateMemberRole,
        removeMember
    } = useFamily()

    const [showCreateFamily, setShowCreateFamily] = useState(false)
    const [familyName, setFamilyName] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')

    // Get current user's role in the family
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

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800'
            case 'admin_lite':
                return 'bg-blue-100 text-blue-800'
            case 'kid':
                return 'bg-green-100 text-green-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin':
                return 'Admin'
            case 'admin_lite':
                return 'Admin Lite'
            case 'kid':
                return 'Kid'
            default:
                return role
        }
    }

    const canManageMember = (memberRole) => {
        if (currentUserRole === 'admin') return true
        if (currentUserRole === 'admin_lite' && memberRole === 'kid') return true
        return false
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    // No family exists - show create family
    if (families.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Create Your Family
                    </h2>
                    <p className="text-gray-600">
                        Get started by creating your family group
                    </p>
                </div>

                {!showCreateFamily ? (
                    <button
                        onClick={() => setShowCreateFamily(true)}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
                    >
                        + Create Family
                    </button>
                ) : (
                    <form onSubmit={handleCreateFamily} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Family Name
                            </label>
                            <input
                                type="text"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="e.g., Smith Family"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                            >
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateFamily(false)}
                                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        )
    }

    // Show family dashboard
    return (
        <div className="space-y-6">
            {/* Family Header */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {currentFamily?.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Your Role: <span className="font-medium">{getRoleLabel(currentUserRole)}</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Invite Code</p>
                        <p className="text-lg font-mono font-bold text-indigo-600">
                            {currentFamily?.invite_code}
                        </p>
                    </div>
                </div>
            </div>

            {/* Family Members */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">
                        Family Members ({familyMembers.length})
                    </h3>
                    {(currentUserRole === 'admin' || currentUserRole === 'admin_lite') && (
                        <button
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm">
                            + Add Member
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {familyMembers.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div
                                    className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {member.user.full_name?.charAt(0) || 'U'}
                                </div>

                                {/* Member Info */}
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {member.user.full_name}
                                        {member.user_id === user.id && (
                                            <span className="text-sm text-gray-500 ml-2">(You)</span>
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500">{member.user.email}</p>
                                </div>
                            </div>

                            {/* Role Badge and Actions */}
                            <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                  {getRoleLabel(member.role)}
                </span>

                                {/* Actions (only if can manage) */}
                                {canManageMember(member.role) && member.user_id !== user.id && (
                                    <div className="flex gap-2">
                                        {/* Role Change Dropdown */}
                                        {currentUserRole === 'admin' && (
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="admin_lite">Admin Lite</option>
                                                <option value="kid">Kid</option>
                                            </select>
                                        )}

                                        {/* Remove Button */}
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
