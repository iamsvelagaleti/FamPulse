import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useFamily } from '../../hooks/useFamily'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import Cropper from 'react-easy-crop'
import getCroppedImg from '../../utils/cropImage'

export default function EditProfile({ isDark, onProfileUpdated }) {
    const { profile, user } = useAuth()
    const { familyMembers } = useFamily()
    const [fullName, setFullName] = useState(profile?.full_name || '')
    const [nickname, setNickname] = useState(profile?.nickname || '')
    const [phone, setPhone] = useState(profile?.phone || '')
    const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '')
    const [anniversaryDate, setAnniversaryDate] = useState(profile?.anniversary_date || '')
    const [spouseId, setSpouseId] = useState(profile?.spouse_id || '')
    const [gender, setGender] = useState(profile?.gender || '')
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
    const [newPassword, setNewPassword] = useState('')
    const [relation, setRelation] = useState('')
    const [familyMemberId, setFamilyMemberId] = useState(null)
    const [fatherId, setFatherId] = useState('')
    const [motherId, setMotherId] = useState('')
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [imageSrc, setImageSrc] = useState(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [showCropper, setShowCropper] = useState(false)

    useEffect(() => {
        const fetchRelation = async () => {
            const { data } = await supabase
                .from('family_members')
                .select('id, relation, father_id, mother_id')
                .eq('user_id', user.id)
                .single()
            if (data) {
                setRelation(data.relation || '')
                setFamilyMemberId(data.id)
                setFatherId(data.father_id || '')
                setMotherId(data.mother_id || '')
            }
        }
        if (user) fetchRelation()
    }, [user])



    const onFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.addEventListener('load', () => {
                setImageSrc(reader.result)
                setShowCropper(true)
            })
            reader.readAsDataURL(file)
        }
    }

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleCropSave = async () => {
        try {
            setUploading(true)
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
            
            const fileName = `${user.id}-${Math.random()}.jpg`
            const filePath = `${user.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedImage, { upsert: true })

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(data.publicUrl)
            setShowCropper(false)
            setImageSrc(null)
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
                    nickname: nickname?.trim() || null,
                    phone: phone,
                    date_of_birth: dateOfBirth?.trim() || null,
                    anniversary_date: anniversaryDate?.trim() || null,
                    spouse_id: spouseId || null,
                    gender: gender || null,
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

            if (familyMemberId) {
                await supabase
                    .from('family_members')
                    .update({ 
                        relation: relation || null,
                        father_id: fatherId || null,
                        mother_id: motherId || null
                    })
                    .eq('id', familyMemberId)
            }

            // Update spouse's anniversary and spouse_id
            if (spouseId && anniversaryDate?.trim()) {
                const { error: spouseError } = await supabase
                    .from('profiles')
                    .update({ 
                        spouse_id: user.id,
                        anniversary_date: anniversaryDate.trim()
                    })
                    .eq('id', spouseId)
                if (spouseError) console.error('Spouse update error:', spouseError)
            } else if (profile?.spouse_id && !spouseId) {
                // Clear spouse's link if spouse removed
                const { error: clearError } = await supabase
                    .from('profiles')
                    .update({ spouse_id: null })
                    .eq('id', profile.spouse_id)
                if (clearError) console.error('Clear spouse error:', clearError)
            }

            setSuccess(true)
            setTimeout(() => {
                onProfileUpdated()
            }, 1500)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="px-3 sm:px-4 py-4 sm:py-6">
            <div className={`max-w-2xl mx-auto rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white/80 backdrop-blur-xl'} shadow-lg p-4 sm:p-6`}>

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
                                        onChange={onFileChange}
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
                                Nickname <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="flex items-center bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.1)] rounded-2xl px-3 py-2 transition-all focus-within:bg-[rgba(0,0,0,0.05)] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_0_4px_rgba(6,182,212,0.1)]">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 mr-3">
                                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-gray-900 text-base placeholder:text-gray-400 py-2"
                                    placeholder="Enter nickname"
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
                                Date of Birth
                            </label>
                            <div className="flex items-center bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.1)] rounded-2xl px-3 py-2 transition-all focus-within:bg-[rgba(0,0,0,0.05)] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_0_4px_rgba(6,182,212,0.1)]">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 mr-3">
                                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-gray-900 text-base placeholder:text-gray-400 py-2"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Gender
                            </label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                                required
                            >
                                <option value="">Select gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Spouse <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <select
                                value={spouseId}
                                onChange={(e) => setSpouseId(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                            >
                                <option value="">Select spouse</option>
                                {familyMembers.filter(m => m.user_id !== user.id).map(m => (
                                    <option key={m.user_id} value={m.user_id}>{m.user.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Anniversary Date <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="flex items-center bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.1)] rounded-2xl px-3 py-2 transition-all focus-within:bg-[rgba(0,0,0,0.05)] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_0_4px_rgba(6,182,212,0.1)]">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 mr-3">
                                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="date"
                                    value={anniversaryDate}
                                    onChange={(e) => setAnniversaryDate(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-gray-900 text-base placeholder:text-gray-400 py-2"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Father <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <select
                                value={fatherId}
                                onChange={(e) => setFatherId(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                            >
                                <option value="">Select father</option>
                                {familyMembers.filter(m => m.user_id !== user.id).map(m => (
                                    <option key={m.user_id} value={m.user_id}>{m.user.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Mother <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <select
                                value={motherId}
                                onChange={(e) => setMotherId(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                            >
                                <option value="">Select mother</option>
                                {familyMembers.filter(m => m.user_id !== user.id).map(m => (
                                    <option key={m.user_id} value={m.user_id}>{m.user.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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

                        {success && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl animate-fade-in">
                                <p className="text-sm text-green-600 font-medium">Profile updated successfully!</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full ios-button"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
            </div>

            {showCropper && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
                    <div className="flex-1 relative">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />
                    </div>
                    <div className="p-4 bg-gray-900 space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-white text-sm">Zoom</span>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(e.target.value)}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowCropper(false); setImageSrc(null) }}
                                className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCropSave}
                                disabled={uploading}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold"
                            >
                                {uploading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
