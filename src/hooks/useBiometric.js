import { useState, useEffect } from 'react'

export const useBiometric = () => {
    const [isSupported, setIsSupported] = useState(false)
    const [isEnabled, setIsEnabled] = useState(false)

    useEffect(() => {
        setIsSupported('PublicKeyCredential' in window)
        setIsEnabled(localStorage.getItem('biometric_enabled') === 'true')
    }, [])

    const authenticate = async () => {
        if (!isSupported) return { success: false, error: 'Not supported' }

        try {
            const credentialId = localStorage.getItem('biometric_credential_id')
            if (!credentialId) return { success: false, error: 'No credential' }

            const challenge = new Uint8Array(32)
            crypto.getRandomValues(challenge)

            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [{
                        id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
                        type: 'public-key'
                    }],
                    timeout: 60000,
                    userVerification: 'required'
                }
            })

            return { success: !!credential }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const enable = async () => {
        if (!isSupported) return { success: false }

        try {
            const challenge = new Uint8Array(32)
            crypto.getRandomValues(challenge)
            const userId = new Uint8Array(16)
            crypto.getRandomValues(userId)

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: 'FamPulse' },
                    user: {
                        id: userId,
                        name: 'user',
                        displayName: 'User'
                    },
                    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
                    timeout: 60000,
                    authenticatorSelection: {
                        userVerification: 'required'
                    }
                }
            })

            const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
            localStorage.setItem('biometric_credential_id', credentialId)
            localStorage.setItem('biometric_enabled', 'true')
            setIsEnabled(true)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const disable = () => {
        localStorage.removeItem('biometric_enabled')
        localStorage.removeItem('biometric_credential_id')
        setIsEnabled(false)
    }

    return { isSupported, isEnabled, authenticate, enable, disable }
}
