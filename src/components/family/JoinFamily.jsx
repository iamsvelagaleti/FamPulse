import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function JoinFamily({ onClose, onJoined }) {
    const { user } = useAuth()
    const [inviteCode, setInviteCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleJoin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Find family by invite code
            const { data: family, error: familyError } = await supabase
                .from('families')
                .select('id, name')
                .eq('invite_code', inviteCode.trim().toUpperCase())
                .single()

            if (familyError) {
                if (familyError.code === 'PGRST116') {
                    setError('Invalid invite code. Please check and try again.')
                } else {
                    throw familyError
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl max-w-sm w-full p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Join Family</h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">
                        ×
                    </button>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                            Invite Code
                        </label>
                        <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            className="w-full px-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-white/40 text-white placeholder-white/60 text-center text-2xl font-mono tracking-wider"
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
                            className="flex-1 bg-white/20 backdrop-blur-md text-white py-3 rounded-2xl font-semibold hover:bg-white/30 disabled:opacity-50 border border-white/30"
                        >
                            {loading ? 'Joining...' : 'Join Family'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white/10 backdrop-blur-md text-white py-3 rounded-2xl font-semibold hover:bg-white/20 border border-white/20"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
