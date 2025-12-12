import {useState} from 'react'
import {useAuth} from '../../contexts/AuthContext'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

export default function AuthForm() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [inviteCode, setInviteCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const {signIn, signUp} = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setLoading(true)

        try {
            if (isLogin) {
                const {error} = await signIn(email, password)
                if (error) throw error
            } else {
                if (!fullName.trim()) {
                    throw new Error('Please enter your full name')
                }
                const {error} = await signUp(email, password, fullName, phone)
                if (error) throw error

                if (inviteCode.trim()) {
                    setMessage(`Account created! Please check your email to verify. After verification, you'll be added to the family with code: ${inviteCode}`)
                } else {
                    setMessage('Account created! Please check your email to verify.')
                }
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 safe-area">
            <div className="w-full max-w-md animate-scale-in">
                {/* Logo & Brand */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 glass-card mb-4">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
                        FamPulse
                    </h1>
                    <p className="text-white/80 text-lg">
                        {isLogin ? 'Welcome back!' : 'Join your family'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="glass-card-light p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Signup Fields */}
                        {!isLogin && (
                            <>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="glass-input-light"
                                        placeholder="Enter your full name"
                                        required={!isLogin}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Phone Number
                                    </label>
                                    <PhoneInput
                                        international
                                        defaultCountry="IN"
                                        value={phone}
                                        onChange={setPhone}
                                        className="phone-input-custom"
                                        placeholder="Enter phone number"
                                        required={!isLogin}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Family Invite Code
                                        <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        className="glass-input-light font-mono text-center tracking-wider"
                                        placeholder="ABC12XYZ"
                                        maxLength={8}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Have an invite code? You'll be added after verification
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="glass-input-light"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="glass-input-light"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {message && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl animate-fade-in">
                                <p className="text-sm text-green-600 font-medium">{message}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full ios-button"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Please wait...</span>
                                </div>
                            ) : (
                                isLogin ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Toggle Login/Signup */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin)
                                setError('')
                                setMessage('')
                                setInviteCode('')
                            }}
                            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                        >
                            {isLogin ?
                                "Don't have an account? Sign Up" :
                                'Already have an account? Sign In'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/60 text-sm mt-6">
                    Secure family management with role-based access
                </p>
            </div>
        </div>
    )
}
