import { useState } from 'react'
import { useFamily } from '../../hooks/useFamily'
import { ChevronDown } from 'lucide-react'

export default function FamilySwitcher({ isDark }) {
    const { families, currentFamily, switchFamily } = useFamily()
    const [showDropdown, setShowDropdown] = useState(false)

    if (families.length <= 1) return null

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isDark ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}
            >
                <span className="text-sm font-semibold">{currentFamily?.name}</span>
                <ChevronDown className="w-4 h-4" />
            </button>

            {showDropdown && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className={`absolute top-full left-0 mt-2 w-48 rounded-xl shadow-lg z-20 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        {families.map(family => (
                            <button
                                key={family.id}
                                onClick={() => {
                                    switchFamily(family.id)
                                    setShowDropdown(false)
                                }}
                                className={`w-full text-left px-4 py-3 transition-all first:rounded-t-xl last:rounded-b-xl ${
                                    currentFamily?.id === family.id 
                                        ? isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
                                        : isDark ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-50 text-gray-800'
                                }`}
                            >
                                {family.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
