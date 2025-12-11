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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-indigo-600">Fam Pulse</h1>
                    <div className="flex items-center gap-4">
            <span className="text-gray-700">
              {profile?.full_name || user.email}
            </span>
                        <button
                            onClick={() => setShowEditProfile(true)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                        >
                            Edit Profile
                        </button>
                        <button
                            onClick={signOut}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
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
