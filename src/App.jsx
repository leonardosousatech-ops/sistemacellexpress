import { useState, createContext, useContext } from 'react'
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

// Initial mock users
const MOCK_USERS = [
  { id: 1, nome: 'Leonardo', email: 'leo@cellexpress.com', senha: '123', cargo: 'Gerente', papeis: ['balcao', 'laboratorio', 'estoque', 'financeiro', 'garantias', 'funcionarios'], ativo: true, telefone: '(11) 97667-0356' },
  { id: 2, nome: 'Carlos', email: 'carlos@cellexpress.com', senha: '123', cargo: 'Técnico', papeis: ['laboratorio'], ativo: true, telefone: '(11) 98765-4321' },
  { id: 3, nome: 'Ana', email: 'ana@cellexpress.com', senha: '123', cargo: 'Atendente', papeis: ['balcao'], ativo: true, telefone: '(11) 91234-5678' },
  { id: 4, nome: 'Marcos', email: 'marcos@cellexpress.com', senha: '123', cargo: 'Estoquista', papeis: ['estoque'], ativo: true, telefone: '(11) 99876-5432' },
  { id: 5, nome: 'Julia', email: 'julia@cellexpress.com', senha: '123', cargo: 'Financeiro', papeis: ['financeiro', 'garantias'], ativo: true, telefone: '(11) 92345-6789' },
]

// Initial mock clients
const MOCK_CLIENTES = [
  { id: 1, nome: 'João Silva', telefone: '(11) 99999-1111', email: 'joao@email.com', cpf: '123.456.789-00', endereco: 'Rua A, 123 - Mogi das Cruzes' },
  { id: 2, nome: 'Maria Santos', telefone: '(11) 99999-2222', email: 'maria@email.com', cpf: '987.654.321-00', endereco: 'Av. B, 456 - Mogi das Cruzes' },
  { id: 3, nome: 'Pedro Oliveira', telefone: '(11) 99999-3333', email: 'pedro@email.com', cpf: '456.789.123-00', endereco: 'Rua C, 789 - Suzano' },
  { id: 4, nome: 'Lucia Ferreira', telefone: '(11) 99999-4444', email: 'lucia@email.com', cpf: '321.654.987-00', endereco: 'Av. D, 321 - Mogi das Cruzes' },
]

// Initial mock OS
const MOCK_OS = [
  { id: 1001, id_cliente: 1, tipo_aparelho: 'Celular', modelo: 'iPhone 13', condicao: 'Tela trincada, sem arranhões no corpo', problema: 'Tela não responde ao toque na parte inferior', status: 'em-reparo', prioridade: 'alta', id_tecnico: 2, valor: 350, data_entrada: '2026-08-07T10:30:00', data_conclusao: null, garantia_ate: null, pecas_usadas: [] },
  { id: 1002, id_cliente: 2, tipo_aparelho: 'Celular', modelo: 'Samsung Galaxy S23', condicao: 'Sem danos visíveis', problema: 'Bateria descarrega muito rápido, esquenta', status: 'na-fila', prioridade: 'normal', id_tecnico: null, valor: null, data_entrada: '2026-08-08T14:00:00', data_conclusao: null, garantia_ate: null, pecas_usadas: [] },
  { id: 1003, id_cliente: 3, tipo_aparelho: 'Notebook', modelo: 'Dell Inspiron 15', condicao: 'Arranhões na tampa', problema: 'Não liga, sem reação ao pressionar botão power', status: 'em-analise', prioridade: 'urgente', id_tecnico: 2, valor: null, data_entrada: '2026-08-06T09:00:00', data_conclusao: null, garantia_ate: null, pecas_usadas: [] },
  { id: 1004, id_cliente: 4, tipo_aparelho: 'Tablet', modelo: 'iPad Air 5', condicao: 'Bom estado geral', problema: 'Conector de carga não funciona, não carrega', status: 'pronto', prioridade: 'normal', id_tecnico: 2, valor: 180, data_entrada: '2026-08-05T11:00:00', data_conclusao: '2026-08-09T16:00:00', garantia_ate: '2026-11-09', pecas_usadas: [{ id_item: 3, quantidade: 1 }] },
  { id: 1005, id_cliente: 1, tipo_aparelho: 'Celular', modelo: 'Motorola Edge 40', condicao: 'Traseira trincada', problema: 'Câmera traseira principal com imagem embaçada', status: 'aguardando-peca', prioridade: 'baixa', id_tecnico: 2, valor: 220, data_entrada: '2026-08-04T15:30:00', data_conclusao: null, garantia_ate: null, pecas_usadas: [] },
  { id: 1006, id_cliente: 2, tipo_aparelho: 'Celular', modelo: 'Xiaomi Redmi Note 12', condicao: 'Sem danos visíveis', problema: 'Tela com manchas roxas, display danificado', status: 'entregue', prioridade: 'normal', id_tecnico: 2, valor: 280, data_entrada: '2026-07-20T09:00:00', data_conclusao: '2026-07-23T14:00:00', garantia_ate: '2026-10-23', pecas_usadas: [{ id_item: 1, quantidade: 1 }] },
]

