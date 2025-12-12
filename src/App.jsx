import {AuthProvider, useAuth} from './contexts/AuthContext'
import AuthForm from './components/auth/AuthForm'
import FamilyDashboard from './components/family/FamilyDashboard'
import EditProfile from './components/profile/EditProfile'
import UserMenu from './components/UserMenu'
import FamilyManagement from './components/family/FamilyManagement'
import GroceryList from './components/groceries/GroceryList'
import MilkDelivery from './components/milk/MilkDelivery'
import ModuleSelector from './components/ModuleSelector'
import { useState, useEffect, useRef } from 'react'
import { Moon, Sun } from 'lucide-react'
import './App.css'

function AppContent() {
    const {user, profile, loading} = useAuth()
    const [showEditProfile, setShowEditProfile] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showFamilyManagement, setShowFamilyManagement] = useState(false)
    const [showModuleSelector, setShowModuleSelector] = useState(false)
    const [currentModule, setCurrentModule] = useState('groceries')
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        document.body.style.background = isDark ? 'linear-gradient(to bottom right, #1f2937, #111827)' : '#f9fafb'
    }, [isDark])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="glass-card p-8 text-center animate-scale-in">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg font-medium">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <AuthForm/>
    }

    return (
        <div className="min-h-screen safe-area relative overflow-hidden" style={{ background: isDark ? 'linear-gradient(to bottom right, #1f2937, #111827)' : '#f9fafb' }}>


            {/* Header */}
            <header className={`relative border-0 border-b mb-6 ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-gray-200'}`} style={{ zIndex: 100 }}>
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <div className="relative">
                        <button onClick={() => setShowModuleSelector(!showModuleSelector)} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all active:scale-95 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                            <img src="/maskable-icon-512x512.png" alt="FamPulse" className="w-10 h-10 rounded-2xl shadow-lg" />
                            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>FamPulse</span>
                            <svg className={`w-5 h-5 transition-transform ${showModuleSelector ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showModuleSelector && (
                            <ModuleSelector
                                currentModule={currentModule}
                                onSelect={setCurrentModule}
                                onClose={() => setShowModuleSelector(false)}
                                isDark={isDark}
                            />
                        )}
                    </div>

                    {/* User Button */}
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="avatar ios-button shadow-lg overflow-hidden"
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
                        )}
                    </button>
                </div>
            </header>

            {showModuleSelector && <div className="fixed inset-0 z-50" onClick={() => setShowModuleSelector(false)} />}

            {/* Main Content */}
            <main className="relative px-4 py-6 max-w-6xl mx-auto pb-safe" style={{ zIndex: 1 }}>
                {currentModule === 'groceries' && <GroceryList isDark={isDark} />}
                {currentModule === 'milk' && <MilkDelivery isDark={isDark} />}
            </main>

            {/* User Menu Overlay */}
            {showUserMenu && (
                <UserMenu
                    onClose={() => setShowUserMenu(false)}
                    onOpenFamilyManagement={() => {
                        setShowUserMenu(false)
                        setShowFamilyManagement(true)
                    }}
                    onOpenEditProfile={() => {
                        setShowUserMenu(false)
                        setShowEditProfile(true)
                    }}
                    isDark={isDark}
                    onToggleTheme={() => setIsDark(!isDark)}
                />
            )}

            {/* Edit Profile Modal */}
            {showEditProfile && (
                <EditProfile
                    onClose={() => setShowEditProfile(false)}
                    onProfileUpdated={() => window.location.reload()}
                />
            )}

            {/* Family Management Modal */}
            {showFamilyManagement && (
                <FamilyManagement onClose={() => setShowFamilyManagement(false)} />
            )}
        </div>
    )
}

function App() {
    return (
        <AuthProvider>
            <AppContent/>
        </AuthProvider>
    )
}

export default App
