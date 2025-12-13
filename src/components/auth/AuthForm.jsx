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
        <div className="min-h-screen flex items-center justify-center p-3 sm:p-4" style={{ background: '#f9fafb' }}>
            <div className="w-full max-w-md animate-scale-in">
                {/* Logo & Brand */}
                <div className="text-center mb-6">
                    <img src="/maskable-icon-512x512.png" alt="FamPulse" className="w-20 h-20 rounded-3xl shadow-lg mx-auto mb-4" />
                    <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-tight">
                        FamPulse
                    </h1>
                    <p className="text-gray-600 text-base font-medium">
                        {isLogin ? 'Sign in to continue' : 'Create your account'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
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
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
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
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-mono text-center tracking-wider"
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
                            <label className="block text-sm font-semibold text-gray-700 text-left">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 text-left">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
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
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold transition-all active:scale-95 disabled:opacity-50"
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
                <p className="text-center text-gray-500 text-sm mt-6">
                    Secure family management with role-based access
                </p>
            </div>
        </div>
    )
}
