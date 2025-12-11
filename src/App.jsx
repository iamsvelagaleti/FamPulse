import {AuthProvider, useAuth} from './contexts/AuthContext'
import AuthForm from './components/auth/AuthForm'
import FamilyDashboard from './components/family/FamilyDashboard'
import EditProfile from './components/profile/EditProfile'
import { useState } from 'react'
import './App.css'

function AppContent() {
    const {user, profile, loading, signOut} = useAuth()
    const [showEditProfile, setShowEditProfile] = useState(false)

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <AuthForm/>
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
            {/* Header */}
            <header className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
                <div className="px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">Fam Pulse</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-white/90 text-sm truncate max-w-24">
                            {profile?.full_name || user.email}
                        </span>
                        <button
                            onClick={() => setShowEditProfile(true)}
                            className="px-3 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition text-xs border border-white/30"
                        >
                            Edit
                        </button>
                        <button
                            onClick={signOut}
                            className="px-3 py-2 bg-red-500/80 backdrop-blur-md text-white rounded-xl hover:bg-red-500 transition text-xs border border-red-400/50"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 py-6">
                <FamilyDashboard/>
            </main>
            
            {/* Edit Profile Modal */}
            {showEditProfile && (
                <EditProfile
                    onClose={() => setShowEditProfile(false)}
                    onProfileUpdated={() => window.location.reload()}
                />
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
