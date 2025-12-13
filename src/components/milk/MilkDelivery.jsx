import { useState, useEffect } from 'react'
import { Milk, ChevronLeft, ChevronRight, Settings, Calendar, XCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useFamily } from '../../hooks/useFamily'

export default function MilkDelivery({ isDark, familyId }) {
    const { user } = useAuth()
    const { familyMembers } = useFamily()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [defaultQuantity, setDefaultQuantity] = useState(0.5)
    const [deliveries, setDeliveries] = useState({})
    const [showSettings, setShowSettings] = useState(false)
    const [tempQuantity, setTempQuantity] = useState(0.5)
    const [showMonthlyChanges, setShowMonthlyChanges] = useState(false)
    const [monthlyQuantity, setMonthlyQuantity] = useState(0.5)

    const [packetPrice, setPacketPrice] = useState(0)
    const [tempPacketPrice, setTempPacketPrice] = useState(0)
    const [deliveryChargeType, setDeliveryChargeType] = useState('monthly')
    const [deliveryCharge, setDeliveryCharge] = useState(0)
    const [tempDeliveryChargeType, setTempDeliveryChargeType] = useState('monthly')
    const [tempDeliveryCharge, setTempDeliveryCharge] = useState(0)
    const [vendorWhatsapp, setVendorWhatsapp] = useState('')
    const [tempVendorWhatsapp, setTempVendorWhatsapp] = useState('')
    const [lastPaymentDate, setLastPaymentDate] = useState(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState(0)
    const [pendingTotal, setPendingTotal] = useState(null)
    const [showBreakdown, setShowBreakdown] = useState(false)
    const [lastPayment, setLastPayment] = useState(null)
    const [advanceBalance, setAdvanceBalance] = useState(0)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [cancelFromDate, setCancelFromDate] = useState('')
    const [cancelToDate, setCancelToDate] = useState('')
    const [showChangeModal, setShowChangeModal] = useState(false)
    const [changeQuantity, setChangeQuantity] = useState(0.5)
    const [changeToDate, setChangeToDate] = useState('')

    useEffect(() => {
        if (familyId) {
            loadDefaultQuantity()
            loadDeliveries()
            loadLastPayment().then(setLastPayment)
            loadAdvanceBalance()
        }
    }, [familyId, currentDate])

    useEffect(() => {
        if (familyId && packetPrice > 0) {
            calculatePendingTotal().then(setPendingTotal)
        }
    }, [familyId, lastPaymentDate, packetPrice, deliveryCharge, deliveryChargeType])

    useEffect(() => {
        if (!familyId) return

        const deliveriesChannel = supabase
            .channel('milk_deliveries_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'milk_deliveries', filter: `family_id=eq.${familyId}` }, () => {
                loadDeliveries()
            })
            .subscribe()

        const defaultsChannel = supabase
            .channel('milk_defaults_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'milk_defaults', filter: `family_id=eq.${familyId}` }, () => {
                loadDefaultQuantity()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(deliveriesChannel)
            supabase.removeChannel(defaultsChannel)
        }
    }, [familyId, currentDate])

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setShowSettings(false)
                setShowMonthlyChanges(false)
                setShowPaymentModal(false)
                setShowBreakdown(false)
                setShowCancelModal(false)
                setShowChangeModal(false)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    const loadDefaultQuantity = async () => {
        const { data, error } = await supabase
            .from('milk_defaults')
            .select('default_quantity, packet_price, delivery_charge_type, delivery_charge, vendor_whatsapp')
            .eq('family_id', familyId)
            .maybeSingle()
        
        if (error) {
            console.error('Error loading defaults:', error)
        }
        
        if (data) {
            setDefaultQuantity(data.default_quantity || 0.5)
            setTempQuantity(data.default_quantity || 0.5)
            setPacketPrice(data.packet_price || 0)
            setTempPacketPrice(data.packet_price || 0)
            setDeliveryChargeType(data.delivery_charge_type || 'monthly')
            setTempDeliveryChargeType(data.delivery_charge_type || 'monthly')
            setDeliveryCharge(data.delivery_charge || 0)
            setTempDeliveryCharge(data.delivery_charge || 0)
            setVendorWhatsapp(data.vendor_whatsapp || '')
            setTempVendorWhatsapp(data.vendor_whatsapp || '')
        }
    }

    const loadAdvanceBalance = async () => {
        const { data } = await supabase
            .from('milk_advance')
            .select('balance')
            .eq('family_id', familyId)
            .maybeSingle()
        
        setAdvanceBalance(data?.balance || 0)
    }

    const loadLastPayment = async () => {
        const { data } = await supabase
            .from('milk_payments')
            .select('to_date, amount, payment_date')
            .eq('family_id', familyId)
            .order('to_date', { ascending: false })
            .limit(1)
            .maybeSingle()
        
        setLastPaymentDate(data?.to_date || null)
        return data
    }

    const loadDeliveries = async () => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const startDate = new Date(year, month, 1).toISOString().split('T')[0]
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

        const { data } = await supabase
            .from('milk_deliveries')
            .select('delivery_date, quantity, cancelled')
            .eq('family_id', familyId)
            .gte('delivery_date', startDate)
            .lte('delivery_date', endDate)

        const deliveryMap = {}
        data?.forEach(d => {
            deliveryMap[d.delivery_date] = { quantity: d.quantity, cancelled: d.cancelled || false }
        })
        setDeliveries(deliveryMap)
    }



    const saveDefaultQuantity = async () => {
        const today = new Date().toISOString().split('T')[0]
        
        const { error } = await supabase
            .from('milk_defaults')
            .upsert({
                family_id: familyId,
                default_quantity: tempQuantity,
                packet_price: tempPacketPrice,
                delivery_charge_type: tempDeliveryChargeType,
                delivery_charge: tempDeliveryCharge,
                vendor_whatsapp: tempVendorWhatsapp,
                set_date: today
            }, {
                onConflict: 'family_id'
            })

        if (error) {
            console.error('Error saving defaults:', error)
            alert('Failed to save settings. Check console for details.')
            return
        }

        setDefaultQuantity(tempQuantity)
        setPacketPrice(tempPacketPrice)
        setDeliveryChargeType(tempDeliveryChargeType)
        setDeliveryCharge(tempDeliveryCharge)
        setVendorWhatsapp(tempVendorWhatsapp)
        setShowSettings(false)
    }

    const sendCancelWhatsApp = async (toDate, isTomorrow = false) => {
        if (!vendorWhatsapp) {
            alert('Please add vendor WhatsApp number in settings')
            return
        }
        
        const userRole = familyMembers.find(m => m.user_id === user.id)?.role
        if (userRole !== 'admin' && userRole !== 'admin_lite') {
            alert('Only Admin and Admin Lite can cancel deliveries')
            return
        }
        
        let message
        const datesToCancel = []
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        if (isTomorrow) {
            datesToCancel.push(tomorrow.toISOString().split('T')[0])
            message = 'Tomorrow NO Milk\n\nDhivya Shi Shakti\nBlock3 - 302'
        } else {
            const toDateObj = new Date(toDate)
            const nextDateObj = new Date(toDateObj)
            nextDateObj.setDate(nextDateObj.getDate() + 1)
            
            const current = new Date(tomorrow)
            while (current <= toDateObj) {
                datesToCancel.push(current.toISOString().split('T')[0])
                current.setDate(current.getDate() + 1)
            }
            
            const toDay = toDateObj.toLocaleDateString('en-IN', { weekday: 'short' })
            const toDateStr = toDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            const nextDay = nextDateObj.toLocaleDateString('en-IN', { weekday: 'short' })
            const nextDateStr = nextDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            
            message = `NO Milk from tomorrow to ${toDateStr} (${toDay}).\n\nStart milk again from ${nextDateStr} (${nextDay})\n\nDhivya Shi Shakti\nBlock3 - 302`
        }
        
        for (const date of datesToCancel) {
            await supabase
                .from('milk_deliveries')
                .upsert({
                    family_id: familyId,
                    delivery_date: date,
                    quantity: 0,
                    cancelled: true
                }, { onConflict: 'family_id,delivery_date' })
        }
        
        setDeliveries(prev => {
            const updated = { ...prev }
            datesToCancel.forEach(date => {
                updated[date] = { quantity: 0, cancelled: true }
            })
            return updated
        })
        
        window.open(`https://wa.me/${vendorWhatsapp.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const updateDelivery = async (date, currentQty, isCancelled) => {
        if (lastPaymentDate && date <= lastPaymentDate) {
            alert('Cannot edit deliveries before last payment date')
            return
        }
        
        const userRole = familyMembers.find(m => m.user_id === user.id)?.role
        
        if (isCancelled) {
            if (userRole !== 'admin' && userRole !== 'admin_lite') {
                alert('Only Admin and Admin Lite can uncancel deliveries')
                return
            }
            await supabase
                .from('milk_deliveries')
                .update({ cancelled: false, quantity: defaultQuantity })
                .eq('family_id', familyId)
                .eq('delivery_date', date)
            setDeliveries(prev => ({ ...prev, [date]: { quantity: defaultQuantity, cancelled: false } }))
        } else if (currentQty === 0) {
            await supabase
                .from('milk_deliveries')
                .upsert({
                    family_id: familyId,
                    delivery_date: date,
                    quantity: defaultQuantity,
                    cancelled: false
                })
            setDeliveries(prev => ({ ...prev, [date]: { quantity: defaultQuantity, cancelled: false } }))
        } else {
            await supabase
                .from('milk_deliveries')
                .delete()
                .eq('family_id', familyId)
                .eq('delivery_date', date)
            
            const newDeliveries = { ...deliveries }
            delete newDeliveries[date]
            setDeliveries(newDeliveries)
        }
    }

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        return { firstDay, daysInMonth }
    }

    const getQuantityForDate = (day) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        const dateStr = date.toISOString().split('T')[0]
        
        return deliveries[dateStr] ?? { quantity: 0, cancelled: false }
    }

    const calculateMonthTotal = () => {
        const totalLiters = Object.values(deliveries).reduce((sum, d) => d.cancelled ? sum : sum + (d.quantity || 0), 0)
        const totalPackets = totalLiters / 0.5
        const milkCost = totalPackets * packetPrice
        const deliveryCost = deliveryChargeType === 'per_packet' ? totalPackets * deliveryCharge : deliveryCharge
        const totalCost = milkCost + deliveryCost
        return { totalLiters, totalPackets, milkCost, deliveryCost, totalCost }
    }

    const calculatePendingTotal = async () => {
        const { data: allDeliveries } = await supabase
            .from('milk_deliveries')
            .select('delivery_date')
            .eq('family_id', familyId)
            .order('delivery_date', { ascending: true })
            .limit(1)

        const firstDeliveryDate = allDeliveries?.[0]?.delivery_date
        const startDate = lastPaymentDate ? new Date(new Date(lastPaymentDate).getTime() + 86400000).toISOString().split('T')[0] : firstDeliveryDate || new Date().toISOString().split('T')[0]
        const endDate = new Date().toISOString().split('T')[0]

        const { data } = await supabase
            .from('milk_deliveries')
            .select('delivery_date, quantity')
            .eq('family_id', familyId)
            .gte('delivery_date', startDate)
            .lte('delivery_date', endDate)

        const totalLiters = data?.reduce((sum, d) => sum + d.quantity, 0) || 0
        const totalPackets = totalLiters / 0.5
        const milkCost = totalPackets * packetPrice
        
        let deliveryCost = 0
        if (deliveryChargeType === 'per_packet') {
            deliveryCost = totalPackets * deliveryCharge
        } else {
            const start = new Date(startDate)
            const end = new Date(endDate)
            const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
            deliveryCost = monthsDiff * deliveryCharge
        }
        
        const totalCost = milkCost + deliveryCost
        const netAmount = Math.max(0, totalCost - advanceBalance)
        
        const start = new Date(startDate)
        const end = new Date(endDate)
        const deliveredDates = new Set(data?.map(d => d.delivery_date) || [])
        const notDeliveredDates = []
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0]
            if (!deliveredDates.has(dateStr)) {
                notDeliveredDates.push(dateStr)
            }
        }
        
        return { totalLiters, totalPackets, milkCost, deliveryCost, totalCost, netAmount, startDate, endDate, notDeliveredDates }
    }

    const recordPayment = async () => {
        const pending = await calculatePendingTotal()
        const today = new Date().toISOString().split('T')[0]
        const paidAmount = paymentAmount || pending.totalCost
        const newAdvance = paidAmount - pending.totalCost
        
        const { error } = await supabase
            .from('milk_payments')
            .insert({
                family_id: familyId,
                payment_date: today,
                amount: paidAmount,
                from_date: pending.startDate,
                to_date: pending.endDate,
                advance_balance: newAdvance > 0 ? newAdvance : 0
            })

        if (!error && newAdvance > 0) {
            await supabase
                .from('milk_advance')
                .upsert({
                    family_id: familyId,
                    balance: newAdvance
                }, { onConflict: 'family_id' })
        }

        if (!error) {
            setShowPaymentModal(false)
            setPaymentAmount(0)
            const payment = await loadLastPayment()
            setLastPayment(payment)
            loadAdvanceBalance()
        }
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
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const tomorrow = new Date()
                            tomorrow.setDate(tomorrow.getDate() + 1)
                            setChangeQuantity(defaultQuantity)
                            setChangeToDate(tomorrow.toISOString().split('T')[0])
                            setShowChangeModal(true)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center gap-2 ${isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white shadow-sm'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span className="hidden sm:inline">Change Qty</span>
                    </button>
                    <button
                        onClick={() => {
                            if (!vendorWhatsapp) {
                                alert('Please add vendor WhatsApp in settings first')
                                return
                            }
                            const tomorrow = new Date()
                            tomorrow.setDate(tomorrow.getDate() + 1)
                            setCancelToDate(tomorrow.toISOString().split('T')[0])
                            setShowCancelModal(true)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center gap-2 ${isDark ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-sm'}`}
                    >
                        <XCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Cancel</span>
                    </button>
                    <button
                        onClick={() => { setMonthlyQuantity(defaultQuantity); setShowMonthlyChanges(true) }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center gap-2 ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'}`}
                    >
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">Monthly</span>
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className={`px-3 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-sm'}`}
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Settings</span>
                    </button>
                </div>
            </div>

            <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth} className={`p-2 rounded-lg transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthName}</h3>
                        {packetPrice > 0 && (
                            <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>₹{packetPrice}/packet</span>
                        )}
                    </div>
                    <button onClick={nextMonth} className={`p-2 rounded-lg transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {Object.keys(deliveries).length > 0 && (
                    <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>This Month</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Milk: {calculateMonthTotal().totalLiters}L ({calculateMonthTotal().totalPackets} packets)</span>
                            <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>₹{calculateMonthTotal().milkCost.toFixed(2)}</span>
                        </div>
                        {deliveryCharge > 0 && (
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Delivery {deliveryChargeType === 'per_packet' ? `(₹${deliveryCharge}/packet)` : '(Monthly)'}</span>
                                <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>₹{calculateMonthTotal().deliveryCost.toFixed(2)}</span>
                            </div>
                        )}
                        <div className={`flex justify-between items-center text-sm pt-2 border-t ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Month Total</span>
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{calculateMonthTotal().totalCost.toFixed(2)}</span>
                        </div>
                    </div>
                )}

                <div className={`mb-4 p-4 rounded-2xl ${isDark ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-700/50' : 'bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200'}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-left">
                            <div className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                                {lastPaymentDate ? `Since ${new Date(lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Pending'} {advanceBalance > 0 && `(Adv: ₹${advanceBalance.toFixed(0)})`}
                            </div>
                            <div className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                {pendingTotal ? `₹${pendingTotal.netAmount.toFixed(2)}` : 'Loading...'}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowBreakdown(true)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}
                        >
                            Details
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={`text-center text-xs font-semibold py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{day}</div>
                    ))}
                    {[...Array(firstDay)].map((_, i) => <div key={`empty-${i}`} />)}
                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                        const dateStr = date.toISOString().split('T')[0]
                        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()
                        const delivery = getQuantityForDate(day)
                        const quantity = delivery.quantity
                        const isCancelled = delivery.cancelled
                        
                        const isPaid = lastPaymentDate && dateStr <= lastPaymentDate
                        
                        return (
                            <button
                                key={day}
                                onClick={() => !isPaid && updateDelivery(dateStr, quantity, isCancelled)}
                                disabled={isPaid}
                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all ${
                                    isCancelled
                                        ? isDark ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : isPaid
                                        ? isDark ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : isToday 
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg active:scale-95' 
                                        : quantity > 0
                                        ? isDark ? 'bg-green-600 text-white active:scale-95' : 'bg-green-100 text-green-800 active:scale-95'
                                        : isDark ? 'bg-gray-700 text-white active:scale-95' : 'bg-gray-100 text-gray-800 active:scale-95'
                                }`}
                            >
                                <span>{day}</span>
                                {quantity > 0 && !isCancelled && <span className="text-xs">{quantity}L</span>}
                                {isCancelled && <span className="text-xs">✕</span>}
                            </button>
                        )
                    })}
                </div>
            </div>

            {showMonthlyChanges && (
                <div onClick={() => setShowMonthlyChanges(false)} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div onClick={(e) => e.stopPropagation()} className={`rounded-2xl p-6 max-w-sm w-full animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Monthly Changes</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <button
                                onClick={() => setMonthlyQuantity(Math.max(0.5, monthlyQuantity - 0.5))}
                                className={`w-12 h-12 rounded-lg font-bold text-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                -
                            </button>
                            <div className={`flex-1 text-center text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {monthlyQuantity}L
                            </div>
                            <button
                                onClick={() => setMonthlyQuantity(monthlyQuantity + 0.5)}
                                className={`w-12 h-12 rounded-lg font-bold text-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                +
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={async () => {
                                    const year = currentDate.getFullYear()
                                    const month = currentDate.getMonth()
                                    const days = new Date(year, month + 1, 0).getDate()
                                    const records = []
                                    for (let day = 1; day <= days; day++) {
                                        const date = new Date(year, month, day).toISOString().split('T')[0]
                                        records.push({ family_id: familyId, delivery_date: date, quantity: monthlyQuantity })
                                    }
                                    await supabase.from('milk_deliveries').upsert(records)
                                    await loadDeliveries()
                                    setShowMonthlyChanges(false)
                                }}
                                className="py-3 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            >
                                Set All Days
                            </button>
                            <button
                                onClick={async () => {
                                    const year = currentDate.getFullYear()
                                    const month = currentDate.getMonth()
                                    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
                                    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
                                    await supabase.from('milk_deliveries').delete().eq('family_id', familyId).gte('delivery_date', startDate).lte('delivery_date', endDate)
                                    await loadDeliveries()
                                    setShowMonthlyChanges(false)
                                }}
                                className="py-3 rounded-lg font-semibold bg-gradient-to-r from-red-500 to-rose-500 text-white"
                            >
                                Clear All Days
                            </button>
                            <button
                                onClick={() => setShowMonthlyChanges(false)}
                                className={`py-3 rounded-lg font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBreakdown && pendingTotal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={() => setShowBreakdown(false)}>
                    <div onClick={(e) => e.stopPropagation()} className={`rounded-2xl p-6 max-w-md w-full animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Payment Breakdown</h3>
                        {lastPayment && (
                            <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                                <div className={`flex items-center justify-between text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Last Payment:</span>
                                        <span className="text-xs">{new Date(lastPayment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <span className="font-semibold">₹{lastPayment.amount.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                        <div className="space-y-3 mb-4">
                            <div className={`flex items-baseline gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span className="font-semibold">Period:</span>
                                <span className="text-xs">{new Date(pendingTotal.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} to {new Date(pendingTotal.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            {pendingTotal.notDeliveredDates.length > 0 && (
                                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <div className="font-semibold mb-2 text-left">Not Delivered ({pendingTotal.notDeliveredDates.length} days)</div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {pendingTotal.notDeliveredDates.map(date => (
                                            <span key={date} className={`text-[10px] px-1.5 py-1 rounded text-center ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
                                                {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className={`flex justify-between text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span>Total Milk:</span>
                                <span className="font-semibold">{pendingTotal.totalLiters}L ({pendingTotal.totalPackets} packets)</span>
                            </div>
                            <div className={`flex justify-between text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span>Milk Cost:</span>
                                <span className="font-semibold">₹{pendingTotal.milkCost.toFixed(2)}</span>
                            </div>
                            {deliveryCharge > 0 && (
                                <div className={`flex justify-between text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span>Delivery Charge:</span>
                                    <span className="font-semibold">₹{pendingTotal.deliveryCost.toFixed(2)}</span>
                                </div>
                            )}
                            <div className={`flex justify-between text-sm pt-3 border-t ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                                <span>Subtotal:</span>
                                <span className="font-semibold">₹{pendingTotal.totalCost.toFixed(2)}</span>
                            </div>
                            {advanceBalance > 0 && (
                                <div className={`flex justify-between text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                    <span>Advance Applied:</span>
                                    <span className="font-semibold">-₹{advanceBalance.toFixed(2)}</span>
                                </div>
                            )}
                            <div className={`flex justify-between text-lg font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                <span>Net Amount:</span>
                                <span>₹{pendingTotal.netAmount.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowBreakdown(false)}
                                className={`flex-1 py-3 rounded-lg font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowBreakdown(false)
                                    setPaymentAmount(pendingTotal.netAmount)
                                    setShowPaymentModal(true)
                                }}
                                className="flex-1 py-3 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                            >
                                Pay Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={() => setShowPaymentModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} className={`rounded-2xl p-6 max-w-sm w-full animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Record Payment</h3>
                        <div className="mb-4">
                            <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                className={`w-full p-3 rounded-lg text-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                            />
                            {paymentAmount > (pendingTotal?.netAmount || 0) && (
                                <div className={`text-xs mt-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                    Advance: ₹{(paymentAmount - (pendingTotal?.netAmount || 0)).toFixed(2)} will be adjusted in next payment
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className={`flex-1 py-3 rounded-lg font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={recordPayment}
                                className="flex-1 py-3 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showChangeModal && (
                <div onClick={() => setShowChangeModal(false)} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div onClick={(e) => e.stopPropagation()} className={`rounded-2xl p-6 max-w-sm w-full animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Change Quantity</h3>
                        <div className="mb-4">
                            <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quantity (Liters)</label>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setChangeQuantity(Math.max(0.5, changeQuantity - 0.5))}
                                    className={`w-12 h-12 rounded-lg font-bold text-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                                >
                                    -
                                </button>
                                <div className={`flex-1 text-center text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {changeQuantity}L
                                </div>
                                <button
                                    onClick={() => setChangeQuantity(changeQuantity + 0.5)}
                                    className={`w-12 h-12 rounded-lg font-bold text-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3 mb-4">
                            <button
                                onClick={async () => {
                                    if (!vendorWhatsapp) {
                                        alert('Please add vendor WhatsApp in settings first')
                                        return
                                    }
                                    const tomorrow = new Date()
                                    tomorrow.setDate(tomorrow.getDate() + 1)
                                    const tomorrowStr = tomorrow.toISOString().split('T')[0]
                                    await supabase
                                        .from('milk_deliveries')
                                        .upsert({
                                            family_id: familyId,
                                            delivery_date: tomorrowStr,
                                            quantity: changeQuantity,
                                            cancelled: false
                                        }, { onConflict: 'family_id,delivery_date' })
                                    await loadDeliveries()
                                    const packets = changeQuantity * 2
                                    const message = `Tomorrow ${changeQuantity}L (${packets} packets)\n\nDhivya Shi Shakti\nBlock3 - 302`
                                    window.open(`https://wa.me/${vendorWhatsapp.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
                                    setShowChangeModal(false)
                                }}
                                className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 text-white"
                            >
                                Change Tomorrow
                            </button>
                            <div className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>or change for period</div>
                            <div>
                                <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Until Date</label>
                                <input
                                    type="date"
                                    value={changeToDate}
                                    onChange={(e) => setChangeToDate(e.target.value)}
                                    className={`w-full p-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    if (!vendorWhatsapp) {
                                        alert('Please add vendor WhatsApp in settings first')
                                        return
                                    }
                                    const tomorrow = new Date()
                                    tomorrow.setDate(tomorrow.getDate() + 1)
                                    const toDate = new Date(changeToDate)
                                    const records = []
                                    const current = new Date(tomorrow)
                                    while (current <= toDate) {
                                        records.push({
                                            family_id: familyId,
                                            delivery_date: current.toISOString().split('T')[0],
                                            quantity: changeQuantity,
                                            cancelled: false
                                        })
                                        current.setDate(current.getDate() + 1)
                                    }
                                    await supabase.from('milk_deliveries').upsert(records, { onConflict: 'family_id,delivery_date' })
                                    await loadDeliveries()
                                    const toDay = toDate.toLocaleDateString('en-IN', { weekday: 'short' })
                                    const toDateStr = toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                    const nextDate = new Date(toDate)
                                    nextDate.setDate(nextDate.getDate() + 1)
                                    const nextDay = nextDate.toLocaleDateString('en-IN', { weekday: 'short' })
                                    const nextDateStr = nextDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                    const packets = changeQuantity * 2
                                    const message = `${changeQuantity}L (${packets} packets) from tomorrow to ${toDateStr} (${toDay}).\n\nBack to normal from ${nextDateStr} (${nextDay})\n\nDhivya Shi Shakti\nBlock3 - 302`
                                    window.open(`https://wa.me/${vendorWhatsapp.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
                                    setShowChangeModal(false)
                                }}
                                className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                            >
                                Change Period
                            </button>
                        </div>
                        <button
                            onClick={() => setShowChangeModal(false)}
                            className={`w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {showCancelModal && (
                <div onClick={() => setShowCancelModal(false)} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div onClick={(e) => e.stopPropagation()} className={`rounded-2xl p-6 max-w-sm w-full animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Cancel Delivery</h3>
                        <div className="space-y-3 mb-4">
                            <button
                                onClick={() => {
                                    const tomorrow = new Date()
                                    tomorrow.setDate(tomorrow.getDate() + 1)
                                    const tomorrowStr = tomorrow.toISOString().split('T')[0]
                                    sendCancelWhatsApp(tomorrowStr, true)
                                    setShowCancelModal(false)
                                }}
                                className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-red-600 to-red-500 text-white"
                            >
                                Cancel Tomorrow
                            </button>
                            <div className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>or cancel for period</div>
                            <div>
                                <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Until Date</label>
                                <input
                                    type="date"
                                    value={cancelToDate}
                                    onChange={(e) => setCancelToDate(e.target.value)}
                                    className={`w-full p-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    sendCancelWhatsApp(cancelToDate)
                                    setShowCancelModal(false)
                                }}
                                className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-orange-600 to-orange-500 text-white"
                            >
                                Cancel Period
                            </button>
                        </div>
                        <button
                            onClick={() => setShowCancelModal(false)}
                            className={`w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {showSettings && (
                <div onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div onClick={(e) => e.stopPropagation()} className={`rounded-2xl p-6 max-w-sm w-full animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Default Settings</h3>
                        
                        <div className="mb-4">
                            <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quantity (Liters)</label>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setTempQuantity(Math.max(0.5, tempQuantity - 0.5))}
                                    className={`w-12 h-12 rounded-lg font-bold text-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                                >
                                    -
                                </button>
                                <div className={`flex-1 text-center text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {tempQuantity}L
                                </div>
                                <button
                                    onClick={() => setTempQuantity(tempQuantity + 0.5)}
                                    className={`w-12 h-12 rounded-lg font-bold text-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Packet Price (₹ per 0.5L)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={tempPacketPrice}
                                onChange={(e) => setTempPacketPrice(parseFloat(e.target.value) || 0)}
                                placeholder="Enter price"
                                className={`w-full p-3 rounded-lg text-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                            />
                        </div>

                        <div className="mb-4">
                            <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Delivery Charge Type</label>
                            <select
                                value={tempDeliveryChargeType}
                                onChange={(e) => setTempDeliveryChargeType(e.target.value)}
                                className={`w-full p-3 rounded-lg text-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                            >
                                <option value="monthly">Monthly (Flat)</option>
                                <option value="per_packet">Per Packet</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Delivery Charge (₹{tempDeliveryChargeType === 'per_packet' ? ' per packet' : ' monthly'})
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={tempDeliveryCharge}
                                onChange={(e) => setTempDeliveryCharge(parseFloat(e.target.value) || 0)}
                                placeholder="Enter charge"
                                className={`w-full p-3 rounded-lg text-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                            />
                        </div>

                        <div className="mb-4">
                            <label className={`text-sm font-semibold mb-2 block text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Vendor WhatsApp</label>
                            <input
                                type="tel"
                                value={tempVendorWhatsapp}
                                onChange={(e) => setTempVendorWhatsapp(e.target.value)}
                                placeholder="+91 9876543210"
                                className={`w-full p-3 rounded-lg text-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSettings(false)}
                                className={`flex-1 py-3 rounded-lg font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveDefaultQuantity}
                                className="flex-1 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
