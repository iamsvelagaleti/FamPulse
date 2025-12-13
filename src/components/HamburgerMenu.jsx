import { Home, ShoppingCart, Milk, User, LogOut, X, Moon, Sun, Clock, Fingerprint } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useBiometric } from '../hooks/useBiometric'
import { supabase } from '../supabaseClient'
import { useState } from 'react'

export default function HamburgerMenu({ isOpen, onClose, currentModule, onModuleChange, onOpenFamilyManagement, isDark, onToggleDark }) {
    const { user, profile } = useAuth()
    const { isSupported, isEnabled, enable, disable } = useBiometric()
    const [loading, setLoading] = useState(false)

    const menuItems = [
        { id: 'dashboard', name: 'Dashboard', icon: Home },
        { id: 'groceries', name: 'Groceries', icon: ShoppingCart },
        { id: 'milk', name: 'Milkman', icon: Milk },
        { id: 'countdowns', name: 'Countdowns', icon: Clock },
    ]

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[300]" 
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed top-0 left-0 h-full w-72 transform transition-transform duration-300 ease-in-out z-[301] ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-2xl`}>
                {/* Header */}
                <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <img src="/maskable-icon-512x512.png" alt="FamPulse" className="w-10 h-10 rounded-2xl shadow-lg" />
                            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>FamPulse</span>
                        </div>
                        <button 
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-all active:scale-95 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="avatar shadow-lg overflow-hidden">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
                            )}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {profile?.full_name || user?.email}
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="p-4 space-y-2">
                    {menuItems.map(item => {
                        const Icon = item.icon
                        const isActive = currentModule === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onModuleChange(item.id)
                                    onClose()
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95 ${
                                    isActive 
                                        ? isDark ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white'
                                        : isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{item.name}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* Profile, Dark Mode & Logout */}
                <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
                    <button
                        onClick={() => {
                            onModuleChange('profile')
                            onClose()
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95 ${currentModule === 'profile' ? isDark ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white' : isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                    >
                        <User className="w-5 h-5" />
                        <span className="font-medium">Profile</span>
                    </button>
                    <button
                        onClick={onToggleDark}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                    >
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    {isSupported && (
                        <button
                            onClick={async () => {
                                setLoading(true)
                                if (isEnabled) {
                                    disable()
                                } else {
                                    await enable()
                                }
                                setLoading(false)
                            }}
                            disabled={loading}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                        >
                            <Fingerprint className="w-5 h-5" />
                            <span className="font-medium">{isEnabled ? 'Disable' : 'Enable'} Face ID</span>
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95 ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </>
    )
}