// Initial mock stock (DB de Peças expandido)
const MOCK_ESTOQUE = [
  { id: 1, nome: 'Tela Frontal Original Apple iPhone 11', categoria: 'peca', quantidade: 5, preco_custo: 250, preco_venda: 450, estoque_minimo: 2 },
  { id: 2, nome: 'Tela Frontal Original Apple iPhone 13', categoria: 'peca', quantidade: 3, preco_custo: 600, preco_venda: 950, estoque_minimo: 2 },
  { id: 3, nome: 'Bateria Original Apple iPhone 11', categoria: 'peca', quantidade: 8, preco_custo: 80, preco_venda: 220, estoque_minimo: 4 },
  { id: 4, nome: 'Bateria Original Apple iPhone 13', categoria: 'peca', quantidade: 6, preco_custo: 120, preco_venda: 300, estoque_minimo: 3 },
  { id: 5, nome: 'Display OLED Samsung Galaxy S22', categoria: 'peca', quantidade: 2, preco_custo: 450, preco_venda: 750, estoque_minimo: 1 },
  { id: 6, nome: 'Display LCD Samsung Galaxy A54', categoria: 'peca', quantidade: 4, preco_custo: 180, preco_venda: 350, estoque_minimo: 2 },
  { id: 7, nome: 'Bateria Samsung Galaxy S22', categoria: 'peca', quantidade: 5, preco_custo: 90, preco_venda: 250, estoque_minimo: 3 },
  { id: 8, nome: 'Conector de Carga USB-C (Samsung/Motorola)', categoria: 'peca', quantidade: 20, preco_custo: 15, preco_venda: 90, estoque_minimo: 5 },
  { id: 9, nome: 'Conector de Carga Lightning (Apple)', categoria: 'peca', quantidade: 15, preco_custo: 25, preco_venda: 120, estoque_minimo: 5 },
  { id: 10, nome: 'Câmera Traseira Principal iPhone 13', categoria: 'peca', quantidade: 1, preco_custo: 350, preco_venda: 600, estoque_minimo: 1 },
  { id: 11, nome: 'Tampa Traseira Vidro iPhone 13 (Preto)', categoria: 'peca', quantidade: 3, preco_custo: 60, preco_venda: 180, estoque_minimo: 2 },
  { id: 12, nome: 'Tela Frontal Motorola Moto G52', categoria: 'peca', quantidade: 4, preco_custo: 150, preco_venda: 280, estoque_minimo: 2 },
  { id: 13, nome: 'Tela Frontal Xiaomi Redmi Note 12', categoria: 'peca', quantidade: 3, preco_custo: 130, preco_venda: 260, estoque_minimo: 2 },
  { id: 14, nome: 'SSD Kingston NVMe 500GB (Notebook/PC)', categoria: 'peca', quantidade: 5, preco_custo: 180, preco_venda: 320, estoque_minimo: 2 },
  { id: 15, nome: 'Memória RAM DDR4 8GB 3200MHz (Notebook)', categoria: 'peca', quantidade: 6, preco_custo: 120, preco_venda: 220, estoque_minimo: 2 },
  { id: 16, nome: 'Memória RAM DDR4 16GB 3200MHz (Notebook)', categoria: 'peca', quantidade: 4, preco_custo: 210, preco_venda: 380, estoque_minimo: 2 },
  { id: 17, nome: 'Pasta Térmica Arctic Silver 5', categoria: 'peca', quantidade: 10, preco_custo: 45, preco_venda: 90, estoque_minimo: 3 },
  { id: 18, nome: 'Teclado Dell Inspiron 15 (Série 3000)', categoria: 'peca', quantidade: 2, preco_custo: 110, preco_venda: 250, estoque_minimo: 1 },
  { id: 19, nome: 'Bateria Dell Inspiron (Padrão)', categoria: 'peca', quantidade: 2, preco_custo: 190, preco_venda: 380, estoque_minimo: 1 },
  { id: 20, nome: 'Tela Frontal iPad 9ª Geração', categoria: 'peca', quantidade: 2, preco_custo: 280, preco_venda: 550, estoque_minimo: 1 },
  { id: 21, nome: 'Película de Vidro 3D (Vários Modelos)', categoria: 'produto_venda', quantidade: 100, preco_custo: 4, preco_venda: 30, estoque_minimo: 20 },
  { id: 22, nome: 'Película de Cerâmica Fosca', categoria: 'produto_venda', quantidade: 50, preco_custo: 6, preco_venda: 40, estoque_minimo: 10 },
  { id: 23, nome: 'Carregador Turbo Tipo-C 20W (Completo)', categoria: 'produto_venda', quantidade: 30, preco_custo: 25, preco_venda: 65, estoque_minimo: 10 },
  { id: 24, nome: 'Carregador Turbo Lightning 20W (Completo)', categoria: 'produto_venda', quantidade: 25, preco_custo: 30, preco_venda: 80, estoque_minimo: 10 },
  { id: 25, nome: 'Cabo Tipo-C para Tipo-C (Baseus)', categoria: 'produto_venda', quantidade: 15, preco_custo: 18, preco_venda: 50, estoque_minimo: 5 },
  { id: 26, nome: 'Fone de Ouvido Bluetooth TWS Premium', categoria: 'produto_venda', quantidade: 12, preco_custo: 45, preco_venda: 120, estoque_minimo: 4 },
  { id: 27, nome: 'Fone de Ouvido P2 com Fio (Original)', categoria: 'produto_venda', quantidade: 20, preco_custo: 15, preco_venda: 45, estoque_minimo: 5 },
  { id: 28, nome: 'Capa Anti-Impacto Transparente (Diversos)', categoria: 'produto_venda', quantidade: 80, preco_custo: 5, preco_venda: 25, estoque_minimo: 15 },
  { id: 29, nome: 'Capa Aveludada Silicone (Cores Variadas)', categoria: 'produto_venda', quantidade: 60, preco_custo: 8, preco_venda: 35, estoque_minimo: 10 },
  { id: 30, nome: 'Pendrive SanDisk 64GB USB 3.0', categoria: 'produto_venda', quantidade: 8, preco_custo: 32, preco_venda: 65, estoque_minimo: 3 },
]

