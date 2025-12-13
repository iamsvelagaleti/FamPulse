import {AuthProvider, useAuth} from './contexts/AuthContext'
import AuthForm from './components/auth/AuthForm'
import FamilyDashboard from './components/family/FamilyDashboard'
import EditProfile from './components/profile/EditProfile'
import FamilyManagement from './components/family/FamilyManagement'
import GroceryList from './components/groceries/GroceryList'
import MilkDelivery from './components/milk/MilkDelivery'
import Countdowns from './components/countdowns/Countdowns'
import HamburgerMenu from './components/HamburgerMenu'
import FamilySwitcher from './components/family/FamilySwitcher'
import { useFamily } from './hooks/useFamily'
import { useState, useEffect } from 'react'
import { Menu, Home, ShoppingCart, Milk, User, Clock } from 'lucide-react'
import './App.css'

function AppContent() {
    const {user, profile, loading} = useAuth()
    const { currentFamily } = useFamily()
    const [showFamilyManagement, setShowFamilyManagement] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [currentModule, setCurrentModule] = useState(() => localStorage.getItem('currentModule') || 'dashboard')
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        localStorage.setItem('currentModule', currentModule)
    }, [currentModule])

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
            <header className={`fixed top-0 left-0 right-0 border-0 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{ zIndex: 200 }}>
                <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
                    <button 
                        onClick={() => setShowMenu(true)}
                        className={`p-2 rounded-xl transition-all active:scale-95 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                        <Menu className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-800'}`} />
                    </button>
                    <FamilySwitcher isDark={isDark} />
                    <div className="flex items-center gap-3">
                        {currentModule === 'dashboard' && <Home className={`w-7 h-7 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                        {currentModule === 'groceries' && <ShoppingCart className={`w-7 h-7 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                        {currentModule === 'milk' && <Milk className={`w-7 h-7 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                        {currentModule === 'profile' && <User className={`w-7 h-7 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                        {currentModule === 'countdowns' && <Clock className={`w-7 h-7 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                        <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {currentModule === 'dashboard' ? 'Dashboard' : currentModule === 'groceries' ? 'Groceries' : currentModule === 'milk' ? 'Milkman' : currentModule === 'countdowns' ? 'Countdowns' : 'Profile'}
                        </span>
                    </div>
                    <div className="w-10" />
                </div>
            </header>

            {/* Hamburger Menu */}
            <HamburgerMenu
                isOpen={showMenu}
                onClose={() => setShowMenu(false)}
                currentModule={currentModule}
                onModuleChange={setCurrentModule}
                onOpenFamilyManagement={() => setShowFamilyManagement(true)}
                isDark={isDark}
                onToggleDark={() => setIsDark(!isDark)}
            />

            {/* Main Content */}
            <main className="relative max-w-6xl mx-auto pb-safe mt-[72px]" style={{ zIndex: 1 }}>
                {currentModule === 'dashboard' && <FamilyDashboard isDark={isDark} />}
                {currentModule === 'groceries' && <GroceryList isDark={isDark} />}
                {currentModule === 'milk' && <MilkDelivery isDark={isDark} familyId={currentFamily?.id} />}
                {currentModule === 'profile' && <EditProfile isDark={isDark} onProfileUpdated={() => { setCurrentModule('dashboard'); window.location.reload() }} />}
                {currentModule === 'countdowns' && <Countdowns isDark={isDark} />}
            </main>

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
