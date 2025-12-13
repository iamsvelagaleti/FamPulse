import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { Search, Plus, Check, X, ShoppingCart, History, Package, Trash2, Tag, List } from 'lucide-react'

export default function GroceryList({ isDark }) {
    const { user } = useAuth()
    const [familyId, setFamilyId] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [allItems, setAllItems] = useState([])
    const [shoppingList, setShoppingList] = useState([])
    const [showAddNew, setShowAddNew] = useState(false)
    const [newItem, setNewItem] = useState({ name: '', quantityType: '', categoryId: '' })
    const [editingItem, setEditingItem] = useState(null)
    const [editDetails, setEditDetails] = useState({ name: '', quantityType: '', categoryId: '' })
    const [categories, setCategories] = useState([])
    const [showManageCategories, setShowManageCategories] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [editingCategory, setEditingCategory] = useState(null)
    const [editCategoryName, setEditCategoryName] = useState('')
    const [showHistory, setShowHistory] = useState(false)
    const [history, setHistory] = useState([])
    const [historySearch, setHistorySearch] = useState('')
    const [startDate] = useState('')
    const [endDate] = useState('')

    const [refreshKey, setRefreshKey] = useState(0)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    // Swipe states
    const [swipedItem, setSwipedItem] = useState(null)
    const [swipeOffset, setSwipeOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [buyPrice, setBuyPrice] = useState('')
    const [swipedHistoryItem, setSwipedHistoryItem] = useState(null)
    const [historySwipeOffset, setHistorySwipeOffset] = useState(0)
    const [isHistoryDragging, setIsHistoryDragging] = useState(false)
    const dragStartX = useRef(0)
    const currentX = useRef(0)
    const [shoppingMode, setShoppingMode] = useState(false)
    const [totalBillAmount, setTotalBillAmount] = useState('')
    const [showBillModal, setShowBillModal] = useState(false)
    const [boughtItems, setBoughtItems] = useState([])
    const [showAddPrices, setShowAddPrices] = useState(false)
    const [selectedMember, setSelectedMember] = useState(null)
    const [familyMembers, setFamilyMembers] = useState([])

    const quantityTypes = ['kgs', 'liters', 'dozens', 'pieces', 'packets']

    const fetchFamilyId = async () => {
        const { data } = await supabase
            .from('family_members')
            .select('family_id, role')
            .eq('user_id', user.id)
            .single()
        if (data) {
            setFamilyId(data.family_id)
            setUserRole(data.role)
            fetchFamilyMembers(data.family_id)
        }
    }

    const fetchFamilyMembers = async (fId) => {
        const { data } = await supabase
            .from('family_members')
            .select('*, user:profiles!user_id(id, full_name, phone, avatar_url)')
            .eq('family_id', fId)
            .in('role', ['admin', 'admin_lite'])
            .neq('user_id', user.id)
        setFamilyMembers(data || [])
    }

    const fetchCategories = useCallback(async () => {
        if (!familyId) return
        const { data } = await supabase
            .from('grocery_categories')
            .select('*')
            .eq('family_id', familyId)
            .order('name')
        setCategories(data || [])
    }, [familyId])

    const fetchAllItems = useCallback(async () => {
        if (!familyId) return
        const { data } = await supabase
            .from('grocery_items')
            .select('*, category:grocery_categories(id, name)')
            .eq('family_id', familyId)
            .order('name')

        setAllItems(data || [])
    }, [familyId])

    const searchItems = async (term, fId) => {
        const { data } = await supabase
            .from('grocery_items')
            .select('*')
            .eq('family_id', fId)
            .ilike('name', `%${term}%`)
            .limit(5)

        return { data: data || [], exactMatch: data?.some(item => item.name.toLowerCase() === term.toLowerCase()) }
    }

    const fetchShoppingList = useCallback(async () => {
        if (!familyId) return
        const { data } = await supabase
            .from('shopping_list')
            .select(`
        *,
        item:grocery_items(*),
        added_by_profile:profiles!shopping_list_added_by_fkey(full_name, avatar_url)
      `)
            .eq('family_id', familyId)
            .eq('is_bought', false)
            .order('added_at', { ascending: false })

        setShoppingList(data || [])
        
        // Fetch bought items without prices
        const { data: bought } = await supabase
            .from('shopping_list')
            .select(`
        *,
        item:grocery_items(*),
        added_by_profile:profiles!shopping_list_added_by_fkey(full_name, avatar_url)
      `)
            .eq('family_id', familyId)
            .eq('is_bought', true)
            .is('price', null)
            .order('bought_at', { ascending: false })
        
        setBoughtItems(bought || [])
    }, [familyId])

    const fetchHistory = useCallback(async () => {
        if (!familyId) return
        let query = supabase
            .from('grocery_history')
            .select(`
        *,
        bought_by_profile:profiles!grocery_history_bought_by_fkey(full_name, avatar_url)
      `)
            .eq('family_id', familyId)

        if (historySearch) {
            query = query.ilike('item_name', `%${historySearch}%`)
        }

        if (startDate) {
            query = query.gte('bought_at', new Date(startDate).toISOString())
        }

        if (endDate) {
            const endDateTime = new Date(endDate)
            endDateTime.setHours(23, 59, 59, 999)
            query = query.lte('bought_at', endDateTime.toISOString())
        }

        const { data } = await query
            .order('bought_at', { ascending: false })
            .limit(50)

        // Calculate price trends
        const historyWithTrends = (data || []).map((item, index) => {
            if (!item.price) return { ...item, priceTrend: null }
            
            // Find previous purchase of same item
            const prevPurchase = data.slice(index + 1).find(h => h.item_name === item.item_name && h.price)
            
            if (!prevPurchase) return { ...item, priceTrend: null }
            
            const priceDiff = parseFloat(item.price) - parseFloat(prevPurchase.price)
            return { ...item, priceTrend: priceDiff }
        })

        setHistory(historyWithTrends)
    }, [familyId, historySearch, startDate, endDate])

    const addToList = async (itemId, quantityType) => {
        // Get item name first
        const { data: itemData } = await supabase
            .from('grocery_items')
            .select('name')
            .eq('id', itemId)
            .single()

        // Get the last bought quantity from history
        const { data: lastPurchase } = await supabase
            .from('grocery_history')
            .select('quantity')
            .eq('family_id', familyId)
            .eq('item_name', itemData.name)
            .order('bought_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        let lastQuantity = lastPurchase?.quantity || (quantityType === 'dozens' ? 0.5 : 1)

        // Check if item already exists in active shopping list
        const { data: existing } = await supabase
            .from('shopping_list')
            .select('id, is_bought')
            .eq('family_id', familyId)
            .eq('item_id', itemId)
            .maybeSingle()

        if (existing) {
            if (existing.is_bought) {
                // Delete the bought item and add new one
                await supabase.from('shopping_list').delete().eq('id', existing.id)
            } else {
                // Item already in list, just return silently
                setSearchTerm('')
                return
            }
        }

        await supabase.from('shopping_list').insert({
            family_id: familyId,
            item_id: itemId,
            added_by: user.id,
            quantity: lastQuantity
        })

        setSearchTerm('')
        await fetchShoppingList()
        setRefreshKey(prev => prev + 1)
    }

    const updateQuantity = async (listItemId, currentQty, quantityType, change) => {
        let step = 1
        if (quantityType === 'kgs') step = 0.25
        else if (quantityType === 'liters' || quantityType === 'dozens') step = 0.5

        const newQty = Math.max(step, currentQty + change * step)
        await supabase.from('shopping_list').update({ quantity: newQty }).eq('id', listItemId)
        await fetchShoppingList()
    }

    const toTitleCase = (str) => {
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    const createAndAddItem = async () => {
        if (!newItem.categoryId) return
        const { data: item } = await supabase
            .from('grocery_items')
            .insert({
                family_id: familyId,
                name: toTitleCase(newItem.name),
                quantity_type: newItem.quantityType,
                category_id: newItem.categoryId,
                created_by: user.id
            })
            .select()
            .single()

        if (item) {
            await addToList(item.id, item.quantity_type)
            setNewItem({ name: '', quantityType: '', categoryId: '' })
            setSearchTerm('')
        }
    }

    const addCategory = async () => {
        if (!newCategoryName.trim()) return
        await supabase.from('grocery_categories').insert({
            family_id: familyId,
            name: toTitleCase(newCategoryName),
            created_by: user.id
        })
        setNewCategoryName('')
        fetchCategories()
    }

    const updateCategory = async (id) => {
        if (!editCategoryName.trim()) return
        await supabase.from('grocery_categories').update({ name: toTitleCase(editCategoryName) }).eq('id', id)
        setEditingCategory(null)
        setEditCategoryName('')
        fetchCategories()
    }

    const deleteCategory = async (id) => {
        await supabase.from('grocery_categories').delete().eq('id', id)
        fetchCategories()
    }

    const handleSwipeStart = (e, itemId, isHistory = false) => {
        e.stopPropagation()
        if (isHistory) {
            setIsHistoryDragging(true)
            setSwipedHistoryItem(itemId)
        } else {
            setIsDragging(true)
            setSwipedItem(itemId)
        }
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
        dragStartX.current = clientX
        currentX.current = clientX
    }

    const handleSwipeMove = (e, isHistory = false) => {
        if (isHistory ? !isHistoryDragging : !isDragging) return
        e.preventDefault()
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
        currentX.current = clientX
        const diff = clientX - dragStartX.current

        // Limit swipe distance
        const maxSwipe = isHistory ? 100 : 250
        const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff))
        if (isHistory) {
            setHistorySwipeOffset(limitedDiff)
        } else {
            setSwipeOffset(limitedDiff)
        }
    }

    const handleSwipeEnd = async (item, isHistory = false) => {
        if (isHistory ? !isHistoryDragging : !isDragging) return
        if (isHistory) {
            setIsHistoryDragging(false)
        } else {
            setIsDragging(false)
        }

        const diff = currentX.current - dragStartX.current
        const threshold = isHistory ? 50 : 100

        if (isHistory && diff < -threshold) {
            // Left swipe on history - Delete
            setDeleteConfirm(item)
            setHistorySwipeOffset(0)
            setSwipedHistoryItem(null)
        } else if (!isHistory) {
            if (diff > threshold) {
                // Right swipe - Delete
                confirmDelete(item)
                resetSwipe()
            } else if (diff < -threshold) {
                // Left swipe - Buy
                setSwipeOffset(-250)
                setBuyPrice('')
            } else {
                resetSwipe()
            }
        } else {
            setHistorySwipeOffset(0)
            setSwipedHistoryItem(null)
        }
    }

    const resetSwipe = () => {
        setSwipeOffset(0)
        setSwipedItem(null)
        setBuyPrice('')
    }

    const confirmDelete = async (item) => {
        await supabase.from('shopping_list').delete().eq('id', item.id)
        await fetchShoppingList()
    }

    const completePurchase = async (item) => {
        await supabase
            .from('shopping_list')
            .update({
                is_bought: true,
                bought_by: user.id,
                bought_at: new Date().toISOString(),
                price: buyPrice || null
            })
            .eq('id', item.id)

        resetSwipe()
    }

    const startEdit = (item) => {
        setEditingItem(item.id)
        setEditDetails({ name: item.name, quantityType: item.quantity_type, categoryId: item.category_id || '' })
    }

    const saveEdit = async (item) => {
        await supabase.from('grocery_items')
            .update({
                name: toTitleCase(editDetails.name),
                quantity_type: editDetails.quantityType,
                category_id: editDetails.categoryId
            })
            .eq('id', item.id)

        setEditingItem(null)
        setEditDetails({ name: '', quantityType: '', categoryId: '' })
        fetchAllItems()
    }

    useEffect(() => {
        fetchFamilyId()
    }, [user])

    useEffect(() => {
        if (familyId) {
            fetchShoppingList()
        }
    }, [familyId])

    useEffect(() => {
        if (familyId && showHistory) {
            fetchHistory()
        }
    }, [familyId, showHistory, historySearch, startDate, endDate, fetchHistory])

    useEffect(() => {
        if (familyId) {
            fetchCategories()
            fetchAllItems()
        }
    }, [familyId])

    useEffect(() => {
        if (searchTerm && familyId) {
            searchItems(searchTerm, familyId).then(({ data, exactMatch }) => {
                setSuggestions(data)
                setShowAddNew(!exactMatch)
            })
        } else {
            setSuggestions([])
            setShowAddNew(false)
        }
    }, [searchTerm, familyId])

    useEffect(() => {
        setNewItem({ name: searchTerm, quantityType: '', categoryId: '' })
    }, [searchTerm])

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setShowManageCategories(false)
                setShowAddPrices(false)
                setShowBillModal(false)
                setDeleteConfirm(null)
                setSelectedMember(null)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    // 🔥 REAL-TIME SYNCHRONIZATION - Auto-updates across all family members
    useEffect(() => {
        if (!familyId) return

        // Polling fallback every 3 seconds
        const pollInterval = setInterval(() => {
            fetchShoppingList()
            fetchAllItems()
            if (showHistory) fetchHistory()
        }, 3000)

        // Subscribe to shopping list changes (INSERT, UPDATE, DELETE)
        const shoppingListChannel = supabase
            .channel(`shopping_list_${familyId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events
                    schema: 'public',
                    table: 'shopping_list',
                    filter: `family_id=eq.${familyId}`
                },
                () => {
                    fetchShoppingList()
                }
            )
            .subscribe()

        // Subscribe to grocery items changes
        const groceryItemsChannel = supabase
            .channel(`grocery_items_${familyId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'grocery_items',
                    filter: `family_id=eq.${familyId}`
                },
                (payload) => {
                    console.log('🔄 Grocery items changed:', payload.eventType, payload.new?.name || payload.old?.name)
                    fetchAllItems()
                    // Refresh shopping list if an item was updated
                    if (payload.eventType === 'UPDATE') {
                        fetchShoppingList()
                    }
                }
            )
            .subscribe()

        // Subscribe to grocery history changes
        const historyChannel = supabase
            .channel(`grocery_history_${familyId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'grocery_history',
                    filter: `family_id=eq.${familyId}`
                },
                () => {
                    fetchHistory()
                }
            )
            .subscribe()

        // Cleanup: Remove all subscriptions when component unmounts
        return () => {
            clearInterval(pollInterval)
            supabase.removeChannel(shoppingListChannel)
            supabase.removeChannel(groceryItemsChannel)
            supabase.removeChannel(historyChannel)
        }
    }, [familyId, showHistory])

    const confirmDeleteHistory = async () => {
        if (!deleteConfirm) return
        await supabase.from('grocery_history').delete().eq('id', deleteConfirm.id)
        // Remove from local state immediately
        setHistory(prev => prev.filter(item => item.id !== deleteConfirm.id))
        setDeleteConfirm(null)
    }

    return (
        <div className="px-3 sm:px-4 py-4 sm:py-6">

            {/* Manage Categories Modal */}
            {showManageCategories && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} max-h-[80vh] overflow-y-auto`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage Categories</h3>
                        
                        {/* Add New Category */}
                        <div className="mb-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(toTitleCase(e.target.value))}
                                    placeholder="New category name"
                                    className={`flex-1 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white placeholder-gray-500' : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'}`}
                                />
                                <button onClick={addCategory} disabled={!newCategoryName.trim()} className={`px-4 py-2 rounded-xl font-semibold transition-all active:scale-95 ${newCategoryName.trim() ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Categories List */}
                        <div className="space-y-2 mb-4">
                            {categories.length === 0 ? (
                                <p className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No categories yet</p>
                            ) : (
                                categories.map(cat => (
                                    <div key={cat.id} className={`p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        {editingCategory === cat.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={editCategoryName}
                                                    onChange={(e) => setEditCategoryName(toTitleCase(e.target.value))}
                                                    className={`flex-1 px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-600 text-white' : 'bg-white border border-gray-300 text-gray-800'}`}
                                                />
                                                <button onClick={() => updateCategory(cat.id)} className="px-3 py-1 rounded-lg bg-cyan-500 text-white transition-all active:scale-95">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setEditingCategory(null); setEditCategoryName('') }} className="px-3 py-1 rounded-lg bg-gray-500 text-white transition-all active:scale-95">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{cat.name}</span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name) }} className={`p-1.5 rounded-lg transition-all active:scale-95 ${isDark ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg bg-red-500 text-white transition-all active:scale-95">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <button onClick={() => { setShowManageCategories(false); setNewCategoryName(''); setEditingCategory(null) }} className={`w-full py-3 rounded-xl font-semibold transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}>Close</button>
                    </div>
                </div>
            )}

            {/* Add Prices Modal */}
            {showAddPrices && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} max-h-[80vh] overflow-y-auto`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Prices</h3>
                        <div className="space-y-3 mb-4">
                            {boughtItems.map(item => (
                                <div key={item.id} className={`p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <div className="mb-2">
                                        <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.item.name}</h4>
                                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.quantity} {item.item.quantity_type}</p>
                                    </div>
                                    <div className="relative">
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>₹</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            onBlur={async (e) => {
                                                if (e.target.value) {
                                                    await supabase
                                                        .from('shopping_list')
                                                        .update({ price: e.target.value })
                                                        .eq('id', item.id)
                                                }
                                            }}
                                            className={`w-full pl-8 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={async () => {
                                for (const item of boughtItems) {
                                    const { data: updatedItem } = await supabase
                                        .from('shopping_list')
                                        .select('price')
                                        .eq('id', item.id)
                                        .single()
                                    
                                    if (updatedItem?.price) {
                                        // Delete entry without price
                                        await supabase
                                            .from('grocery_history')
                                            .delete()
                                            .eq('family_id', item.family_id)
                                            .eq('item_name', item.item.name)
                                            .eq('bought_at', item.bought_at)
                                            .is('price', null)
                                        
                                        // Check if entry with price exists
                                        const { data: existing } = await supabase
                                            .from('grocery_history')
                                            .select('id')
                                            .eq('family_id', item.family_id)
                                            .eq('item_name', item.item.name)
                                            .eq('bought_at', item.bought_at)
                                            .maybeSingle()
                                        
                                        if (existing) {
                                            await supabase
                                                .from('grocery_history')
                                                .update({ price: updatedItem.price })
                                                .eq('id', existing.id)
                                        } else {
                                            await supabase.from('grocery_history').insert({
                                                family_id: item.family_id,
                                                item_name: item.item.name,
                                                quantity: item.quantity,
                                                quantity_type: item.item.quantity_type,
                                                price: updatedItem.price,
                                                bought_by: item.bought_by,
                                                bought_at: item.bought_at
                                            })
                                        }
                                        
                                        await supabase.from('shopping_list').delete().eq('id', item.id)
                                    }
                                }
                                setShowAddPrices(false)
                                fetchShoppingList()
                                fetchHistory()
                            }}
                            className={`w-full py-3 rounded-xl font-semibold transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* Bill Amount Modal */}
            {showBillModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`max-w-sm w-full rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Total Bill Amount</h3>
                        <input
                            type="number"
                            step="0.01"
                            value={totalBillAmount}
                            onChange={(e) => setTotalBillAmount(e.target.value)}
                            placeholder="Enter total bill amount"
                            className={`w-full px-4 py-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white placeholder-gray-500' : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'}`}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowBillModal(false)
                                    setTotalBillAmount('')
                                    setShoppingMode(false)
                                }}
                                className={`flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                Skip
                            </button>
                            <button
                                onClick={() => {
                                    // Save total bill amount logic here
                                    setShowBillModal(false)
                                    setTotalBillAmount('')
                                    setShoppingMode(false)
                                }}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold transition-all active:scale-95"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`max-w-sm w-full rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Purchase?</h3>
                        <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Remove <span className="font-semibold">{deleteConfirm.item_name}</span> from history?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className={`flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteHistory}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold transition-all active:scale-95"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

        <div className="space-y-4">
            {!showHistory ? (
                <>
                    {/* Search Bar + Buttons */}
                    {!shoppingMode && (
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(toTitleCase(e.target.value))}
                                placeholder="Search or add grocery item..."
                                autoComplete="off"
                                className={`w-full pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-500' : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'}`}
                            />

                            {/* Search Suggestions */}
                            {(suggestions.length > 0 || showAddNew) && (
                            <div className={`absolute top-full mt-2 w-full rounded-2xl overflow-hidden z-10 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-lg'}`}>
                                {suggestions.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => addToList(item.id, item.quantity_type)}
                                        className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${isDark ? 'text-white hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-50'}`}
                                    >
                                        <span>{item.name}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {item.quantity_type}
                    </span>
                                    </button>
                                ))}

                                {/* Add New Item */}
                                {showAddNew && (
                                    <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Plus className="w-4 h-4 text-cyan-500" />
                                            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Add new item</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: toTitleCase(e.target.value) })}
                                            placeholder="Item name"
                                            className={`w-full px-3 py-2 mb-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white placeholder-gray-500' : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'}`}
                                        />
                                        <div className="flex gap-2 mb-2">
                                            <select
                                                value={newItem.categoryId}
                                                onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                                                className={`flex-1 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                                            >
                                                <option value="">Select category *</option>
                                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                            </select>
                                            <button onClick={() => setShowManageCategories(true)} className="px-3 py-2 rounded-xl bg-cyan-500 text-white transition-all active:scale-95">
                                                <Tag className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {quantityTypes.map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => setNewItem({ ...newItem, quantityType: type })}
                                                    className={`px-4 py-2 rounded-xl text-sm capitalize transition-all active:scale-95 ${
                                                        newItem.quantityType === type
                                                            ? 'bg-cyan-500 text-white shadow-lg'
                                                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={createAndAddItem}
                                            disabled={!newItem.quantityType || !newItem.categoryId}
                                            className={`w-full py-2 rounded-xl transition-all active:scale-95 ${newItem.quantityType && newItem.categoryId ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                        >
                                            Add to List
                                        </button>
                                    </div>
                                )}
                            </div>
                            )}
                            </div>
                            <button
                                onClick={() => setShoppingMode(true)}
                                className="px-3 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg flex-shrink-0"
                            >
                                <ShoppingCart className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowManageCategories(true)}
                                className="px-3 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg flex-shrink-0"
                            >
                                <Tag className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="px-3 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg flex-shrink-0"
                            >
                                <History className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    
                    {shoppingMode && (
                        <div className="flex items-center gap-3 overflow-x-auto">
                            {familyMembers.map((member) => (
                                <a
                                    key={member.id}
                                    href={`tel:${member.user.phone}`}
                                    className="flex flex-col items-center gap-1 min-w-[60px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden shadow-lg">
                                        {member.user.avatar_url ? (
                                            <img src={member.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            member.user.full_name?.charAt(0) || 'U'
                                        )}
                                    </div>
                                    <p className="text-xs font-semibold text-gray-700 truncate max-w-[60px]">
                                        {member.user.full_name?.split(' ')[0]}
                                    </p>
                                </a>
                            ))}
                            <button
                                onClick={() => setShowBillModal(true)}
                                className="px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg ml-auto flex-shrink-0"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                End Shopping
                            </button>
                        </div>
                    )}

                    {/* All Items */}
                    {!shoppingMode && allItems.length > 0 && (
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                            <div key={refreshKey} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {allItems.filter(item => !shoppingList.some(listItem => listItem.item?.id === item.id)).map((item) => (
                                    editingItem === item.id ? (
                                        <div key={item.id} className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editDetails.name}
                                                    onChange={(e) => setEditDetails({ ...editDetails, name: toTitleCase(e.target.value) })}
                                                    className={`w-full px-2 py-1 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                                                />
                                                <select
                                                    value={editDetails.categoryId}
                                                    onChange={(e) => setEditDetails({ ...editDetails, categoryId: e.target.value })}
                                                    className={`w-full px-2 py-1 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                                                >
                                                    <option value="">Select category</option>
                                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                </select>
                                                <div className="flex flex-wrap gap-1">
                                                    {quantityTypes.map((type) => (
                                                        <button
                                                            key={type}
                                                            onClick={() => setEditDetails({ ...editDetails, quantityType: type })}
                                                            className={`px-2 py-0.5 rounded text-xs capitalize transition-all active:scale-95 ${editDetails.quantityType === type ? 'bg-cyan-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => saveEdit(item)} className="flex-1 py-1 text-xs rounded-lg bg-cyan-500 text-white transition-all active:scale-95">Save</button>
                                                    <button onClick={() => setEditingItem(null)} className="flex-1 py-1 text-xs rounded-lg bg-gray-500 text-white transition-all active:scale-95">Cancel</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            key={item.id}
                                            onClick={() => addToList(item.id, item.quantity_type)}
                                            className={`w-full p-3 rounded-xl text-left transition-all active:scale-95 cursor-pointer ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.name}</div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            startEdit(item)
                                                        }}
                                                        className={`p-1 rounded-lg transition-all active:scale-95 flex-shrink-0 ${isDark ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                {item.category && <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.category.name}</div>}
                                                <span className={`inline-block px-2 py-0.5 text-white text-xs rounded-full font-medium capitalize ${
                                                    item.quantity_type === 'kgs' ? 'bg-gradient-to-r from-purple-400 to-pink-400' :
                                                    item.quantity_type === 'liters' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' :
                                                    item.quantity_type === 'dozens' ? 'bg-gradient-to-r from-orange-400 to-amber-400' :
                                                    item.quantity_type === 'pieces' ? 'bg-gradient-to-r from-green-400 to-emerald-400' :
                                                    'bg-gradient-to-r from-red-400 to-rose-400'
                                                }`}>
                                                    {item.quantity_type}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shopping List */}
                    <div className="space-y-2">
                        {shoppingList.length === 0 ? (
                            <div className={`p-8 text-center rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                                <Package className={`w-12 h-12 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No items in shopping list</p>
                            </div>
                        ) : (
                            shoppingList.map((item) => (
                                <div key={item.id} className="relative overflow-hidden">
                                    {editingItem === item.id ? (
                                        // Edit Mode
                                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={editDetails.name}
                                                    onChange={(e) => setEditDetails({ ...editDetails, name: toTitleCase(e.target.value) })}
                                                    className={`w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                                                />
                                                <select
                                                    value={editDetails.categoryId}
                                                    onChange={(e) => setEditDetails({ ...editDetails, categoryId: e.target.value })}
                                                    className={`w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                                                >
                                                    <option value="">Select category</option>
                                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                </select>
                                                <div className="flex flex-wrap gap-2">
                                                    {quantityTypes.map((type) => (
                                                        <button
                                                            key={type}
                                                            onClick={() => setEditDetails({ ...editDetails, quantityType: type })}
                                                            className={`px-3 py-1 rounded-lg text-xs capitalize transition-all active:scale-95 ${editDetails.quantityType === type ? 'bg-cyan-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => saveEdit(item)} className="flex-1 py-2 rounded-xl bg-cyan-500 text-white transition-all active:scale-95">Save</button>
                                                    <button onClick={() => setEditingItem(null)} className="flex-1 py-2 rounded-xl bg-gray-500 text-white transition-all active:scale-95">Cancel</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : swipedItem === item.id && swipeOffset === -250 ? (
                                        // Buy Mode
                                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                        {item.item.name}
                                                    </h3>
                                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {item.quantity} {item.item.quantity_type}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={resetSwipe}
                                                    className={`p-2 rounded-lg transition-all active:scale-95 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        Price (Optional)
                                                    </label>
                                                    <div className="relative">
                                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>₹</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={buyPrice}
                                                            onChange={(e) => setBuyPrice(e.target.value)}
                                                            placeholder="0.00"
                                                            className={`w-full pl-8 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-900 border border-gray-700 text-white placeholder-gray-500' : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'}`}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => completePurchase(item)}
                                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                                                >
                                                    <Check className="w-5 h-5" />
                                                    {shoppingMode ? 'Mark as Bought' : 'Complete Purchase'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : shoppingMode ? (
                                        // Shopping Mode - Simple Checkbox
                                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={false}
                                                    onChange={async () => {
                                                        await supabase
                                                            .from('shopping_list')
                                                            .update({
                                                                is_bought: true,
                                                                bought_by: user.id,
                                                                bought_at: new Date().toISOString()
                                                            })
                                                            .eq('id', item.id)
                                                        await fetchShoppingList()
                                                    }}
                                                    className="w-6 h-6 rounded-lg cursor-pointer accent-green-500"
                                                />
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden flex-shrink-0">
                                                    {item.added_by_profile?.avatar_url ? (
                                                        <img src={item.added_by_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        item.added_by_profile?.full_name?.[0]?.toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {item.item.name}
                                                    </h3>
                                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {item.quantity} {item.item.quantity_type}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Normal Card with Swipe
                                        <div
                                            className={`relative ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'} rounded-2xl overflow-hidden`}
                                            onMouseDown={(e) => handleSwipeStart(e, item.id)}
                                            onMouseMove={handleSwipeMove}
                                            onMouseUp={() => handleSwipeEnd(item)}
                                            onMouseLeave={() => isDragging && handleSwipeEnd(item)}
                                            onTouchStart={(e) => handleSwipeStart(e, item.id)}
                                            onTouchMove={handleSwipeMove}
                                            onTouchEnd={() => handleSwipeEnd(item)}
                                        >
                                            {/* Swipe Background */}
                                            <div className="absolute inset-0 flex">
                                                <div className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-start px-6">
                                                    <Trash2 className="w-6 h-6 text-white" />
                                                </div>
                                                <div className="flex-1 bg-gradient-to-l from-green-500 to-emerald-500 flex items-center justify-end px-6">
                                                    <Check className="w-6 h-6 text-white" />
                                                </div>
                                            </div>

                                            {/* Card Content */}
                                            <div
                                                className={`relative ${isDark ? 'bg-gray-800' : 'bg-white'} p-4 transition-transform ${isDragging ? '' : 'duration-300 ease-out'}`}
                                                style={{
                                                    transform: swipedItem === item.id ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                                                    cursor: isDragging ? 'grabbing' : 'grab'
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-xs sm:text-sm font-semibold overflow-hidden flex-shrink-0">
                                                        {item.added_by_profile?.avatar_url ? (
                                                            <img src={item.added_by_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            item.added_by_profile?.full_name?.[0]?.toUpperCase() || 'U'
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`text-base sm:text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            {item.item.name}
                                                        </h3>
                                                        <span className={`inline-block px-2 py-0.5 text-white text-xs rounded-full font-medium capitalize ${
                                                            item.item.quantity_type === 'kgs' ? 'bg-gradient-to-r from-purple-400 to-pink-400' :
                                                            item.item.quantity_type === 'liters' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' :
                                                            item.item.quantity_type === 'dozens' ? 'bg-gradient-to-r from-orange-400 to-amber-400' :
                                                            item.item.quantity_type === 'pieces' ? 'bg-gradient-to-r from-green-400 to-emerald-400' :
                                                            'bg-gradient-to-r from-red-400 to-rose-400'
                                                        }`}>
                                                            {item.item.quantity_type}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                updateQuantity(item.id, item.quantity || 1, item.item.quantity_type, -1)
                                                            }}
                                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all active:scale-95 bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-md text-lg sm:text-xl font-bold"
                                                        >
                                                            −
                                                        </button>
                                                        <span className={`text-lg sm:text-xl font-bold min-w-[32px] sm:min-w-[40px] text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                            {item.quantity || 1}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                updateQuantity(item.id, item.quantity || 1, item.item.quantity_type, 1)
                                                            }}
                                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all active:scale-95 bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md text-lg sm:text-xl font-bold"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Swipe Hint */}
                                                {!isDragging && swipedItem !== item.id && (
                                                    <div className={`mt-2 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        ← Swipe left to buy • Swipe right to delete →
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Bought Items - Waiting for Prices */}
                    {boughtItems.length > 0 && (
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Bought Items</h3>
                                <button
                                    onClick={() => setShowAddPrices(true)}
                                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold"
                                >
                                    Add Prices
                                </button>
                            </div>
                            <div className="space-y-2">
                                {boughtItems.map(item => (
                                    <div key={item.id} className={`p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <Check className="w-5 h-5 text-green-500" />
                                            <div className="flex-1">
                                                <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.item.name}</h4>
                                                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.quantity} {item.item.quantity_type}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                // History View
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowHistory(false)}
                            className="px-3 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg flex-shrink-0"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            placeholder="Search by item name..."
                            className={`w-full pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-500' : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'}`}
                        />
                        </div>
                    </div>

                    <div className="space-y-2">
                        {history.length === 0 ? (
                            <div className={`p-8 text-center rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                                <History className={`w-12 h-12 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No purchase history</p>
                            </div>
                        ) : (
                            <>
                                {history.map((item) => (
                                    <div key={item.id} className="relative overflow-hidden rounded-2xl">
                                        {userRole === 'admin' && (
                                            <div className="absolute inset-0 bg-gradient-to-l from-red-500 to-rose-500 flex items-center justify-end px-6">
                                                <Trash2 className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                        <div
                                            className={`relative p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'} transition-transform ${isHistoryDragging ? '' : 'duration-300 ease-out'}`}
                                            style={{
                                                transform: swipedHistoryItem === item.id ? `translateX(${historySwipeOffset}px)` : 'translateX(0)',
                                                cursor: userRole === 'admin' ? (isHistoryDragging ? 'grabbing' : 'grab') : 'default'
                                            }}
                                            onMouseDown={(e) => userRole === 'admin' && handleSwipeStart(e, item.id, true)}
                                            onMouseMove={(e) => userRole === 'admin' && handleSwipeMove(e, true)}
                                            onMouseUp={() => userRole === 'admin' && handleSwipeEnd(item, true)}
                                            onMouseLeave={() => userRole === 'admin' && isHistoryDragging && handleSwipeEnd(item, true)}
                                            onTouchStart={(e) => userRole === 'admin' && handleSwipeStart(e, item.id, true)}
                                            onTouchMove={(e) => userRole === 'admin' && handleSwipeMove(e, true)}
                                            onTouchEnd={() => userRole === 'admin' && handleSwipeEnd(item, true)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden flex-shrink-0">
                                                    {item.bought_by_profile?.avatar_url ? (
                                                        <img src={item.bought_by_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        item.bought_by_profile?.full_name?.[0]?.toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {item.item_name}
                                                    </h3>
                                                    <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {item.quantity} {item.quantity_type} • {new Date(item.bought_at).toLocaleString()}
                                                    </div>
                                                </div>
                                                {item.price && (
                                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                                        <div className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            ₹{item.price}
                                                        </div>
                                                        {item.priceTrend !== null && (
                                                            <div className={`text-sm sm:text-base font-bold ${
                                                                item.priceTrend > 0 ? 'text-red-500' : 
                                                                item.priceTrend < 0 ? 'text-green-500' : 
                                                                'text-gray-400'
                                                            }`}>
                                                                {item.priceTrend > 0 ? '↑' : item.priceTrend < 0 ? '↓' : '='}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {history.some(item => item.price) && (
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Total</span>
                                            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                ₹{history.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
        </div>
    )
}