// Initial mock financeiro
const MOCK_FINANCEIRO = [
  { id: 1, tipo: 'entrada', categoria: 'os', valor: 280, descricao: 'OS #1006 - Troca de Tela Xiaomi', id_os: 1006, data: '2026-07-23' },
  { id: 2, tipo: 'saida', categoria: 'compra_peca', valor: 540, descricao: 'Compra de 3x Tela Samsung S23', id_os: null, data: '2026-07-25' },
  { id: 3, tipo: 'entrada', categoria: 'venda', valor: 125, descricao: 'Venda: 5x Película 3D Premium', id_os: null, data: '2026-08-01' },
  { id: 4, tipo: 'saida', categoria: 'despesa_fixa', valor: 1200, descricao: 'Aluguel da loja - Agosto', id_os: null, data: '2026-08-01' },
  { id: 5, tipo: 'entrada', categoria: 'os', valor: 180, descricao: 'OS #1004 - Troca Conector iPad Air', id_os: 1004, data: '2026-08-09' },
  { id: 6, tipo: 'saida', categoria: 'despesa_fixa', valor: 280, descricao: 'Conta de Energia - Agosto', id_os: null, data: '2026-08-05' },
  { id: 7, tipo: 'entrada', categoria: 'venda', valor: 60, descricao: 'Venda: 1x Fone Bluetooth TWS', id_os: null, data: '2026-08-07' },
  { id: 8, tipo: 'entrada', categoria: 'os', valor: 350, descricao: 'OS #1001 - Troca Tela iPhone 13 (pendente)', id_os: 1001, data: '2026-08-09' },
  { id: 9, tipo: 'saida', categoria: 'compra_peca', valor: 170, descricao: 'Compra 2x Câmera Motorola Edge', id_os: null, data: '2026-08-08' },
  { id: 10, tipo: 'entrada', categoria: 'venda', valor: 90, descricao: 'Venda: 2x Carregador Turbo', id_os: null, data: '2026-08-09' },
]

