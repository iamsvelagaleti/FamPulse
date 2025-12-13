import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useFamily } from '../../hooks/useFamily'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Trash2, ChevronDown } from 'lucide-react'

export default function Countdowns({ isDark }) {
    const { currentFamily, familyMembers } = useFamily()
    const { user } = useAuth()
    const [countdowns, setCountdowns] = useState([])
    const [showAddModal, setShowAddModal] = useState(false)
    const [title, setTitle] = useState('')
    const [name1, setName1] = useState('')
    const [name2, setName2] = useState('')
    const [targetDate, setTargetDate] = useState('')
    const [emoji, setEmoji] = useState('🎉')
    const [category, setCategory] = useState('Other')
    const [includeTime, setIncludeTime] = useState(false)
    const [loading, setLoading] = useState(false)
    const [expandedSections, setExpandedSections] = useState(['Birthday', 'Anniversary', 'Holiday', 'Event', 'Other'])

    const currentUserRole = familyMembers.find(m => m.user_id === user.id)?.role

    useEffect(() => {
        if (currentFamily) fetchCountdowns()
    }, [currentFamily, familyMembers])

    const fetchCountdowns = async () => {
        const { data } = await supabase
            .from('countdowns')
            .select('*')
            .eq('family_id', currentFamily.id)
            .order('target_date', { ascending: true })
        
        // Add birthday countdowns
        const birthdayCountdowns = familyMembers
            .filter(m => m.user.date_of_birth)
            .map(m => {
                const dob = new Date(m.user.date_of_birth)
                const now = new Date()
                const nextBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
                if (nextBirthday < now) {
                    nextBirthday.setFullYear(now.getFullYear() + 1)
                }
                return {
                    id: `birthday-${m.user_id}`,
                    title: m.user.nickname || m.user.full_name?.split(' ')[0],
                    target_date: nextBirthday.toISOString(),
                    emoji: '🎂',
                    category: 'Birthday',
                    isBirthday: true
                }
            })
        
        // Add anniversary countdowns (avoid duplicates for couples)
        const processedAnniversaries = new Set()
        const anniversaryCountdowns = []
        familyMembers.forEach(m => {
            if (m.user.anniversary_date && !processedAnniversaries.has(m.user_id)) {
                processedAnniversaries.add(m.user_id)
                const anniv = new Date(m.user.anniversary_date)
                const now = new Date()
                const nextAnniversary = new Date(now.getFullYear(), anniv.getMonth(), anniv.getDate())
                if (nextAnniversary < now) {
                    nextAnniversary.setFullYear(now.getFullYear() + 1)
                }
                const spouse = m.user.spouse_id ? familyMembers.find(fm => fm.user_id === m.user.spouse_id) : null
                if (spouse) processedAnniversaries.add(spouse.user_id)
                let title
                if (spouse) {
                    const mName = m.user.nickname || m.user.full_name?.split(' ')[0]
                    const sName = spouse.user.nickname || spouse.user.full_name?.split(' ')[0]
                    if (m.user.gender === 'Male') {
                        title = `${mName} ❤️ ${sName}`
                    } else if (spouse.user.gender === 'Male') {
                        title = `${sName} ❤️ ${mName}`
                    } else {
                        title = `${mName} ❤️ ${sName}`
                    }
                } else {
                    title = m.user.nickname || m.user.full_name?.split(' ')[0]
                }
                anniversaryCountdowns.push({
                    id: `anniversary-${m.user_id}`,
                    title,
                    target_date: nextAnniversary.toISOString(),
                    emoji: '💍',
                    category: 'Anniversary',
                    isBirthday: true
                })
            }
        })
        
        const allCountdowns = [...(data || []), ...birthdayCountdowns, ...anniversaryCountdowns]
            .sort((a, b) => new Date(a.target_date) - new Date(b.target_date))
        
        setCountdowns(allCountdowns)
    }

    const handleAdd = async (e) => {
        e.preventDefault()
        setLoading(true)
        
        let finalDate = targetDate
        let finalTitle = title
        
        if (category === 'Anniversary' && name1 && name2) {
            finalTitle = `${name1} ❤️ ${name2}`
        }
        
        if (['Birthday', 'Anniversary'].includes(category)) {
            const inputDate = new Date(targetDate)
            const now = new Date()
            const nextOccurrence = new Date(now.getFullYear(), inputDate.getMonth(), inputDate.getDate())
            if (nextOccurrence < now) {
                nextOccurrence.setFullYear(now.getFullYear() + 1)
            }
            finalDate = nextOccurrence.toISOString()
        }
        
        const { error } = await supabase
            .from('countdowns')
            .insert([{
                family_id: currentFamily.id,
                title: finalTitle,
                target_date: finalDate,
                emoji,
                category,
                created_by: user.id
            }])
        if (!error) {
            fetchCountdowns()
            setShowAddModal(false)
            setTitle('')
            setName1('')
            setName2('')
            setTargetDate('')
            setEmoji('🎉')
            setCategory('Other')
            setIncludeTime(false)
        }
        setLoading(false)
    }

    const handleDelete = async (id) => {
        if (confirm('Delete this countdown?')) {
            await supabase.from('countdowns').delete().eq('id', id)
            fetchCountdowns()
        }
    }

    const calculateTimeLeft = (targetDate, isBirthday, countdownCategory) => {
        let target = new Date(targetDate)
        const now = new Date()
        
        if (['Birthday', 'Anniversary'].includes(countdownCategory)) {
            target = new Date(now.getFullYear(), target.getMonth(), target.getDate())
            if (target < now) {
                target.setFullYear(now.getFullYear() + 1)
            }
        }
        
        const diff = target - now
        if (diff <= 0) return 'Event passed!'
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (isBirthday || countdownCategory !== 'Other') return `${days} days`
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        return `${days}d ${hours}h`
    }

    return (
        <div className="px-3 sm:px-4 py-4 sm:py-6">
            <div className={`rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white/80 backdrop-blur-xl'} shadow-lg p-4 sm:p-6`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Countdowns</h2>
                    {(currentUserRole === 'admin' || currentUserRole === 'admin_lite') && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {['Birthday', 'Anniversary', 'Holiday', 'Event', 'Other'].map(cat => {
                        const items = countdowns.filter(c => c.category === cat)
                        if (items.length === 0) return null
                        const isExpanded = expandedSections.includes(cat)
                        return (
                            <div key={cat}>
                                <button
                                    onClick={() => setExpandedSections(prev => 
                                        prev.includes(cat) ? prev.filter(s => s !== cat) : [...prev, cat]
                                    )}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                                >
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{cat} ({items.length})</span>
                                    <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                </button>
                                {isExpanded && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2">
                                    {items.sort((a, b) => {
                                        const getNextDate = (cd) => {
                                            let target = new Date(cd.target_date)
                                            const now = new Date()
                                            if (['Birthday', 'Anniversary'].includes(cd.category)) {
                                                target = new Date(now.getFullYear(), target.getMonth(), target.getDate())
                                                if (target < now) target.setFullYear(now.getFullYear() + 1)
                                            }
                                            return target
                                        }
                                        return getNextDate(a) - getNextDate(b)
                                    }).map(countdown => (
                        <div key={countdown.id} className={`p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'} flex flex-col items-center justify-center text-center relative aspect-square`}>
                            {!countdown.isBirthday && (currentUserRole === 'admin' || currentUserRole === 'admin_lite') && (
                                <button
                                    onClick={() => handleDelete(countdown.id)}
                                    className={`absolute top-1 right-1 p-1 rounded-lg transition-all active:scale-95 ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                                >
                                    <Trash2 className={`w-3 h-3 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                                </button>
                            )}
                            <span className="text-2xl mb-1">{countdown.emoji}</span>
                            <h3 className={`font-bold text-xs mb-1 ${isDark ? 'text-white' : 'text-gray-900'} line-clamp-2`}>{countdown.title}</h3>
                            <span className={`text-sm font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                {calculateTimeLeft(countdown.target_date, countdown.isBirthday, countdown.category)}
                            </span>
                        </div>
                                    ))}
                                </div>
                                )}
                            </div>
                        )
                    })}
                    {countdowns.length === 0 && (
                        <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            No countdowns yet. Add one to get started!
                        </p>
                    )}
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
                    <div className={`rounded-2xl max-w-md w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Countdown</h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <select
                                value={category}
                                onChange={(e) => {
                                    setCategory(e.target.value)
                                    if (e.target.value === 'Birthday') setEmoji('🎂')
                                    else if (e.target.value === 'Anniversary') setEmoji('💍')
                                    else if (e.target.value === 'Holiday') setEmoji('🎉')
                                }}
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                            >
                                <option value="Birthday">Birthday</option>
                                <option value="Anniversary">Anniversary</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Event">Event</option>
                                <option value="Other">Other</option>
                            </select>
                            {category === 'Anniversary' ? (
                                <>
                                    <input
                                        type="text"
                                        value={name1}
                                        onChange={(e) => setName1(e.target.value)}
                                        placeholder="Hero"
                                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                                        required
                                    />
                                    <input
                                        type="text"
                                        value={name2}
                                        onChange={(e) => setName2(e.target.value)}
                                        placeholder="Heroine"
                                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                                        required
                                    />
                                </>
                            ) : (
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Event title"
                                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                                    required
                                />
                            )}
                            {category === 'Other' && (
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={includeTime}
                                        onChange={(e) => setIncludeTime(e.target.checked)}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className={isDark ? 'text-white' : 'text-gray-900'}>Include time</span>
                                </label>
                            )}
                            <input
                                type={category !== 'Other' || !includeTime ? 'date' : 'datetime-local'}
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                                required
                            />
                            <input
                                type="text"
                                value={emoji}
                                onChange={(e) => setEmoji(e.target.value)}
                                placeholder="Emoji"
                                maxLength={2}
                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                            />
                            <div className="flex gap-3">
                                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold transition-all active:scale-95">
                                    {loading ? 'Adding...' : 'Add'}
                                </button>
                                <button type="button" onClick={() => setShowAddModal(false)} className={`flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
