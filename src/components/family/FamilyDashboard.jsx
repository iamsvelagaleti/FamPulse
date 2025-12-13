import {useState, useEffect} from 'react'
import {useFamily} from '../../hooks/useFamily'
import {useAuth} from '../../contexts/AuthContext'
import {supabase} from '../../supabaseClient'
import JoinFamily from './JoinFamily'
import AddMemberModal from './AddMemberModal'

export default function FamilyDashboard({ isDark }) {
    const {user} = useAuth()
    const {
        families,
        currentFamily,
        familyMembers,
        loading,
        createFamily,
        updateMemberRole,
        removeMember,
        joinFamilyByCode,
        refreshFamilies
    } = useFamily()

    const [showCreateFamily, setShowCreateFamily] = useState(false)
    const [familyName, setFamilyName] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')
    const [showJoinFamily, setShowJoinFamily] = useState(false)
    const [showAddMember, setShowAddMember] = useState(false)
    const [selectedMember, setSelectedMember] = useState(null)
    const [showTree, setShowTree] = useState(false)
    const [upcomingEvents, setUpcomingEvents] = useState([])

    const currentUserRole = familyMembers.find(m => m.user_id === user.id)?.role

    useEffect(() => {
        const fetchAllEvents = async () => {
            const events = []
            const now = new Date()
            
            familyMembers.forEach(m => {
                if (m.user.date_of_birth) {
                    const dob = new Date(m.user.date_of_birth)
                    const nextBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
                    if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1)
                    const days = Math.floor((nextBirthday - now) / (1000 * 60 * 60 * 24))
                    if (days <= 30) events.push({ name: m.user.nickname || m.user.full_name?.split(' ')[0], days, emoji: '🎂' })
                }
                if (m.user.anniversary_date) {
                    const anniv = new Date(m.user.anniversary_date)
                    const nextAnniv = new Date(now.getFullYear(), anniv.getMonth(), anniv.getDate())
                    if (nextAnniv < now) nextAnniv.setFullYear(now.getFullYear() + 1)
                    const days = Math.floor((nextAnniv - now) / (1000 * 60 * 60 * 24))
                    const spouse = m.user.spouse_id ? familyMembers.find(fm => fm.user_id === m.user.spouse_id) : null
                    const name = spouse ? `${m.user.nickname || m.user.full_name?.split(' ')[0]} ❤️ ${spouse.user.nickname || spouse.user.full_name?.split(' ')[0]}` : m.user.nickname || m.user.full_name?.split(' ')[0]
                    if (days <= 30 && !events.some(e => e.name === name)) events.push({ name, days, emoji: '💍' })
                }
            })
            
            const { data } = await supabase
                .from('countdowns')
                .select('*')
                .eq('family_id', currentFamily.id)
                .in('category', ['Birthday', 'Anniversary'])
            
            if (data) {
                data.forEach(c => {
                    const targetDate = new Date(c.target_date)
                    const days = Math.floor((targetDate - now) / (1000 * 60 * 60 * 24))
                    if (days < 10 && days >= 0) events.push({ name: c.title, days, emoji: c.emoji })
                })
            }
            
            setUpcomingEvents(events.sort((a, b) => a.days - b.days))
        }
        
        if (currentFamily) fetchAllEvents()
    }, [familyMembers, currentFamily])

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setSelectedMember(null)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    const handleCreateFamily = async (e) => {
        e.preventDefault()
        setError('')
        setCreating(true)

        const result = await createFamily(familyName)
        if (result.success) {
            setShowCreateFamily(false)
            setFamilyName('')
        } else {
            setError(result.error)
        }
        setCreating(false)
    }

    const renderProfile = (member) => (
        <div 
            onClick={() => member.user.phone && member.user_id !== user.id && setSelectedMember(member)}
            className={`flex flex-col items-center gap-2 ${member.user.phone && member.user_id !== user.id ? 'cursor-pointer' : ''}`}
        >
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-lg font-bold overflow-hidden shadow-lg ${member.user_id === user.id ? isDark ? 'ring-2 ring-white' : 'ring-2 ring-gray-800' : ''}`}>
                {member.user.avatar_url ? (
                    <img src={member.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    member.user.full_name?.charAt(0) || 'U'
                )}
            </div>
            <p className={`text-xs font-semibold truncate max-w-[70px] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {member.user.nickname || member.user.full_name?.split(' ')[0]}
            </p>
        </div>
    )

    const renderFamilyTree = () => {
        const rendered = new Set()
        
        // Find true roots (no parents AND not a spouse of someone with parents)
        const roots = familyMembers.filter(m => {
            if (m.father_id || m.mother_id) return false
            // If this person is a spouse of someone who has parents, they're not a root
            const isSpouseOfChild = familyMembers.some(other => 
                other.user.spouse_id === m.user_id && (other.father_id || other.mother_id)
            )
            return !isSpouseOfChild
        })
        
        const renderGeneration = (members) => {
            return members.map(member => {
                if (rendered.has(member.user_id)) return null
                rendered.add(member.user_id)
                
                const spouse = member.user.spouse_id ? familyMembers.find(m => m.user_id === member.user.spouse_id) : null
                if (spouse) rendered.add(spouse.user_id)
                
                const children = familyMembers.filter(m => 
                    m.father_id === member.user_id || m.mother_id === member.user_id ||
                    (spouse && (m.father_id === spouse.user_id || m.mother_id === spouse.user_id))
                )
                
                return (
                    <div key={member.id} className="flex flex-col items-center gap-4">
                        <div className={`flex items-center gap-3 ${spouse ? `px-4 py-2 rounded-2xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}` : ''}`}>
                            {renderProfile(member)}
                            {spouse && (
                                <>
                                    <span className="text-red-500 text-2xl mb-6">❤️</span>
                                    {renderProfile(spouse)}
                                </>
                            )}
                        </div>
                        {children.length > 0 && (
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-px h-4 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                                <div className="flex gap-6">
                                    {renderGeneration(children)}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })
        }
        
        return <div className="flex gap-8">{renderGeneration(roots)}</div>
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 animate-fade-in">
                <div className="glass-card p-8">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-white text-center mt-4">Loading...</p>
                </div>
            </div>
        )
    }

    if (families.length === 0) {
        return (
            <div className="max-w-md mx-auto animate-slide-up px-3 sm:px-4 py-4 sm:py-6">
                <div className="glass-card-light p-5 sm:p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 glass-card flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
                        <p className="text-gray-600">Create your family or join an existing one</p>
                    </div>

                    {!showCreateFamily ? (
                        <div className="space-y-3">
                            <button onClick={() => setShowCreateFamily(true)} className="btn-primary w-full ios-button">
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Family
                                </span>
                            </button>
                            <button onClick={() => setShowJoinFamily(true)} className="w-full py-3 px-4 rounded-2xl border-2 border-gray-300 bg-white text-gray-700 font-semibold transition-all hover:border-cyan-500 hover:bg-cyan-50 active:scale-95">
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Join with Code
                                </span>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateFamily} className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Family Name</label>
                                <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="glass-input-light" placeholder="e.g., Smith Family" required autoFocus />
                            </div>
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                                    <p className="text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button type="submit" disabled={creating} className="btn-primary flex-1 ios-button">{creating ? 'Creating...' : 'Create'}</button>
                                <button type="button" onClick={() => setShowCreateFamily(false)} className="btn-secondary flex-1 ios-button">Cancel</button>
                            </div>
                        </form>
                    )}
                </div>
                {showJoinFamily && (<JoinFamily onClose={() => setShowJoinFamily(false)} onJoined={() => window.location.reload()} />)}
            </div>
        )
    }

    return (
        <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4">
            {upcomingEvents.length > 0 && (
                <div className={`max-w-4xl mx-auto rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white/80 backdrop-blur-xl'} shadow-lg p-4`}>
                    <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Upcoming Events</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {upcomingEvents.map((event, i) => (
                            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'} min-w-fit`}>
                                <span className="text-xl">{event.emoji}</span>
                                <div>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{event.name}</p>
                                    <p className={`text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{event.days} days</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className={`max-w-4xl mx-auto rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white/80 backdrop-blur-xl'} shadow-lg`}>
                <div className="flex items-stretch">
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center p-4 sm:p-6">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent flex-shrink-0 mr-6">{currentFamily?.name}</h2>
                            <button 
                                onClick={() => setShowTree(!showTree)}
                                className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            >
                                <svg className={`w-5 h-5 transition-transform ${showTree ? 'rotate-180' : ''} ${isDark ? 'text-white' : 'text-gray-800'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center gap-6 overflow-x-auto px-4 sm:px-6 pb-4 sm:pb-6">
                            {showTree ? renderFamilyTree() : (
                                familyMembers.sort((a, b) => {
                                    const getAge = (m) => {
                                        if (!m.user.date_of_birth) return Infinity
                                        return new Date() - new Date(m.user.date_of_birth)
                                    }
                                    const aSpouse = a.user.spouse_id ? familyMembers.find(fm => fm.user_id === a.user.spouse_id) : null
                                    const bSpouse = b.user.spouse_id ? familyMembers.find(fm => fm.user_id === b.user.spouse_id) : null
                                    const aAge = (a.user.gender === 'Male' || !aSpouse) ? getAge(a) : (aSpouse.user.gender === 'Male' ? getAge(aSpouse) : getAge(a))
                                    const bAge = (b.user.gender === 'Male' || !bSpouse) ? getAge(b) : (bSpouse.user.gender === 'Male' ? getAge(bSpouse) : getAge(b))
                                    return bAge - aAge
                                }).map(member => {
                                    const spouse = member.user.spouse_id ? familyMembers.find(m => m.user_id === member.user.spouse_id) : null
                                    if (spouse && member.user_id > spouse.user_id) return null
                                    
                                    if (spouse) {
                                        return (
                                            <div key={member.id} className={`flex items-center gap-3 min-w-fit px-4 py-2 rounded-2xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                                                {renderProfile(member)}
                                                <span className="text-red-500 text-2xl mb-6">❤️</span>
                                                {renderProfile(spouse)}
                                            </div>
                                        )
                                    }
                                    return <div key={member.id}>{renderProfile(member)}</div>
                                })
                            )}
                        </div>
                    </div>
                    {(currentUserRole === 'admin' || currentUserRole === 'admin_lite') && (
                        <button onClick={() => setShowAddMember(true)} className="px-6 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-3xl font-bold hover:from-cyan-600 hover:to-teal-600 transition-all active:scale-95 flex-shrink-0">+</button>
                    )}
                </div>
            </div>

            {showAddMember && (<AddMemberModal familyId={currentFamily.id} currentUserRole={currentUserRole} onClose={() => setShowAddMember(false)} onMemberAdded={refreshFamilies} />)}

            {selectedMember && (
                <div onClick={() => setSelectedMember(null)} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div onClick={(e) => e.stopPropagation()} className="glass-card-light p-6 max-w-sm w-full rounded-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Contact {selectedMember.user.full_name?.split(' ')[0]}</h3>
                        <div className="flex gap-3">
                            <a href={`tel:${selectedMember.user.phone}`} className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold transition-all active:scale-95 flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                                </svg>
                                Phone
                            </a>
                            <a href={`https://wa.me/${selectedMember.user.phone.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold transition-all active:scale-95 flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                                </svg>
                                WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
