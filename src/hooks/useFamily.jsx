import {useEffect, useState} from 'react'
import {supabase} from '../supabaseClient'
import {useAuth} from '../contexts/AuthContext'

export const useFamily = () => {
    const {user} = useAuth()
    const [families, setFamilies] = useState([])
    const [currentFamily, setCurrentFamily] = useState(null)
    const [familyMembers, setFamilyMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch user's families
    const fetchFamilies = async () => {
        if (!user) return

        try {
            setLoading(true)
            const {data, error} = await supabase
                .from('family_members')
                .select(`
          *,
          families (
            id,
            name,
            invite_code,
            created_at
          )
        `)
                .eq('user_id', user.id)

            if (error) throw error

            const userFamilies = data.map(fm => ({
                ...fm.families,
                userRole: fm.role
            }))

            setFamilies(userFamilies)

            // Set first family as current if exists
            if (userFamilies.length > 0 && !currentFamily) {
                setCurrentFamily(userFamilies[0])
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Fetch family members
    const fetchFamilyMembers = async (familyId) => {
        if (!familyId) return

        console.log('Fetching members for family:', familyId)

        try {
            const { data, error } = await supabase
                .from('family_members')
                .select(`
        *,
        user:profiles!user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      `)
                .eq('family_id', familyId)

            console.log('Family members data:', data)
            console.log('Family members error:', error)

            if (error) throw error

            setFamilyMembers(data)
        } catch (err) {
            console.error('fetchFamilyMembers error:', err)
            setError(err.message)
        }
    }

    // Create new family
    const createFamily = async (familyName) => {
        try {
            // Create family
            const {data: family, error: familyError} = await supabase
                .from('families')
                .insert([
                    {
                        name: familyName,
                        created_by: user.id
                    }
                ])
                .select()
                .single()

            if (familyError) throw familyError

            // Add creator as admin
            const {error: memberError} = await supabase
                .from('family_members')
                .insert([
                    {
                        family_id: family.id,
                        user_id: user.id,
                        role: 'admin',
                        added_by: user.id
                    }
                ])

            if (memberError) throw memberError

            await fetchFamilies()
            return {success: true, family}
        } catch (err) {
            return {success: false, error: err.message}
        }
    }

    // Add member to family
    const addMember = async (familyId, userId, role) => {
        try {
            const {error} = await supabase
                .from('family_members')
                .insert([
                    {
                        family_id: familyId,
                        user_id: userId,
                        role: role,
                        added_by: user.id
                    }
                ])

            if (error) throw error

            await fetchFamilyMembers(familyId)
            return {success: true}
        } catch (err) {
            return {success: false, error: err.message}
        }
    }

    // Update member role
    const updateMemberRole = async (memberId, newRole) => {
        try {
            const {error} = await supabase
                .from('family_members')
                .update({role: newRole})
                .eq('id', memberId)

            if (error) throw error

            if (currentFamily) {
                await fetchFamilyMembers(currentFamily.id)
            }
            return {success: true}
        } catch (err) {
            return {success: false, error: err.message}
        }
    }

    // Remove member from family
    const removeMember = async (memberId) => {
        try {
            const {error} = await supabase
                .from('family_members')
                .delete()
                .eq('id', memberId)

            if (error) throw error

            if (currentFamily) {
                await fetchFamilyMembers(currentFamily.id)
            }
            return {success: true}
        } catch (err) {
            return {success: false, error: err.message}
        }
    }

    useEffect(() => {
        if (user) {
            fetchFamilies()
        }
    }, [user])

    useEffect(() => {
        if (currentFamily) {
            fetchFamilyMembers(currentFamily.id)
        }
    }, [currentFamily])

    return {
        families,
        currentFamily,
        setCurrentFamily,
        familyMembers,
        loading,
        error,
        createFamily,
        addMember,
        updateMemberRole,
        removeMember,
        refreshFamilies: fetchFamilies
    }
}
