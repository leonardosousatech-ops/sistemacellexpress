import { useState, useMemo, useEffect } from 'react'
import { useData, useAuth } from '../App'
import { supabase } from '../supabaseClient'
import DamageMap from '../components/DamageMap'
import {
  Wrench, AlertCircle, Clock, CheckCircle, Search,
  Settings, ExternalLink, Plus, X, Play, Pause, ChevronRight, Printer, Flame, Trash2,
  Kanban, LayoutGrid, DollarSign, Package, ArrowRight, Layers
} from 'lucide-react'

const STATUS_LABELS = {
  'na-fila': 'Na Fila',
  'em-analise': 'Em Análise',
  'aguardando-peca': 'Aguardando Peça',
  'em-reparo': 'Em Reparo',
  'pronto': 'Pronto',
  'entregue': 'Entregue'
}

const KANBAN_COLUMNS = [
  { key: 'na-fila', label: 'Na Fila', color: '#3B82F6', icon: Clock, bg: 'rgba(59, 130, 246, 0.1)' },
  { key: 'em-analise', label: 'Em Análise', color: '#FFAA00', icon: Search, bg: 'rgba(255, 170, 0, 0.1)' },
  { key: 'aguardando-peca', label: 'Aguardando Peça', color: '#FF4444', icon: AlertCircle, bg: 'rgba(255, 68, 68, 0.1)' },
  { key: 'em-reparo', label: 'Em Reparo', color: '#A855F7', icon: Wrench, bg: 'rgba(168, 85, 247, 0.1)' },
  { key: 'pronto', label: 'Prontos', color: '#25D366', icon: CheckCircle, bg: 'rgba(37, 211, 102, 0.1)' }
]

const NEXT_STATUS = {
  'na-fila': 'em-analise',
  'em-analise': 'em-reparo',
  'aguardando-peca': 'em-reparo',
  'em-reparo': 'pronto'
}

const PRIORITY_ORDER = { urgente: 1, alta: 2, normal: 3, baixa: 4 }

