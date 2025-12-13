import { useState, useEffect } from 'react'
import { Fingerprint } from 'lucide-react'
import { useBiometric } from '../hooks/useBiometric'

export default function BiometricLock({ onUnlock }) {
    const { authenticate, disable } = useBiometric()
    const [error, setError] = useState('')

    useEffect(() => {
        handleAuth()
    }, [])

    const handleAuth = async () => {
        setError('')
        const result = await authenticate()
        if (result.success) {
            onUnlock()
        } else {
            setError(result.error || 'Authentication failed')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
            <div className="glass-card p-8 text-center animate-scale-in">
                <Fingerprint className="w-20 h-20 text-white mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">FamPulse</h2>
                <p className="text-white/80 mb-6">Authenticate to continue</p>
                {error && <p className="text-red-300 text-sm mb-4">{error}</p>}
                <div className="space-y-3">
                    <button
                        onClick={handleAuth}
                        className="w-full px-6 py-3 bg-white text-purple-600 rounded-full font-semibold hover:bg-white/90 transition-all active:scale-95"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => {
                            disable()
                            window.location.reload()
                        }}
                        className="w-full px-6 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-all active:scale-95"
                    >
                        Disable Face ID
                    </button>
                </div>
            </div>
        </div>
    )
}
