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
import NotificationBell from './components/NotificationBell'
import BiometricLock from './components/BiometricLock'
import { useFamily } from './hooks/useFamily'
import { useBiometric } from './hooks/useBiometric'
import { useState, useEffect } from 'react'
import { Menu, Home, ShoppingCart, Milk, User, Clock } from 'lucide-react'
import './App.css'

function AppContent() {
    const {user, profile, loading} = useAuth()
    const { currentFamily } = useFamily()
    const { isEnabled } = useBiometric()
    const [isUnlocked, setIsUnlocked] = useState(false)
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

    if (user && isEnabled && !isUnlocked) {
        return <BiometricLock onUnlock={() => setIsUnlocked(true)} />
    }

    return (
        <div className="min-h-screen safe-area relative" style={{ background: isDark ? 'linear-gradient(to bottom right, #1f2937, #111827)' : '#f9fafb' }}>
            {/* Floating Bubbles */}
            <div className="fixed top-4 left-0 right-0 px-4 flex items-center justify-between" style={{ zIndex: 200 }}>
                <button 
                    onClick={() => setShowMenu(true)}
                    className={`p-3 rounded-full shadow-lg transition-all active:scale-95 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                >
                    <Menu className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-800'}`} />
                </button>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <FamilySwitcher isDark={isDark} />
                    {currentModule === 'dashboard' && <Home className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                    {currentModule === 'groceries' && <ShoppingCart className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                    {currentModule === 'milk' && <Milk className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                    {currentModule === 'profile' && <User className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                    {currentModule === 'countdowns' && <Clock className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-800'}`} />}
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {currentModule === 'dashboard' ? 'Dashboard' : currentModule === 'groceries' ? 'Groceries' : currentModule === 'milk' ? 'Milkman' : currentModule === 'countdowns' ? 'Countdowns' : 'Profile'}
                    </span>
                </div>
                <div className={`p-3 rounded-full shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <NotificationBell isDark={isDark} />
                </div>
            </div>

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
            <main className="relative w-full pb-safe mt-20" style={{ zIndex: 1 }}>
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
