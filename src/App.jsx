import {useEffect, useState} from 'react'
import {supabase} from './supabaseClient'
import './App.css'

function App() {
    const [connectionStatus, setConnectionStatus] = useState('checking...')
    const [user, setUser] = useState(null)

    useEffect(() => {
        // Test Supabase connection
        const checkConnection = async () => {
            try {
                const {data, error} = await supabase.auth.getSession()
                if (error) throw error
                setConnectionStatus('✅ Connected')
                setUser(data.session?.user ?? null)
            } catch (error) {
                setConnectionStatus('❌ Connection Failed: ' + error.message)
            }
        }

        checkConnection()
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
                <h1 className="text-4xl font-bold text-indigo-600 mb-2 text-center">
                    Fam Pulse
                </h1>
                <p className="text-gray-500 text-center mb-6">Setup Complete!</p>

                <div className="space-y-4">
                    {/* Connection Status */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Supabase Status:</p>
                        <p className="text-gray-600">{connectionStatus}</p>
                    </div>

                    {/* Tech Stack */}
                    <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 mb-2">Tech Stack:</p>
                        <ul className="text-sm text-green-700 space-y-1">
                            <li>✅ React + Vite</li>
                            <li>✅ TailwindCSS</li>
                            <li>✅ Supabase Backend</li>
                            <li>✅ IntelliJ IDEA</li>
                        </ul>
                    </div>

                    {/* User Status */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 mb-2">User Status:</p>
                        <p className="text-sm text-blue-700">
                            {user ? `Logged in: ${user.email}` : 'Not logged in'}
                        </p>
                    </div>

                    {/* Next Steps */}
                    <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm font-semibold text-purple-800 mb-2">Ready to build:</p>
                        <ul className="text-sm text-purple-700 space-y-1">
                            <li>→ Family Groups</li>
                            <li>→ Transaction Tracking</li>
                            <li>→ Member Management</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
