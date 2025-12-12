import { useState, useEffect } from 'react'
import { Milk, ChevronLeft, ChevronRight } from 'lucide-react'

export default function MilkDelivery({ isDark }) {
    const [currentDate, setCurrentDate] = useState(new Date())
    
    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        return { firstDay, daysInMonth }
    }

    const { firstDay, daysInMonth } = getDaysInMonth(currentDate)
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>
                    <Milk className="w-7 h-7" />
                    Milk Delivery
                </h2>
            </div>

            <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth} className={`p-2 rounded-lg transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthName}</h3>
                    <button onClick={nextMonth} className={`p-2 rounded-lg transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={`text-center text-xs font-semibold py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{day}</div>
                    ))}
                    {[...Array(firstDay)].map((_, i) => <div key={`empty-${i}`} />)}
                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1
                        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()
                        return (
                            <button
                                key={day}
                                className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all active:scale-95 ${
                                    isToday 
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg' 
                                        : isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                            >
                                {day}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