// Mock atividades
const MOCK_ATIVIDADES = [
  { id: 1, id_usuario: 3, acao: 'OS Criada', detalhes: 'OS #1001 - iPhone 13 - João Silva', modulo: 'balcao', data_hora: '2026-08-07T10:30:00' },
  { id: 2, id_usuario: 2, acao: 'Status Atualizado', detalhes: 'OS #1001 alterada para "Em Reparo"', modulo: 'laboratorio', data_hora: '2026-08-07T11:00:00' },
  { id: 3, id_usuario: 3, acao: 'OS Criada', detalhes: 'OS #1002 - Samsung Galaxy S23 - Maria Santos', modulo: 'balcao', data_hora: '2026-08-08T14:00:00' },
  { id: 4, id_usuario: 2, acao: 'Status Atualizado', detalhes: 'OS #1004 alterada para "Pronto"', modulo: 'laboratorio', data_hora: '2026-08-09T16:00:00' },
  { id: 5, id_usuario: 4, acao: 'Entrada Estoque', detalhes: 'Adicionado 10x Película 3D Premium', modulo: 'estoque', data_hora: '2026-08-08T09:00:00' },
  { id: 6, id_usuario: 3, acao: 'Venda Realizada', detalhes: '2x Carregador Turbo 20W - R$ 90,00', modulo: 'balcao', data_hora: '2026-08-09T15:00:00' },
]

function App() {
  const [user, setUser] = useState(null)
  const [clientes, setClientes] = useState(MOCK_CLIENTES)
  const [ordensServico, setOrdensServico] = useState(MOCK_OS)
  const [estoque, setEstoque] = useState(MOCK_ESTOQUE)
  const [financeiro, setFinanceiro] = useState(MOCK_FINANCEIRO)
  const [funcionarios, setFuncionarios] = useState(MOCK_USERS)
  const [atividades, setAtividades] = useState(MOCK_ATIVIDADES)
  const [alertas, setAlertas] = useState([])

  const login = (email, senha) => {
    const found = MOCK_USERS.find(u => u.email === email && u.senha === senha && u.ativo)
    if (found) {
      setUser(found)
      return found
    }
    return null
  }

  const logout = () => setUser(null)

  const addAtividade = (acao, detalhes, modulo) => {
    if (!user) return
    const nova = {
      id: Date.now(),
      id_usuario: user.id,
      acao,
      detalhes,
      modulo,
      data_hora: new Date().toISOString()
    }
    setAtividades(prev => [nova, ...prev])
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
