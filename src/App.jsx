import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Balcao from './pages/Balcao'
import Laboratorio from './pages/Laboratorio'
import Estoque from './pages/Estoque'
import Financeiro from './pages/Financeiro'
import Garantias from './pages/Garantias'
import Funcionarios from './pages/Funcionarios'
import { supabase } from './supabaseClient'

// ===== AUTH CONTEXT =====
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// ===== DATA STORE =====
export const DataContext = createContext(null)

export function useData() {
  return useContext(DataContext)
}

function App() {
  const [user, setUser] = useState(null)
  const [clientes, setClientes] = useState([])
  const [ordensServico, setOrdensServico] = useState([])
  const [estoque, setEstoque] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [atividades, setAtividades] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  // Load session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserAndData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserAndData(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserAndData = async (authId) => {
    try {
      // 1. Try to find existing funcionario by auth_id
      let { data: funcData } = await supabase.from('funcionarios').select('*').eq('auth_id', authId).maybeSingle()

      // 2. If not found by auth_id, check currently logged auth user
      if (!funcData) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          // Check if funcionario exists by email
          const { data: existingByEmail } = await supabase.from('funcionarios').select('*').eq('email', authUser.email).maybeSingle()
          if (existingByEmail) {
            // Link auth_id
            const { data: updated } = await supabase.from('funcionarios').update({ auth_id: authId }).eq('id', existingByEmail.id).select().single()
            funcData = updated || existingByEmail
          } else {
            // Create a new funcionario record for new sign up or Google OAuth user
            const userName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0]
            const isAdminEmail = authUser.email === 'admin@cellexpress.com'
            const newFunc = {
              auth_id: authId,
              nome: userName,
              email: authUser.email,
              cargo: isAdminEmail ? 'Administrador' : 'Atendente',
              ativo: true,
              telefone: '',
              papeis: isAdminEmail 
                ? ['balcao', 'laboratorio', 'estoque', 'financeiro', 'garantias', 'funcionarios']
                : ['balcao', 'laboratorio', 'estoque', 'financeiro', 'garantias']
            }
            const { data: created, error: createErr } = await supabase.from('funcionarios').insert([newFunc]).select().single()
            if (!createErr && created) {
              funcData = created
            }
          }
        }
      }

      if (funcData && funcData.ativo) {
        setUser(funcData)
        await loadData()
      } else {
        await supabase.auth.signOut()
        setUser(null)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching user', error)
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      const [
        { data: clientesData },
        { data: osData },
        { data: estoqueData },
        { data: financeiroData },
        { data: funcData },
        { data: ativData }
      ] = await Promise.all([
        supabase.from('clientes').select('*').order('id', { ascending: false }),
        supabase.from('ordens_servico').select('*').order('id', { ascending: false }),
        supabase.from('estoque').select('*').order('nome', { ascending: true }),
        supabase.from('financeiro').select('*').order('data', { ascending: false }),
        supabase.from('funcionarios').select('*').order('nome', { ascending: true }),
        supabase.from('atividades').select('*').order('data_hora', { ascending: false })
      ])

      setClientes(clientesData || [])
      setOrdensServico(osData || [])
      setEstoque(estoqueData || [])
      setFinanceiro(financeiroData || [])
      setFuncionarios(funcData || [])
      setAtividades(ativData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error || !data.user) {
      return { success: false, error: error?.message || 'Email ou senha incorretos' }
    }
    return { success: true }
  }

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      throw error
    }
    return data
  }

  const signUp = async (nome, email, senha) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          full_name: nome
        }
      }
    })
    if (error) {
      throw error
    }
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const addAtividade = async (acao, detalhes, modulo) => {
    if (!user) return
    const nova = {
      id_usuario: user.id,
      acao,
      detalhes,
      modulo
    }
    
    const { data, error } = await supabase.from('atividades').insert([nova]).select()
    if (!error && data) {
      setAtividades(prev => [data[0], ...prev])
    }
  }

  const addAlerta = (msg, tipo = 'success') => {
    const id = Date.now()
    setAlertas(prev => [...prev, { id, msg, tipo }])
    setTimeout(() => setAlertas(prev => prev.filter(a => a.id !== id)), 4000)
  }

  const dataValue = {
    clientes, setClientes,
    ordensServico, setOrdensServico,
    estoque, setEstoque,
    financeiro, setFinanceiro,
    funcionarios, setFuncionarios,
    atividades, setAtividades,
    alertas, addAlerta,
    addAtividade,
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: '#FFD700', gap: '16px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,215,0,0.2)', borderTopColor: '#FFD700', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '15px', fontWeight: '600' }}>Carregando Cell Express...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, setUser, login, loginWithGoogle, signUp, logout }}>
        <Login />
      </AuthContext.Provider>
    )
  }

  // Determine default route based on user's first role
  const papeisList = Array.isArray(user.papeis) ? user.papeis : []
  const defaultRoute = papeisList.length > 0 ? `/${papeisList[0]}` : '/balcao'

  return (
    <AuthContext.Provider value={{ user, setUser, login, loginWithGoogle, signUp, logout }}>
      <DataContext.Provider value={dataValue}>
        <BrowserRouter>
          <Layout>
            <Routes>
              {papeisList.includes('balcao') && <Route path="/balcao" element={<Balcao />} />}
              {papeisList.includes('laboratorio') && <Route path="/laboratorio" element={<Laboratorio />} />}
              {papeisList.includes('estoque') && <Route path="/estoque" element={<Estoque />} />}
              {papeisList.includes('financeiro') && <Route path="/financeiro" element={<Financeiro />} />}
              {papeisList.includes('garantias') && <Route path="/garantias" element={<Garantias />} />}
              {papeisList.includes('funcionarios') && <Route path="/funcionarios" element={<Funcionarios />} />}
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </DataContext.Provider>
    </AuthContext.Provider>
  )
}

export default App
