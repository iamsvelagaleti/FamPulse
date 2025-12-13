import { ShoppingCart, Milk, Check } from 'lucide-react'

export default function ModuleSelector({ currentModule, onSelect, onClose, isDark }) {
    const modules = [
        { id: 'groceries', name: 'Groceries', icon: ShoppingCart },
        { id: 'milk', name: 'Milkman', icon: Milk }
    ]

    return (
        <div className={`absolute top-full left-0 mt-2 w-64 rounded-xl overflow-hidden shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`} style={{ zIndex: 200 }}>
            {modules.map(module => {
                const Icon = module.icon
                const isActive = currentModule === module.id
                return (
                    <button
                        key={module.id}
                        onClick={(e) => { e.stopPropagation(); onSelect(module.id); onClose() }}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${isActive ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                    >
                        <Icon className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
                        <span className={`flex-1 text-left font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{module.name}</span>
                        {isActive && <Check className="w-5 h-5 text-cyan-500" />}
                    </button>
                )
            })}
        </div>
    )
}
