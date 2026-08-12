import { useState, useMemo, useEffect } from 'react'
import { useData, useAuth } from '../App'
import { supabase } from '../supabaseClient'
import {
  Wrench, AlertCircle, Clock, CheckCircle, Search,
  Settings, ExternalLink, Plus, X, Play, Pause, ChevronRight, Printer
} from 'lucide-react'

const STATUS_LABELS = {
  'na-fila': 'Na Fila',
  'em-analise': 'Em Análise',
  'aguardando-peca': 'Aguardando Peça',
  'em-reparo': 'Em Reparo',
  'pronto': 'Pronto',
  'entregue': 'Entregue'
}

const NEXT_STATUS = {
  'na-fila': 'em-analise',
  'em-analise': 'em-reparo',
  'aguardando-peca': 'em-reparo',
  'em-reparo': 'pronto'
}

const PRIORITY_ORDER = { urgente: 1, alta: 2, normal: 3, baixa: 4 }

export default function Laboratorio() {
  const { ordensServico, setOrdensServico, clientes, estoque, setEstoque, addAtividade, addAlerta } = useData()
  const { user } = useAuth()

  const [filterTab, setFilterTab] = useState('todos')
  const [selectedOS, setSelectedOS] = useState(null)
  const [pecaSelecionada, setPecaSelecionada] = useState('')
  const [qtdPeca, setQtdPeca] = useState(1)
  const [ifixitGuides, setIfixitGuides] = useState([])
  const [loadingIfixit, setLoadingIfixit] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // KPIs
  const kpis = useMemo(() => ({
    naFila: ordensServico.filter(os => os.status === 'na-fila').length,
    emAndamento: ordensServico.filter(os => ['em-analise', 'em-reparo'].includes(os.status)).length,
    aguardando: ordensServico.filter(os => os.status === 'aguardando-peca').length,
    concluidasHoje: ordensServico.filter(os => os.status === 'pronto' && os.data_conclusao?.startsWith(today)).length
  }), [ordensServico, today])

  // Filtered + Sorted OS
  const filteredOS = useMemo(() => {
    let list = ordensServico.filter(os => os.status !== 'entregue')
    if (filterTab !== 'todos') list = list.filter(os => os.status === filterTab)
    return list.sort((a, b) => {
      const pd = (PRIORITY_ORDER[a.prioridade] || 99) - (PRIORITY_ORDER[b.prioridade] || 99)
      if (pd !== 0) return pd
      return new Date(a.data_entrada) - new Date(b.data_entrada)
    })
  }, [ordensServico, filterTab])

  const getClientName = (id) => clientes.find(c => c.id === id)?.nome || 'Desconhecido'

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

  const handleOpenOS = (os) => {
    setSelectedOS(os)
    fetchIfixit(os.modelo)
  }

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOS) return
    const updates = { status: newStatus }
    if (newStatus === 'pronto') {
      const now = new Date()
      updates.data_conclusao = now.toISOString()
      const g = new Date(now)
      g.setDate(g.getDate() + 90)
      updates.garantia_ate = g.toISOString().split('T')[0]
    }
    
    const { error } = await supabase.from('ordens_servico').update(updates).eq('id', selectedOS.id)
    if (error) {
      if(addAlerta) addAlerta('Erro ao atualizar status no banco', 'error')
      return
    }

    const updated = { ...selectedOS, ...updates }
    setOrdensServico(prev => prev.map(os => os.id === selectedOS.id ? updated : os))
    setSelectedOS(updated)
    if(addAtividade) addAtividade('Status Atualizado', `OS #${selectedOS.id} → ${STATUS_LABELS[newStatus]}`, 'laboratorio')
    if(addAlerta) addAlerta(`OS #${selectedOS.id} atualizada para ${STATUS_LABELS[newStatus]}`, 'success')
  }

  const handleAddPeca = async () => {
    if (!pecaSelecionada || !selectedOS) return
    const peca = estoque.find(e => e.id === Number(pecaSelecionada))
    const qtd = Number(qtdPeca)
    if (!peca || peca.quantidade < qtd) {
      if(addAlerta) addAlerta('Estoque insuficiente!', 'error')
      return
    }
    const pecasUsadas = [...(selectedOS.pecas_usadas || []), { id_item: peca.id, quantidade: qtd }]
    const updated = { ...selectedOS, pecas_usadas: pecasUsadas }

    // Update OS
    const { error: osError } = await supabase.from('ordens_servico').update({ pecas_usadas: pecasUsadas }).eq('id', selectedOS.id)
    if (osError) {
      if(addAlerta) addAlerta('Erro ao salvar peça na OS', 'error')
      return
    }

    // Update Estoque
    const novaQtd = peca.quantidade - qtd
    const { error: estError } = await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', peca.id)
    if (estError) {
      if(addAlerta) addAlerta('Erro ao dar baixa no estoque', 'error')
      return
    }

    setOrdensServico(prev => prev.map(os => os.id === selectedOS.id ? updated : os))
    setEstoque(prev => prev.map(item => item.id === peca.id ? { ...item, quantidade: novaQtd } : item))
    setSelectedOS(updated)
    if(addAtividade) addAtividade('Peça Adicionada', `${qtd}x ${peca.nome} na OS #${selectedOS.id}`, 'laboratorio')
    if(addAlerta) addAlerta(`${peca.nome} adicionada à OS e baixada do estoque`, 'success')
    setPecaSelecionada('')
    setQtdPeca(1)
  }

  const getPecaNome = (id_item) => estoque.find(e => e.id === id_item)?.nome || 'Peça removida'

  const handlePrint = () => {
    if (!selectedOS) return;
    const printWindow = window.open('', '_blank');
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
    `);
    printWindow.document.close();
  }

  const tabs = [
    { key: 'todos', label: 'Todos' },
    { key: 'na-fila', label: 'Na Fila' },
    { key: 'em-analise', label: 'Em Análise' },
    { key: 'aguardando-peca', label: 'Aguardando Peça' },
    { key: 'em-reparo', label: 'Em Reparo' },
    { key: 'pronto', label: 'Prontos' },
  ]

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

      {/* Filter Tabs */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.key} className={`tab ${filterTab === t.key ? 'active' : ''}`} onClick={() => setFilterTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OS Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredOS.map(os => (
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
          {filteredOS.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-icon"><Search size={28} /></div>
              <h4>Nenhuma OS encontrada</h4>
              <p>Não há ordens de serviço com o filtro selecionado.</p>
            </div>
          )}
        </div>
      </div>

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
                    <label>Condição</label>
                    <div style={{ color: 'var(--text-secondary)' }}>{selectedOS.condicao}</div>
                  </div>
                  <div className="form-group">
                    <label>Problema Relatado</label>
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
                  {selectedOS.valor && (
                    <div className="form-group">
                      <label>Valor</label>
                      <div style={{ fontWeight: '700', color: 'var(--accent-yellow)' }}>R$ {selectedOS.valor?.toFixed(2)}</div>
                    </div>
                  )}
                </div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
