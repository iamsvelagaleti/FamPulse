import { useAuth } from '../contexts/AuthContext'
import { useFamily } from '../hooks/useFamily'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Moon, Sun } from 'lucide-react'


export default function UserMenu({ onClose, onOpenFamilyManagement, onOpenEditProfile, isDark, onToggleTheme }) {
    const { user, profile, signOut } = useAuth()
    const { currentFamily: family } = useFamily()
    const [isVisible, setIsVisible] = useState(false)
    const [showContent, setShowContent] = useState(false)
    const [showCopied, setShowCopied] = useState(false)

    const handleClose = () => {
        setShowContent(false)
        setIsVisible(false)
        setTimeout(onClose, 200)
    }

    useEffect(() => {
        setIsVisible(true)
        setTimeout(() => setShowContent(true), 100)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') handleClose()
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleInviteShare = (method) => {
        if (!family) return
        const message = `Join our family "${family.name}" on FamPulse! Use invite code: ${family.invite_code}\n\nSign up at: ${window.location.origin}`

        if (method === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
        } else if (method === 'copy') {
            navigator.clipboard.writeText(family.invite_code)
            setShowCopied(true)
            setTimeout(() => setShowCopied(false), 2000)
        }
    }

    return (
        <div className="fixed inset-0 z-50" onClick={handleClose}>
            <div className={`absolute top-24 right-4 w-80 glass-card-light shadow-xl transform transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-right ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-1'}`} onClick={(e) => e.stopPropagation()}>
                <div className={`p-6 pt-8 space-y-4 transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                    {/* User Avatar & Info */}
                    <div className="text-center mb-6">
                        <div className="avatar avatar-lg mx-auto mb-4 overflow-hidden">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {profile?.full_name || 'User'}
                        </h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {family && (
                            <div className="mt-3">
                                <span className="inline-block px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded-full">
                                    {family.name}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Profile Info */}
                    <div className="space-y-2">
                        <div className="flex items-center bg-gray-50 rounded-2xl px-3 py-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 mr-3">
                                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="text-xs text-gray-500 mb-0.5">Phone</div>
                                <div className="text-sm text-gray-900 font-medium">
                                    {profile?.phone || 'Not set'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                        <button
                            onClick={() => {
                                handleClose()
                                onOpenEditProfile()
                            }}
                            className="w-full p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition ios-button flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Profile
                        </button>

                        {family && (
                            <button
                                onClick={() => {
                                    handleClose()
                                    onOpenFamilyManagement()
                                }}
                                className="w-full p-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition ios-button flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                {family.userRole === 'admin' ? 'Manage Family' : 'View Family'}
                            </button>
                        )}

                        <button
                            onClick={onToggleTheme}
                            className="w-full p-3 bg-gray-50 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition ios-button flex items-center justify-center gap-2"
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </button>

                        <button
                            onClick={signOut}
                            className="w-full p-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition ios-button flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Copied Toast */}
                {showCopied && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-cyan-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
                        ✓ Code copied!
                    </div>
                )}
            </div>
        </div>
    )
}
