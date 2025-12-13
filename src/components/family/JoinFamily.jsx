import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function JoinFamily({ onClose, onJoined }) {
    const { user } = useAuth()

    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])
    const [inviteCode, setInviteCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleJoin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const cleanCode = inviteCode.trim().toUpperCase()
            console.log('Looking for invite code:', cleanCode)
            
            // Debug: Check all families
            const { data: allFamilies } = await supabase
                .from('families')
                .select('id, name, invite_code')
            console.log('All families in database:', allFamilies)
            
            // Find family by invite code
            const { data: family, error: familyError } = await supabase
                .from('families')
                .select('id, name, invite_code')
                .eq('invite_code', cleanCode)
                .single()

            console.log('Family lookup result:', { family, familyError })

            if (familyError) {
                console.log('Family error details:', familyError)
                if (familyError.code === 'PGRST116') {
                    setError('Invalid invite code. Please check and try again.')
                } else {
                    setError(`Database error: ${familyError.message}`)
                }
                return
            }

            // Check if already a member
            const { data: existingMember } = await supabase
                .from('family_members')
                .select('id')
                .eq('family_id', family.id)
                .eq('user_id', user.id)
                .maybeSingle()

            if (existingMember) {
                setError('You are already a member of this family!')
                return
            }
            
            console.log('Adding user to family:', { familyId: family.id, userId: user.id })

            // Add to family
            const { error: insertError } = await supabase
                .from('family_members')
                .insert([
                    {
                        family_id: family.id,
                        user_id: user.id,
                        role: 'kid',
                        added_by: null
                    }
                ])

            if (insertError) throw insertError

            alert(`Successfully joined ${family.name}!`)
            onJoined()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Join Family</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl active:scale-95">
                        ×
                    </button>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                            Invite Code
                        </label>
                        <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-center text-2xl font-mono tracking-wider transition-colors"
                            placeholder="ABC12XYZ"
                            maxLength={8}
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-2xl">
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading || inviteCode.length !== 8}
                            className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors active:scale-95"
                        >
                            {loading ? 'Joining...' : 'Join Family'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors active:scale-95"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
