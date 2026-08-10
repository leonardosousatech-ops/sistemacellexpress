import { useState, useMemo } from 'react'
import { useData } from '../App'
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard,
  Plus, X, Search, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Financeiro() {
  const { financeiro, setFinanceiro, addAtividade, addAlerta } = useData()
  const [filterType, setFilterType] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ tipo: 'entrada', categoria: 'os', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] })

  // KPIs
  const kpis = useMemo(() => {
    const receita = financeiro.filter(f => f.tipo === 'entrada').reduce((a, c) => a + Number(c.valor), 0)
    const despesas = financeiro.filter(f => f.tipo === 'saida').reduce((a, c) => a + Number(c.valor), 0)
    const osEntradas = financeiro.filter(f => f.tipo === 'entrada' && f.categoria === 'os')
    const ticketMedio = osEntradas.length > 0 ? osEntradas.reduce((a, c) => a + Number(c.valor), 0) / osEntradas.length : 0
    return { receita, despesas, lucro: receita - despesas, ticketMedio }
  }, [financeiro])

  // Area Chart
  const chartData = useMemo(() => {
    const byDate = {}
    financeiro.forEach(f => {
      const d = f.data.split('T')[0]
      if (!byDate[d]) byDate[d] = { data: d, receita: 0, despesa: 0 }
      if (f.tipo === 'entrada') byDate[d].receita += Number(f.valor)
      else byDate[d].despesa += Number(f.valor)
    })
    return Object.values(byDate).sort((a, b) => a.data.localeCompare(b.data)).map(d => ({
      ...d, label: new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }))
  }, [financeiro])

  // Pie Chart
  const pieData = useMemo(() => {
    const cats = {}
    financeiro.filter(f => f.tipo === 'entrada').forEach(f => {
      const label = f.categoria === 'os' ? 'Ordens de Serviço' : f.categoria === 'venda' ? 'Vendas' : f.categoria
      cats[label] = (cats[label] || 0) + Number(f.valor)
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value }))
  }, [financeiro])
  const PIE_COLORS = ['#FFD700', '#3B82F6', '#25D366', '#FF4444', '#9C27B0']

  // Filtered transactions
  const filtered = useMemo(() => {
    let list = [...financeiro]
    if (filterType === 'entrada') list = list.filter(f => f.tipo === 'entrada')
    if (filterType === 'saida') list = list.filter(f => f.tipo === 'saida')
    if (searchTerm) list = list.filter(f => f.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
    return list.sort((a, b) => new Date(b.data) - new Date(a.data))
  }, [financeiro, filterType, searchTerm])

  const handleSave = (e) => {
    e.preventDefault()
    const novo = { id: Date.now(), ...form, valor: parseFloat(form.valor) }
    setFinanceiro(prev => [...prev, novo])
    addAtividade('Transação Registrada', `${form.tipo === 'entrada' ? 'Entrada' : 'Saída'}: ${form.descricao} - ${formatCurrency(form.valor)}`, 'financeiro')
    addAlerta('Transação registrada com sucesso!', 'success')
    setShowModal(false)
    setForm({ tipo: 'entrada', categoria: 'os', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontWeight: '800', fontSize: '1.3rem' }}>Financeiro</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Controle de receitas, despesas e fluxo de caixa</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Nova Transação</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon green"><TrendingUp size={20} /></div>
          <div className="kpi-label">Receita Total</div>
          <div className="kpi-value" style={{ color: 'var(--success)', fontSize: '1.4rem' }}>{formatCurrency(kpis.receita)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red"><TrendingDown size={20} /></div>
          <div className="kpi-label">Despesas Totais</div>
          <div className="kpi-value" style={{ color: 'var(--danger)', fontSize: '1.4rem' }}>{formatCurrency(kpis.despesas)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><DollarSign size={20} /></div>
          <div className="kpi-label">Lucro Líquido</div>
          <div className="kpi-value" style={{ color: kpis.lucro >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.4rem' }}>{formatCurrency(kpis.lucro)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon blue"><CreditCard size={20} /></div>
          <div className="kpi-label">Ticket Médio (OS)</div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(kpis.ticketMedio)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginTop: '24px' }}>
        <div className="card">
          <div className="card-header"><h3>Receitas vs Despesas</h3></div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="grReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD700" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="label" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={v => `R$${v}`} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff' }} formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#FFD700" fill="url(#grReceita)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#FF4444" fill="url(#grDespesa)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Receitas por Categoria</h3></div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={5} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>Transações</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="topbar-tabs">
              {[{ k: 'todos', l: 'Todos' }, { k: 'entrada', l: 'Entradas' }, { k: 'saida', l: 'Saídas' }].map(t => (
                <button key={t.k} className={`topbar-tab ${filterType === t.k ? 'active' : ''}`} onClick={() => setFilterType(t.k)}>{t.l}</button>
              ))}
            </div>
            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                  <td style={{ fontWeight: '500' }}>{t.descricao}</td>
                  <td><span style={{ padding: '3px 10px', borderRadius: '6px', background: 'var(--bg-hover)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{t.categoria.replace('_', ' ')}</span></td>
                  <td>
                    <span className={`status-badge ${t.tipo === 'entrada' ? 'pronto' : 'aguardando-peca'}`}>
                      {t.tipo === 'entrada' ? <><ArrowUpRight size={12} /> Entrada</> : <><ArrowDownRight size={12} /> Saída</>}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: t.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)' }}>
                    {t.tipo === 'entrada' ? '+' : '-'}{formatCurrency(t.valor)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Nenhuma transação encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Transação</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo</label>
                    <select className="form-select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value, categoria: e.target.value === 'entrada' ? 'os' : 'compra_peca' })}>
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Categoria</label>
                    <select className="form-select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                      {form.tipo === 'entrada' ? (
                        <><option value="os">Ordem de Serviço</option><option value="venda">Venda</option></>
                      ) : (
                        <><option value="compra_peca">Compra de Peças</option><option value="despesa_fixa">Despesa Fixa</option></>
                      )}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descrição</label>
                  <input className="form-input" required value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Troca de tela iPhone 13" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Valor (R$)</label>
                    <input className="form-input" type="number" step="0.01" required value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
                  </div>
                  <div className="form-group">
                    <label>Data</label>
                    <input className="form-input" type="date" required value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Transação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
