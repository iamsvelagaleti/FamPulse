import {useState} from 'react'
import {useAuth} from '../../contexts/AuthContext'

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
                // Login
                const {error} = await signIn(email, password)
                if (error) throw error
            } else {
                // Signup
                if (!fullName.trim()) {
                    throw new Error('Please enter your full name')
                }
                const {error} = await signUp(email, password, fullName, phone)
                if (error) throw error
                
                // If invite code provided, try to join family
                if (inviteCode.trim()) {
                    // Note: Family joining will be handled after email verification
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
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        FamPulse
                    </h1>
                    <p className="text-gray-600">
                        {isLogin ? 'Welcome back!' : 'Create your account'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name (only for signup) */}
                    {!isLogin && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-4 bg-white/60 backdrop-blur-md border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-500 text-base"
                                    placeholder="Enter your full name"
                                    required={!isLogin}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-4 bg-white/60 backdrop-blur-md border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-500 text-base"
                                    placeholder="+91 9876543210"
                                    required={!isLogin}
                                    pattern="[+]?[0-9]{10,13}"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Family Invite Code (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Enter invite code"
                                    maxLength={8}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Have an invite code? Enter it to join a family after signup
                                </p>
                            </div>
                        </>
                    )}

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-4 bg-white/60 backdrop-blur-md border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-500 text-base"
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-4 bg-white/60 backdrop-blur-md border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-500 text-base"
                            placeholder="Enter your password"
                            required
                            minLength={6}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-2xl">
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {message && (
                        <div className="p-4 bg-green-500/20 backdrop-blur-md border border-green-400/30 rounded-2xl">
                            <p className="text-sm text-green-200">{message}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-500/80 backdrop-blur-md text-white py-4 rounded-2xl font-semibold hover:bg-blue-600/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-base border border-blue-400"
                    >
                        {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
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
                        className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                    </button>
                </div>
            </div>
        </div>
    )
}
