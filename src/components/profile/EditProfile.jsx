import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

export default function EditProfile({ onClose, onProfileUpdated }) {
    const { profile, user } = useAuth()
    const [fullName, setFullName] = useState(profile?.full_name || '')
    const [phone, setPhone] = useState(profile?.phone || '')
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
    const [newPassword, setNewPassword] = useState('')
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const handleAvatarUpload = async (e) => {
        try {
            setUploading(true)
            setError('')

            if (!e.target.files || e.target.files.length === 0) {
                throw new Error('You must select an image to upload.')
            }

            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const filePath = `${user.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(data.publicUrl)
        } catch (err) {
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: phone,
                    avatar_url: avatarUrl
                })
                .eq('id', profile.id)

            if (updateError) throw updateError

            if (newPassword.trim()) {
                const { error: passwordError } = await supabase.auth.updateUser({
                    password: newPassword
                })
                if (passwordError) throw passwordError
            }

            alert('Profile updated successfully!')
            onProfileUpdated()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition ios-button"
                        >
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-5">
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-2xl object-cover shadow-lg" />
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                <label className="absolute bottom-0 right-0 bg-cyan-500 hover:bg-cyan-600 text-white p-2 rounded-xl cursor-pointer shadow-lg transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 text-left">
                                Full Name
                            </label>
                            <div className="flex items-center bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.1)] rounded-2xl px-3 py-2 transition-all focus-within:bg-[rgba(0,0,0,0.05)] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_0_4px_rgba(6,182,212,0.1)]">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 mr-3">
                                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-gray-900 text-base placeholder:text-gray-400 py-2"
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 text-left">
                                Phone Number
                            </label>
                            <PhoneInput
                                international
                                defaultCountry="IN"
                                value={phone}
                                onChange={setPhone}
                                className="phone-input-custom"
                                placeholder="Enter phone number"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 text-left">
                                New Password <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="flex items-center bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.1)] rounded-2xl px-3 py-2 transition-all focus-within:bg-[rgba(0,0,0,0.05)] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_0_4px_rgba(6,182,212,0.1)]">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 mr-3">
                                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-gray-900 text-base placeholder:text-gray-400 py-2"
                                    placeholder="Leave blank to keep current"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary flex-1 ios-button"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 ios-button bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