export default function Laboratorio() {
  const { ordensServico, setOrdensServico, clientes, estoque, setEstoque, addAtividade, addAlerta, setFinanceiro } = useData()
  const { user } = useAuth()

  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'grid'
  const [filterTab, setFilterTab] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedOSId, setDraggedOSId] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  const [selectedOS, setSelectedOS] = useState(null)
  const [pecaSelecionada, setPecaSelecionada] = useState('')
  const [qtdPeca, setQtdPeca] = useState(1)
  const [ifixitGuides, setIfixitGuides] = useState([])
  const [loadingIfixit, setLoadingIfixit] = useState(false)
  const [esquemaUrlInput, setEsquemaUrlInput] = useState('')
  const [valorInput, setValorInput] = useState('')

  const today = new Date().toISOString().split('T')[0]

  // KPIs
  const kpis = useMemo(() => ({
    naFila: ordensServico.filter(os => os.status === 'na-fila').length,
    emAndamento: ordensServico.filter(os => ['em-analise', 'em-reparo'].includes(os.status)).length,
    aguardando: ordensServico.filter(os => os.status === 'aguardando-peca').length,
    concluidasHoje: ordensServico.filter(os => os.status === 'pronto' && os.data_conclusao?.startsWith(today)).length
  }), [ordensServico, today])

  const getClientName = (id) => clientes.find(c => c.id === id)?.nome || 'Cliente Desconhecido'

  // Filtered OS by search query (ignoring delivered by default)
  const activeOS = useMemo(() => {
    return ordensServico
      .filter(os => os.status !== 'entregue')
      .filter(os => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        const clientName = getClientName(os.id_cliente).toLowerCase()
        const idMatch = `#${os.id}`.includes(term) || String(os.id).includes(term)
        const modelMatch = (os.modelo || '').toLowerCase().includes(term)
        const deviceMatch = (os.tipo_aparelho || '').toLowerCase().includes(term)
        const problemMatch = (os.problema || '').toLowerCase().includes(term)
        return idMatch || clientName.includes(term) || modelMatch || deviceMatch || problemMatch
      })
      .sort((a, b) => {
        const pd = (PRIORITY_ORDER[a.prioridade] || 99) - (PRIORITY_ORDER[b.prioridade] || 99)
        if (pd !== 0) return pd
        return new Date(a.data_entrada) - new Date(b.data_entrada)
      })
  }, [ordensServico, searchTerm, clientes])

  // Filtered for traditional Grid view
  const gridFilteredOS = useMemo(() => {
    if (filterTab === 'todos') return activeOS
    return activeOS.filter(os => os.status === filterTab)
  }, [activeOS, filterTab])

  // Fetch iFixit guides
  const fetchIfixit = async (modelo) => {
    if (!modelo) return
    setLoadingIfixit(true)
    try {
      const res = await fetch(`https://www.ifixit.com/api/2.0/search/${encodeURIComponent(modelo)}?langid=en`)
      if (!res.ok) throw new Error('Falha')
      const data = await res.json()
      setIfixitGuides(data.results?.slice(0, 5) || [])
    } catch {
      setIfixitGuides([])
    } finally {
      setLoadingIfixit(false)
    }
  }

  const modelNeedsHeat = useMemo(() => {
    if (!selectedOS || !selectedOS.modelo) return false
    return estoque.some(e => e.nome.toLowerCase().includes(selectedOS.modelo.toLowerCase()) && e.precisa_aquecer)
  }, [selectedOS, estoque])

  const checkNeedsHeatByModel = (modelo) => {
    if (!modelo) return false
    return estoque.some(e => e.nome.toLowerCase().includes(modelo.toLowerCase()) && e.precisa_aquecer)
  }

  const handleSetSeparadora = async (precisa) => {
    if (!selectedOS || !selectedOS.modelo) return
    const { error } = await supabase.from('estoque')
      .update({ precisa_aquecer: precisa })
      .ilike('nome', `%${selectedOS.modelo}%`)
    
    if (error) {
      if (addAlerta) addAlerta('Erro ao atualizar banco de dados', 'error')
      return
    }
    
    const updatedEstoque = estoque.map(e => {
      if (e.nome.toLowerCase().includes(selectedOS.modelo.toLowerCase())) {
        return { ...e, precisa_aquecer: precisa }
      }
      return e
    })
    setEstoque(updatedEstoque)
    if (addAlerta) addAlerta(`Configurado! ${selectedOS.modelo} usa separadora.`, 'success')
  }

  const handleOpenOS = (os) => {
    setSelectedOS(os)
    setEsquemaUrlInput(os.url_esquema || '')
    setValorInput(os.valor || '')
    fetchIfixit(os.modelo)
  }

  // Generalized status updater
  const handleUpdateStatus = async (newStatus, targetOS = selectedOS) => {
    if (!targetOS) return
    const updates = { status: newStatus }
    if (newStatus === 'pronto') {
      const now = new Date()
      updates.data_conclusao = now.toISOString()
      const g = new Date(now)
      g.setDate(g.getDate() + 90)
      updates.garantia_ate = g.toISOString().split('T')[0]
    }
    
    const { error } = await supabase.from('ordens_servico').update(updates).eq('id', targetOS.id)
    if (error) {
      if (addAlerta) addAlerta('Erro ao atualizar status no banco', 'error')
      return
    }

    const updated = { ...targetOS, ...updates }
    setOrdensServico(prev => prev.map(os => os.id === targetOS.id ? updated : os))
    if (selectedOS && selectedOS.id === targetOS.id) {
      setSelectedOS(updated)
    }
    if (addAtividade) addAtividade('Status Atualizado', `OS #${targetOS.id} → ${STATUS_LABELS[newStatus]}`, 'laboratorio')
    if (addAlerta) addAlerta(`OS #${targetOS.id} movida para ${STATUS_LABELS[newStatus]}`, 'success')
  }

  // Drag & Drop Handlers
  const handleDragStart = (e, osId) => {
    e.dataTransfer.setData('text/plain', osId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedOSId(osId)
  }

  const handleDragOver = (e, columnKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== columnKey) {
      setDragOverColumn(columnKey)
    }
  }

  const handleDragLeave = (e, columnKey) => {
    e.preventDefault()
    if (dragOverColumn === columnKey) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    const osId = e.dataTransfer.getData('text/plain') || draggedOSId
    setDraggedOSId(null)
    if (!osId) return

    const targetOS = ordensServico.find(os => os.id === Number(osId))
    if (!targetOS || targetOS.status === targetStatus) return

    await handleUpdateStatus(targetStatus, targetOS)
  }

  const handleAddPeca = async () => {
    if (!pecaSelecionada || !selectedOS) return
    const peca = estoque.find(e => e.id === Number(pecaSelecionada))
    const qtd = Number(qtdPeca)
    if (!peca || peca.quantidade < qtd) {
      if (addAlerta) addAlerta('Estoque insuficiente!', 'error')
      return
    }
    const pecasUsadas = [...(selectedOS.pecas_usadas || []), { id_item: peca.id, quantidade: qtd }]
    const updated = { ...selectedOS, pecas_usadas: pecasUsadas }

    // Update OS
    const { error: osError } = await supabase.from('ordens_servico').update({ pecas_usadas: pecasUsadas }).eq('id', selectedOS.id)
    if (osError) {
      if (addAlerta) addAlerta('Erro ao salvar peça na OS', 'error')
      return
    }

    // Update Estoque
    const novaQtd = peca.quantidade - qtd
    const { error: estError } = await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', peca.id)
    if (estError) {
      if (addAlerta) addAlerta('Erro ao dar baixa no estoque', 'error')
      return
    }

    setOrdensServico(prev => prev.map(os => os.id === selectedOS.id ? updated : os))
    setEstoque(prev => prev.map(item => item.id === peca.id ? { ...item, quantidade: novaQtd } : item))
    setSelectedOS(updated)
    if (addAtividade) addAtividade('Peça Adicionada', `${qtd}x ${peca.nome} na OS #${selectedOS.id}`, 'laboratorio')
    if (addAlerta) addAlerta(`${peca.nome} adicionada à OS e baixada do estoque`, 'success')
    setPecaSelecionada('')
    setQtdPeca(1)
  }

  const handleSaveEsquemaUrl = async () => {
    if (!selectedOS) return
    const { error } = await supabase.from('ordens_servico').update({ url_esquema: esquemaUrlInput }).eq('id', selectedOS.id)
    if (error) {
      if (addAlerta) addAlerta('Erro ao salvar URL do esquema.', 'error')
      return
    }
    const updated = { ...selectedOS, url_esquema: esquemaUrlInput }
    setOrdensServico(prev => prev.map(os => os.id === selectedOS.id ? updated : os))
    setSelectedOS(updated)
    if (addAlerta) addAlerta('Esquema elétrico salvo com sucesso!', 'success')
  }

  const handleSaveValor = async () => {
    if (!selectedOS) return
    const novoValor = parseFloat(valorInput)
    if (isNaN(novoValor)) {
      if (addAlerta) addAlerta('Valor inválido', 'warning')
      return
    }
    const { error } = await supabase.from('ordens_servico').update({ valor: novoValor }).eq('id', selectedOS.id)
    if (error) {
      if (addAlerta) addAlerta('Erro ao salvar valor', 'error')
      return
    }
    const updated = { ...selectedOS, valor: novoValor }
    setOrdensServico(prev => prev.map(os => os.id === selectedOS.id ? updated : os))
    setSelectedOS(updated)
    if (addAlerta) addAlerta('Valor salvo com sucesso!', 'success')
  }

  const handleDeleteOS = async () => {
    if (!window.confirm('Tem certeza que deseja APAGAR esta OS? Isso não pode ser desfeito!')) return
    
    const { error } = await supabase.from('ordens_servico').delete().eq('id', selectedOS.id)
    if (error) {
      if (addAlerta) addAlerta('Erro ao excluir OS.', 'error')
      return
    }
    
    setOrdensServico(prev => prev.filter(os => os.id !== selectedOS.id))
    setSelectedOS(null)
    if (addAtividade) addAtividade('OS Excluída', `OS #${selectedOS.id} excluída permanentemente`, 'laboratorio')
    if (addAlerta) addAlerta('OS apagada com sucesso.', 'success')
  }

  const handleDeliverAndPay = async () => {
    if (!selectedOS.valor) {
      if (addAlerta) addAlerta('Defina e salve o valor da OS antes de pagar e entregar!', 'warning')
      return
    }
    
    const { data: finData, error: finError } = await supabase.from('financeiro').insert([{
      tipo: 'entrada',
      categoria: 'servico',
      valor: selectedOS.valor,
      descricao: `Pagamento OS #${selectedOS.id} - ${selectedOS.modelo}`,
      id_cliente: selectedOS.id_cliente
    }]).select()

    if (finError) {
      if (addAlerta) addAlerta('Erro ao registrar no financeiro', 'error')
      return
    }

    if (finData && setFinanceiro) {
      setFinanceiro(prev => [finData[0], ...(prev || [])])
    }

    const now = new Date()
    const { error: osError } = await supabase.from('ordens_servico').update({ status: 'entregue', data_conclusao: now.toISOString() }).eq('id', selectedOS.id)
    if (osError) {
      if (addAlerta) addAlerta('Erro ao atualizar OS', 'error')
      return
    }

    const updated = { ...selectedOS, status: 'entregue', data_conclusao: now.toISOString() }
    setOrdensServico(prev => prev.map(os => os.id === selectedOS.id ? updated : os))
    setSelectedOS(updated)
    if (addAtividade) addAtividade('OS Entregue e Paga', `OS #${selectedOS.id} entregue (R$ ${selectedOS.valor})`, 'laboratorio')
    if (addAlerta) addAlerta('OS entregue e pagamento registrado com sucesso!', 'success')
  }

  const getPecaNome = (id_item) => estoque.find(e => e.id === id_item)?.nome || 'Peça removida'

  const handlePrint = () => {
    if (!selectedOS) return
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo OS #${selectedOS.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
            .content { margin-bottom: 20px; }
            .content p { margin: 5px 0; }
            .footer { border-top: 1px dashed #000; padding-top: 10px; text-align: justify; font-size: 11px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>CELL EXPRESS</h2>
            <p>Ordem de Servico / Termo de Garantia</p>
          </div>
          <div class="content">
            <p><strong>OS:</strong> #${selectedOS.id}</p>
            <p><strong>Cliente:</strong> ${getClientName(selectedOS.id_cliente)}</p>
            <p><strong>Aparelho:</strong> ${selectedOS.modelo}</p>
            <p><strong>Problema:</strong> ${selectedOS.problema}</p>
            <br/>
            <p><strong>Data da Conclusao:</strong> ${selectedOS.data_conclusao ? new Date(selectedOS.data_conclusao).toLocaleDateString('pt-BR') : '-'}</p>
            <p><strong>Garantia Valida Ate:</strong> ${selectedOS.garantia_ate ? new Date(selectedOS.garantia_ate).toLocaleDateString('pt-BR') : 'N/A'}</p>
            <br/>
            ${selectedOS.valor ? `<p style="font-size: 16px;"><strong>Valor Total: R$ ${selectedOS.valor.toFixed(2)}</strong></p>` : ''}
          </div>
          <div class="footer">
            <p><strong>TERMO DE GARANTIA (90 DIAS)</strong></p>
            <p>A garantia cobre estritamente as pecas substituidas e a mao de obra aplicada no reparo supracitado.</p>
            <p>Esta garantia sera IMEDIATAMENTE ANULADA caso o aparelho apresente:</p>
            <p>- Sinais de queda, trincos, amassados ou QUALQUER TIPO DE MAU USO.</p>
            <p>- Contato com liquidos, umidade ou oxidacao.</p>
            <p>- Rompimento dos selos de garantia ou tentativa de conserto por terceiros.</p>
            <p>A garantia NÃO COBRE defeitos decorrentes de mau uso por parte do usuario.</p>
            <br/>
            <p style="text-align: center;">Assinatura do Cliente:</p>
            <br/><br/>
            <p style="border-top: 1px solid #000; margin: 0 20px;"></p>
            <br/>
            <p style="text-align: center;">Obrigado pela preferencia!</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const tabs = [
    { key: 'todos', label: 'Todos' },
    { key: 'na-fila', label: 'Na Fila' },
    { key: 'em-analise', label: 'Em Análise' },
    { key: 'aguardando-peca', label: 'Aguardando Peça' },
    { key: 'em-reparo', label: 'Em Reparo' },
    { key: 'pronto', label: 'Prontos' },
  ]

  // Render a Single Kanban Card
  const renderOSCard = (os) => {
    const isHeating = checkNeedsHeatByModel(os.modelo)
    const priorityColor = os.prioridade === 'urgente' 
      ? 'var(--danger, #FF4444)' 
      : os.prioridade === 'alta' 
      ? 'var(--warning, #FFAA00)' 
      : os.prioridade === 'normal' 
      ? 'var(--info, #3B82F6)' 
      : 'var(--border, #444)'

    return (
      <div
        key={os.id}
        draggable
        className="kanban-card"
        onDragStart={(e) => handleDragStart(e, os.id)}
        onClick={() => handleOpenOS(os)}
        style={{
          borderLeft: `4px solid ${priorityColor}`
        }}
      >
        {/* Card Header: ID, Priority, Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary, #fff)' }}>
            OS #{os.id}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`priority-badge ${os.prioridade}`} style={{ fontSize: '10px', padding: '2px 6px', textTransform: 'uppercase' }}>
              {os.prioridade}
            </span>
          </div>
        </div>

        {/* Customer & Device */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-yellow, #FFD700)' }}>
            {getClientName(os.id_cliente)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #A0A0A0)' }}>
            {os.tipo_aparelho} • <strong>{os.modelo}</strong>
          </div>
        </div>

        {/* Problem preview */}
        <div style={{ 
          fontSize: '0.78rem', 
          color: 'var(--text-muted, #888)', 
          marginBottom: '10px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: '1.3'
        }}>
          {os.problema || 'Nenhum detalhe informado.'}
        </div>

        {/* Badges and Quick Next Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderTop: '1px solid rgba(255,255,255,0.06)', 
          paddingTop: '8px',
          fontSize: '0.75rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {os.valor ? (
              <span style={{ color: 'var(--success, #25D366)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <DollarSign size={12} /> R$ {os.valor.toFixed(2)}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted, #666)' }}>Sem valor</span>
            )}
            {isHeating && (
              <span title="Requer Separadora Térmica" style={{ color: 'var(--danger, #FF4444)', display: 'flex', alignItems: 'center' }}>
                <Flame size={13} />
              </span>
            )}
            {os.pecas_usadas?.length > 0 && (
              <span title={`${os.pecas_usadas.length} peças vinculadas`} style={{ color: 'var(--info, #3B82F6)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Package size={12} /> {os.pecas_usadas.length}
              </span>
            )}
          </div>

          {/* Advance button */}
          {NEXT_STATUS[os.status] && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleUpdateStatus(NEXT_STATUS[os.status], os)
              }}
              title={`Avançar para ${STATUS_LABELS[NEXT_STATUS[os.status]]}`}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary, #fff)',
                borderRadius: '4px',
                padding: '3px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px'
              }}
            >
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Clock size={20} /></div>
          <div className="kpi-label">Na Fila</div>
          <div className="kpi-value">{kpis.naFila}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><Wrench size={20} /></div>
          <div className="kpi-label">Em Andamento</div>
          <div className="kpi-value">{kpis.emAndamento}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red"><AlertCircle size={20} /></div>
          <div className="kpi-label">Aguardando Peça</div>
          <div className="kpi-value">{kpis.aguardando}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><CheckCircle size={20} /></div>
          <div className="kpi-label">Concluídas Hoje</div>
          <div className="kpi-value">{kpis.concluidasHoje}</div>
        </div>
      </div>

      {/* Control Bar: Search & View Switch */}
      <div className="card" style={{ marginTop: '24px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
          <Search size={18} color="var(--text-secondary, #A0A0A0)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por OS, cliente, modelo ou problema..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%', backgroundColor: 'var(--bg-primary, #0a0a0a)' }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View mode toggle button */}
        <div style={{ display: 'flex', background: 'var(--bg-primary, #0a0a0a)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border, #2a2a2a)' }}>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === 'kanban' ? 'var(--accent-yellow, #FFD700)' : 'transparent',
              color: viewMode === 'kanban' ? '#000' : 'var(--text-secondary, #A0A0A0)',
              fontWeight: viewMode === 'kanban' ? '700' : '500',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 150ms ease'
            }}
          >
            <Kanban size={16} /> Kanban
          </button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === 'grid' ? 'var(--accent-yellow, #FFD700)' : 'transparent',
              color: viewMode === 'grid' ? '#000' : 'var(--text-secondary, #A0A0A0)',
              fontWeight: viewMode === 'grid' ? '700' : '500',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 150ms ease'
            }}
          >
            <LayoutGrid size={16} /> Grade
          </button>
        </div>
      </div>

      {/* Main Content: Kanban or Grid */}
      {viewMode === 'kanban' ? (
        <div className="kanban-board-container">
          {KANBAN_COLUMNS.map(col => {
            const colItems = activeOS.filter(os => os.status === col.key)
            const isOver = dragOverColumn === col.key
            const Icon = col.icon

            return (
              <div
                key={col.key}
                className={`kanban-column ${isOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={(e) => handleDragLeave(e, col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column Header */}
                <div className="kanban-column-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '6px', 
                      backgroundColor: col.bg, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: col.color 
                    }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary, #fff)' }}>
                      {col.label}
                    </span>
                  </div>
                  <span style={{ 
                    backgroundColor: 'rgba(255,255,255,0.08)', 
                    color: 'var(--text-primary, #fff)', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: '700' 
                  }}>
                    {colItems.length}
                  </span>
                </div>

                {/* Column Body / Drop Zone */}
                <div className="kanban-column-body">
                  {colItems.map(os => renderOSCard(os))}

                  {colItems.length === 0 && (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'var(--text-muted, #555)', 
                      fontSize: '0.8rem',
                      padding: '30px 10px',
                      textAlign: 'center',
                      border: '1px dashed rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      margin: '6px 0'
                    }}>
                      <span>Arraste uma OS aqui</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Traditional Filtered Grid View */
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="tabs">
            {tabs.map(t => (
              <button key={t.key} className={`tab ${filterTab === t.key ? 'active' : ''}`} onClick={() => setFilterTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {gridFilteredOS.map(os => (
              <div key={os.id} className="card" onClick={() => handleOpenOS(os)}
                style={{ cursor: 'pointer', borderLeft: `3px solid ${os.prioridade === 'urgente' ? 'var(--danger)' : os.prioridade === 'alta' ? 'var(--warning)' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>OS #{os.id}</span>
                  <span className={`status-badge ${os.status}`}>{STATUS_LABELS[os.status]}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Cliente</span>
                  <div style={{ fontWeight: '600' }}>{getClientName(os.id_cliente)}</div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Aparelho</span>
                  <div>{os.tipo_aparelho} — {os.modelo}</div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Problema</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{os.problema}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <span className={`priority-badge ${os.prioridade}`}>{os.prioridade}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(os.data_entrada).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
            {gridFilteredOS.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-icon"><Search size={28} /></div>
                <h4>Nenhuma OS encontrada</h4>
                <p>Não há ordens de serviço com o filtro selecionado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OS Detail Modal */}
      {selectedOS && (
        <div className="modal-overlay" onClick={() => setSelectedOS(null)}>
          <div className="modal" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>OS #{selectedOS.id} — {selectedOS.modelo}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(selectedOS.status === 'pronto' || selectedOS.status === 'entregue') && (
                  <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={handlePrint}>
                    <Printer size={14} /> Imprimir Recibo
                  </button>
                )}
                <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'var(--danger)', color: '#fff', border: 'none' }} onClick={handleDeleteOS}>
                  <Trash2 size={14} /> Apagar OS
                </button>
                <button className="btn-icon" onClick={() => setSelectedOS(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body">
              {/* Info Grid */}
              <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div>
                  <div className="form-group">
                    <label>Cliente</label>
                    <div style={{ fontWeight: '600' }}>{getClientName(selectedOS.id_cliente)}</div>
                  </div>
                  <div className="form-group">
                    <label>Aparelho</label>
                    <div>{selectedOS.tipo_aparelho} — {selectedOS.modelo}</div>
                  </div>
                  <div className="form-group">
                    <label>Condição / Avarias</label>
                    {selectedOS.condicao && selectedOS.condicao.startsWith('[') ? (
                       <DamageMap readOnly={true} markers={JSON.parse(selectedOS.condicao)} />
                    ) : (
                       <div style={{ color: 'var(--text-secondary)' }}>{selectedOS.condicao || 'Nenhuma condição informada'}</div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Observações</label>
                    <div>{selectedOS.problema}</div>
                  </div>
                </div>
                <div>
                  <div className="form-group">
                    <label>Status Atual</label>
                    <span className={`status-badge ${selectedOS.status}`}>{STATUS_LABELS[selectedOS.status]}</span>
                  </div>
                  <div className="form-group">
                    <label>Prioridade</label>
                    <span className={`priority-badge ${selectedOS.prioridade}`}>{selectedOS.prioridade}</span>
                  </div>
                  <div className="form-group">
                    <label>Data de Entrada</label>
                    <div>{new Date(selectedOS.data_entrada).toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="form-group">
                    <label>Valor da OS</label>
                    {selectedOS.status !== 'entregue' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="R$ 0.00" 
                          value={valorInput} 
                          onChange={e => setValorInput(e.target.value)} 
                          style={{ flex: 1, padding: '8px' }} 
                        />
                        <button className="btn btn-secondary" onClick={handleSaveValor}>Salvar</button>
                      </div>
                    ) : (
                       <div style={{ fontWeight: '700', color: 'var(--accent-yellow)' }}>R$ {selectedOS.valor?.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Separadora Info */}
              <div style={{ marginBottom: '24px', padding: '15px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame size={18} color="var(--danger, #FF4444)" /> Aparelho usa Separadora?
                </h4>
                {modelNeedsHeat ? (
                  <p style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Sim, este aparelho desmonta com calor!</p>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>Se este aparelho precisa de separadora, confirme abaixo para salvar no sistema:</p>
                    <button className="btn btn-secondary" onClick={() => handleSetSeparadora(true)} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                      <Flame size={14} style={{ marginRight: '6px' }} /> Sim, precisa de separadora
                    </button>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              {selectedOS.status !== 'pronto' && selectedOS.status !== 'entregue' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Atualizar Status</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {NEXT_STATUS[selectedOS.status] && (
                      <button className="btn btn-primary" onClick={() => handleUpdateStatus(NEXT_STATUS[selectedOS.status])}>
                        <Play size={14} /> Avançar para: {STATUS_LABELS[NEXT_STATUS[selectedOS.status]]}
                      </button>
                    )}
                    {selectedOS.status !== 'aguardando-peca' && (
                      <button className="btn btn-danger" onClick={() => handleUpdateStatus('aguardando-peca')}>
                        <Pause size={14} /> Aguardando Peça
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedOS.status === 'pronto' && (
                <div style={{ marginBottom: '24px' }}>
                  <button className="btn btn-primary" onClick={handleDeliverAndPay} style={{ backgroundColor: 'var(--success)', color: '#000', fontWeight: 'bold', width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} /> Pagar e Entregar OS
                  </button>
                </div>
              )}

              {/* Peças Usadas */}
              <div style={{ marginBottom: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h4 style={{ marginBottom: '12px' }}>Peças Usadas</h4>
                {selectedOS.pecas_usadas?.length > 0 ? (
                  <div style={{ marginBottom: '12px' }}>
                    {selectedOS.pecas_usadas.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', marginBottom: '4px' }}>
                        <span>{getPecaNome(p.id_item)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>x{p.quantidade}</span>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.85rem' }}>Nenhuma peça adicionada.</p>}

                {selectedOS.status !== 'pronto' && selectedOS.status !== 'entregue' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select className="form-select" value={pecaSelecionada} onChange={e => setPecaSelecionada(e.target.value)} style={{ flex: 1, minWidth: '200px' }}>
                      <option value="">Selecionar peça...</option>
                      {estoque.filter(e => e.categoria === 'peca' && e.quantidade > 0).map(e => (
                        <option key={e.id} value={e.id}>{e.nome} (Estoque: {e.quantidade})</option>
                      ))}
                    </select>
                    <input type="number" className="form-input" min="1" value={qtdPeca} onChange={e => setQtdPeca(e.target.value)} style={{ width: '80px' }} />
                    <button className="btn btn-secondary" onClick={handleAddPeca} disabled={!pecaSelecionada}><Plus size={14} /> Adicionar</button>
                  </div>
                )}
              </div>

              {/* iFixit Guides */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings size={18} /> Guias iFixit — {selectedOS.modelo}
                </h4>
                {loadingIfixit ? (
                  <p style={{ color: 'var(--text-muted)' }}>Buscando guias de reparo...</p>
                ) : ifixitGuides.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ifixitGuides.map((guide, i) => (
                      <a key={i} href={guide.url} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'var(--text-primary)', transition: 'background 150ms' }}>
                        {guide.image?.thumbnail && <img src={guide.image.thumbnail} alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} />}
                        <span style={{ flex: 1, fontSize: '0.85rem' }}>{guide.title}</span>
                        <ExternalLink size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum guia encontrado para "{selectedOS.modelo}".</p>
                )}
              </div>
              
              {/* Esquemas Elétricos e Placa */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px' }}>
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={18} /> Esquemas Elétricos & Boardview
                </h4>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(selectedOS.modelo + ' schematic pdf boardview')}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                    <Search size={14} style={{ marginRight: '6px' }} /> Buscar no Google
                  </a>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedOS.modelo + ' motherboard repair boardview')}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', backgroundColor: 'rgba(255, 0, 0, 0.1)', color: '#ff4444', borderColor: '#ff4444' }}>
                    <Play size={14} style={{ marginRight: '6px' }} /> Buscar no YouTube
                  </a>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Link do Esquema Elétrico (PDF / Drive / Borneo Web)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="Cole aqui o link do esquema elétrico que você encontrou..." 
                      value={esquemaUrlInput} 
                      onChange={e => setEsquemaUrlInput(e.target.value)} 
                      style={{ flex: 1 }} 
                    />
                    <button className="btn btn-primary" onClick={handleSaveEsquemaUrl}>Salvar Link</button>
                  </div>
                  {selectedOS.url_esquema && (
                    <a href={selectedOS.url_esquema} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.85rem', color: 'var(--info)' }}>
                      <ExternalLink size={14} /> Abrir esquema elétrico salvo
                    </a>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
