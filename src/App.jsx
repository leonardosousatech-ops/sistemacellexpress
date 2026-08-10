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

// ===== AUTH CONTEXT =====
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// ===== MOCK DATA STORE =====
export const DataContext = createContext(null)

export function useData() {
  return useContext(DataContext)
}

import { supabase } from './supabaseClient'

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

  // Load all data from Supabase on mount
  useEffect(() => {
    async function loadData() {
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
    loadData()
  }, [])

  const login = (email, senha) => {
    const found = funcionarios.find(u => u.email === email && u.senha === senha && u.ativo)
    if (found) {
      setUser(found)
      return found
    }
    return null
  }

  const logout = () => setUser(null)

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
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700' }}>Carregando sistema...</div>
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, login, logout }}>
        <Login />
      </AuthContext.Provider>
    )
  }

  // Determine default route based on user's first role
  const defaultRoute = `/${user.papeis[0]}`

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <DataContext.Provider value={dataValue}>
        <BrowserRouter>
          <Layout>
            <Routes>
              {user.papeis.includes('balcao') && <Route path="/balcao" element={<Balcao />} />}
              {user.papeis.includes('laboratorio') && <Route path="/laboratorio" element={<Laboratorio />} />}
              {user.papeis.includes('estoque') && <Route path="/estoque" element={<Estoque />} />}
              {user.papeis.includes('financeiro') && <Route path="/financeiro" element={<Financeiro />} />}
              {user.papeis.includes('garantias') && <Route path="/garantias" element={<Garantias />} />}
              {user.papeis.includes('funcionarios') && <Route path="/funcionarios" element={<Funcionarios />} />}
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </DataContext.Provider>
    </AuthContext.Provider>
  )
}

export default App
