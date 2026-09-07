import { useState, useMemo } from 'react'
import { useData } from '../App'
import { supabase } from '../supabaseClient'
import { exportToCSV } from '../utils/exportUtils'
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard,
  Plus, X, Search, ArrowUpRight, ArrowDownRight,
  Download, Award, Users, CheckCircle, ChevronDown, ChevronUp, Wallet
} from 'lucide-react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Financeiro() {
  const { financeiro, setFinanceiro, ordensServico, funcionarios, addAtividade, addAlerta } = useData()
  const [filterType, setFilterType] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showComissaoModal, setShowComissaoModal] = useState(false)
  const [selectedFuncionario, setSelectedFuncionario] = useState(null)
  const [comissaoPayoutValor, setComissaoPayoutValor] = useState('')
  const [showComissoesSection, setShowComissoesSection] = useState(true)

  const [form, setForm] = useState({
    tipo: 'entrada',
    categoria: 'os',
    valor: '',
    descricao: '',
    forma_pagamento: 'PIX',
    data: new Date().toISOString().split('T')[0]
  })

  // KPIs
  const kpis = useMemo(() => {
    const receita = (financeiro || []).filter(f => f.tipo === 'entrada').reduce((a, c) => a + Number(c.valor), 0)
    const despesas = (financeiro || []).filter(f => f.tipo === 'saida').reduce((a, c) => a + Number(c.valor), 0)
    const osEntradas = (financeiro || []).filter(f => f.tipo === 'entrada' && (f.categoria === 'os' || f.categoria === 'servico'))
    const ticketMedio = osEntradas.length > 0 ? osEntradas.reduce((a, c) => a + Number(c.valor), 0) / osEntradas.length : 0
    return { receita, despesas, lucro: receita - despesas, ticketMedio }
  }, [financeiro])

  // Commissions Calculations
  const comissoesEquipe = useMemo(() => {
    if (!funcionarios || funcionarios.length === 0) return []

    // Delivered or Ready OS
    const concluidasOS = (ordensServico || []).filter(os => ['pronto', 'entregue'].includes(os.status))
    const totalVendas = (financeiro || []).filter(f => f.tipo === 'entrada' && f.categoria === 'venda')

    return funcionarios.map(func => {
      const taxaServico = func.comissao_servico !== undefined && func.comissao_servico !== null ? Number(func.comissao_servico) : 10
      const taxaVenda = func.comissao_vendas !== undefined && func.comissao_vendas !== null ? Number(func.comissao_vendas) : 5

      // Technician commissions
      const osTotalValor = concluidasOS.reduce((acc, os) => acc + (Number(os.valor) || 0), 0)
      const comissaoServicos = func.cargo === 'Técnico' || func.papeis?.includes('laboratorio')
        ? (osTotalValor * (taxaServico / 100))
        : 0

      // Attendant/Counter sales commissions
      const vendasTotalValor = totalVendas.reduce((acc, v) => acc + (Number(v.valor) || 0), 0)
      const comissaoVendas = func.cargo === 'Atendente' || func.papeis?.includes('balcao')
        ? (vendasTotalValor * (taxaVenda / 100))
        : 0

      const totalComissao = comissaoServicos + comissaoVendas

      return {
        ...func,
        taxaServico,
        taxaVenda,
        qtdOS: concluidasOS.length,
        osTotalValor,
        comissaoServicos,
        vendasTotalValor,
        comissaoVendas,
        totalComissao
      }
    })
  }, [funcionarios, ordensServico, financeiro])

  // Area Chart
  const chartData = useMemo(() => {
    const byDate = {}
    ;(financeiro || []).forEach(f => {
      const d = (f.data || '').split('T')[0]
      if (!d) return
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
    ;(financeiro || []).filter(f => f.tipo === 'entrada').forEach(f => {
      const label = f.categoria === 'os' || f.categoria === 'servico' ? 'Ordens de Serviço' : f.categoria === 'venda' ? 'Vendas Balcão' : f.categoria
      cats[label] = (cats[label] || 0) + Number(f.valor)
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value }))
  }, [financeiro])
  const PIE_COLORS = ['#FFD700', '#3B82F6', '#25D366', '#FF4444', '#9C27B0']

  // Filtered transactions
  const filtered = useMemo(() => {
    let list = [...(financeiro || [])]
    if (filterType === 'entrada') list = list.filter(f => f.tipo === 'entrada')
    if (filterType === 'saida') list = list.filter(f => f.tipo === 'saida')
    if (searchTerm) list = list.filter(f => (f.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()))
    return list.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
  }, [financeiro, filterType, searchTerm])

  const handleSave = async (e) => {
    e.preventDefault()
    const novo = { ...form, valor: parseFloat(form.valor) }
    
    const { data, error } = await supabase.from('financeiro').insert([novo]).select()
    if (error || !data) {
      if(addAlerta) addAlerta('Erro ao registrar transação', 'error')
      return
    }

    setFinanceiro(prev => [data[0], ...(prev || [])])
    if(addAtividade) addAtividade('Transação Registrada', `${form.tipo === 'entrada' ? 'Entrada' : 'Saída'}: ${form.descricao} - ${formatCurrency(form.valor)}`, 'financeiro')
    if(addAlerta) addAlerta('Transação registrada com sucesso!', 'success')
    setShowModal(false)
    setForm({ tipo: 'entrada', categoria: 'os', valor: '', descricao: '', forma_pagamento: 'PIX', data: new Date().toISOString().split('T')[0] })
  }

  // Payout Commission
  const handleOpenPayout = (func) => {
    setSelectedFuncionario(func)
    setComissaoPayoutValor(func.totalComissao ? func.totalComissao.toFixed(2) : '0.00')
    setShowComissaoModal(true)
  }

  const handleConfirmPayout = async (e) => {
    e.preventDefault()
    if (!selectedFuncionario || !comissaoPayoutValor) return

    const valor = parseFloat(comissaoPayoutValor)
    if (isNaN(valor) || valor <= 0) {
      if (addAlerta) addAlerta('Informe um valor de comissão válido', 'warning')
      return
    }

    const payload = {
      tipo: 'saida',
      categoria: 'despesa_fixa',
      valor: valor,
      descricao: `Pagamento de Comissão: ${selectedFuncionario.nome} (${selectedFuncionario.cargo})`,
      forma_pagamento: 'PIX',
      data: new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase.from('financeiro').insert([payload]).select()
    if (error || !data) {
      if (addAlerta) addAlerta('Erro ao registrar pagamento de comissão no banco', 'error')
      return
    }

    setFinanceiro(prev => [data[0], ...(prev || [])])
    if (addAtividade) addAtividade('Comissão Paga', `Comissão de ${selectedFuncionario.nome}: ${formatCurrency(valor)}`, 'financeiro')
    if (addAlerta) addAlerta(`Comissão de ${selectedFuncionario.nome} paga com sucesso!`, 'success')
    setShowComissaoModal(false)
    setSelectedFuncionario(null)
  }

  // Export Financial Statement (.csv)
  const handleExportFinanceiro = () => {
    const headers = ['ID', 'Data', 'Descricao', 'Categoria', 'Tipo', 'Forma Pagamento', 'Valor (R$)']
    const rows = filtered.map(t => [
      t.id,
      t.data ? new Date(t.data).toLocaleDateString('pt-BR') : '',
      t.descricao,
      t.categoria,
      t.tipo,
      t.forma_pagamento || '-',
      t.valor ? Number(t.valor).toFixed(2) : '0.00'
    ])
    exportToCSV('Extrato_Financeiro_CellExpress', headers, rows)
    if (addAlerta) addAlerta('Extrato financeiro exportado em Excel (.csv) com sucesso!', 'success')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontWeight: '800', fontSize: '1.3rem' }}>Financeiro</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Controle de receitas, despesas, comissões da equipe e fluxo de caixa</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleExportFinanceiro}
            style={{
              backgroundColor: 'rgba(37, 211, 102, 0.15)',
              color: '#25D366',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <Download size={15} /> Exportar Extrato (.csv)
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nova Transação
          </button>
        </div>
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

      {/* Team Commissions Section */}
      <div className="card" style={{ marginTop: '24px', padding: '16px 20px', backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '12px' }}>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowComissoesSection(!showComissoesSection)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', color: '#FFD700', padding: '8px', borderRadius: '8px' }}>
              <Award size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>Comissões da Equipe</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #A0A0A0)' }}>
                Cálculo automático de comissões por reparos de bancada e vendas no balcão
              </p>
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
            {showComissoesSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showComissoesSection && (
          <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a', color: 'var(--text-muted, #A0A0A0)' }}>
                  <th style={{ padding: '10px' }}>Colaborador</th>
                  <th style={{ padding: '10px' }}>Cargo</th>
                  <th style={{ padding: '10px' }}>Comissão Reparos</th>
                  <th style={{ padding: '10px' }}>Comissão Vendas</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total Acumulado</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {comissoesEquipe.map(func => (
                  <tr key={func.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '10px', fontWeight: '600', color: '#fff' }}>
                      {func.nome}
                    </td>
                    <td style={{ padding: '10px', color: '#aaa' }}>
                      <span style={{ backgroundColor: '#222', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {func.cargo}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#3B82F6' }}>
                      {func.cargo === 'Técnico' || func.papeis?.includes('laboratorio') ? (
                        <span>{func.taxaServico}% ({formatCurrency(func.comissaoServicos)})</span>
                      ) : (
                        <span style={{ color: '#555' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px', color: '#25D366' }}>
                      {func.cargo === 'Atendente' || func.papeis?.includes('balcao') ? (
                        <span>{func.taxaVenda}% ({formatCurrency(func.comissaoVendas)})</span>
                      ) : (
                        <span style={{ color: '#555' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: '#FFD700', fontSize: '14px' }}>
                      {formatCurrency(func.totalComissao)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenPayout(func)}
                        disabled={func.totalComissao <= 0}
                        style={{
                          backgroundColor: func.totalComissao > 0 ? '#FFD700' : '#2a2a2a',
                          color: func.totalComissao > 0 ? '#000' : '#666',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: func.totalComissao > 0 ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Wallet size={13} /> Pagar
                      </button>
                    </td>
                  </tr>
                ))}
                {comissoesEquipe.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      Nenhum colaborador encontrado para cálculo de comissões.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
                  <td><span style={{ padding: '3px 10px', borderRadius: '6px', background: 'var(--bg-hover)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{t.categoria?.replace('_', ' ')}</span></td>
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

      {/* New Transaction Modal */}
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

      {/* Payout Commission Modal */}
      {showComissaoModal && selectedFuncionario && (
        <div className="modal-overlay" onClick={() => setShowComissaoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Lançar Pagamento de Comissão</h3>
              <button className="btn-icon" onClick={() => setShowComissaoModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleConfirmPayout}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                  <div style={{ fontSize: '13px', color: '#aaa' }}>Colaborador:</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{selectedFuncionario.nome} ({selectedFuncionario.cargo})</div>
                </div>

                <div className="form-group">
                  <label>Valor do Pagamento (R$)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    required
                    value={comissaoPayoutValor}
                    onChange={e => setComissaoPayoutValor(e.target.value)}
                    placeholder="0,00"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Será lançada uma despesa de comissão no fluxo de caixa.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowComissaoModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#25D366', color: '#fff' }}>
                  <CheckCircle size={16} /> Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
