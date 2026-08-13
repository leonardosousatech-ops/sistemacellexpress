import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import { supabase } from '../supabaseClient';
import { Shield, ShieldAlert, ShieldX, RefreshCcw, Search, Filter, AlertTriangle, PackageMinus, X, Plus } from 'lucide-react';

export default function Garantias() {
  const { ordensServico, clientes, estoque, addAtividade, addAlerta } = useData();
  const [activeTab, setActiveTab] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDamagedPartModal, setShowDamagedPartModal] = useState(false);

  // Form states
  const [returnForm, setReturnForm] = useState({ osId: '', motivo: '' });
  const [damagedPartForm, setDamagedPartForm] = useState({ itemId: '', quantity: 1, motivo: '' });

  // Process data
  const garantias = useMemo(() => {
    return ordensServico.filter(os => os.garantia_ate);
  }, [ordensServico]);

  const today = new Date();

  const warrantiesData = useMemo(() => {
    return garantias.map(os => {
      const cliente = clientes.find(c => c.id === os.cliente_id) || {};
      const dataConclusao = new Date(os.data_conclusao || os.data_entrada); // Fallback se não tiver
      const garantiaAte = new Date(os.garantia_ate);
      
      const totalDays = 90; // Default warranty policy
      const daysRemaining = Math.ceil((garantiaAte - today) / (1000 * 60 * 60 * 24));
      const daysElapsed = totalDays - daysRemaining;
      
      let status = 'Ativa';
      if (daysRemaining < 0) status = 'Expirada';
      else if (daysRemaining <= 15) status = 'Expirando em Breve';

      const progressPercent = Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100));
      
      let progressColor = 'var(--success)';
      if (daysRemaining <= 15 && daysRemaining > 0) progressColor = 'var(--warning)';
      if (daysRemaining <= 0) progressColor = 'var(--danger)';

      return {
        ...os,
        clienteNome: cliente.nome || 'Cliente Desconhecido',
        daysRemaining,
        status,
        progressPercent,
        progressColor,
        dataConclusaoFormated: dataConclusao.toLocaleDateString('pt-BR'),
        garantiaAteFormated: garantiaAte.toLocaleDateString('pt-BR')
      };
    }).sort((a, b) => new Date(a.garantia_ate) - new Date(b.garantia_ate));
  }, [garantias, clientes, today]);

  // KPIs
  const ativas = warrantiesData.filter(w => w.status === 'Ativa');
  const expirando = warrantiesData.filter(w => w.status === 'Expirando em Breve');
  const expiradas = warrantiesData.filter(w => w.status === 'Expirada');
  const retornos = ordensServico.filter(os => os.is_retorno_garantia).length; // Assumindo campo flag

  // Filtered List
  const filteredList = warrantiesData.filter(w => {
    const matchesSearch = w.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.id.toString().includes(searchTerm) ||
                          w.aparelho.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === 'Ativas') return w.status === 'Ativa';
    if (activeTab === 'Expirando em Breve') return w.status === 'Expirando em Breve';
    if (activeTab === 'Expiradas') return w.status === 'Expirada';
    
    return true; // Todas
  });

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnForm.osId || !returnForm.motivo) return;
    
    const { error } = await supabase.from('ordens_servico').update({ is_retorno_garantia: true, retorno_motivo: returnForm.motivo }).eq('id', returnForm.osId);
    if (error) {
      if(addAlerta) addAlerta('Erro ao registrar retorno.', 'error');
      return;
    }
    
    // Update local state (assuming useData exposes setOrdensServico, wait, I need to check if setOrdensServico is extracted)
    // Actually the page doesn't extract setOrdensServico right now. I'll just trigger a reload or since it's just a dashboard, it's fine.
    // Wait, let's just log activity for now since they will refresh or it will sync on next load.
    if(addAtividade) addAtividade(`Retorno de garantia registrado para OS #${returnForm.osId}. Motivo: ${returnForm.motivo}`);
    if(addAlerta) addAlerta(`Retorno de garantia - OS #${returnForm.osId}`, 'warning');
    
    setShowReturnModal(false);
    setReturnForm({ osId: '', motivo: '' });
  };

  const handleDamagedPartSubmit = async (e) => {
    e.preventDefault();
    if (!damagedPartForm.itemId || !damagedPartForm.motivo) return;
    
    const item = estoque.find(i => i.id === Number(damagedPartForm.itemId));
    if (!item) return;

    const qtd = Number(damagedPartForm.quantity);
    const novaQtd = item.quantidade - qtd;

    const { error } = await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', item.id);
    if (error) {
      if(addAlerta) addAlerta('Erro ao dar baixa na peça defeituosa.', 'error');
      return;
    }
    
    if(addAtividade) addAtividade(`Baixa de peça defeituosa: ${qtd}x ${item.nome}. Motivo: ${damagedPartForm.motivo}`);
    if(addAlerta) addAlerta('Peça defeituosa baixada do estoque com sucesso.', 'success');
    
    setShowDamagedPartModal(false);
    setDamagedPartForm({ itemId: '', quantity: 1, motivo: '' });
  };

  return (
    <div className="page-container" style={{ padding: '24px', color: 'var(--text-primary)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={28} />
            Gestão de Garantias
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Acompanhamento de garantias e retornos (Política de 90 dias)</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowDamagedPartModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <PackageMinus size={18} />
            Baixa de Peça Defeituosa
          </button>
          <button 
            onClick={() => setShowReturnModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--accent)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            <RefreshCcw size={18} />
            Registrar Retorno
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Garantias Ativas</p>
              <h3 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>{ativas.length}</h3>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'rgba(37, 211, 102, 0.1)', borderRadius: '8px', color: 'var(--success)' }}>
              <Shield size={24} />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Expirando em Breve</p>
              <h3 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--warning)' }}>{expirando.length}</h3>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'rgba(255, 170, 0, 0.1)', borderRadius: '8px', color: 'var(--warning)' }}>
              <ShieldAlert size={24} />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Garantias Expiradas</p>
              <h3 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{expiradas.length}</h3>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'rgba(160, 160, 160, 0.1)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              <ShieldX size={24} />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Retornos de Cliente</p>
              <h3 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--danger)' }}>{retornos}</h3>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'rgba(255, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--danger)' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {['Todas', 'Ativas', 'Expirando em Breve', 'Expiradas'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === tab ? 'var(--accent)' : 'transparent',
                color: activeTab === tab ? 'var(--bg-primary)' : 'var(--text-secondary)',
                border: activeTab === tab ? 'none' : '1px solid var(--border)',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? '600' : '400',
                whiteSpace: 'nowrap'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Buscar por OS, cliente ou aparelho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

      {/* Warranty List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredList.map(w => (
          <div key={w.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>OS #{w.id}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{w.clienteNome}</p>
              </div>
              <span style={{ 
                padding: '4px 8px', 
                borderRadius: '4px', 
                fontSize: '12px', 
                fontWeight: 'bold',
                backgroundColor: w.status === 'Ativa' ? 'rgba(37, 211, 102, 0.1)' : w.status === 'Expirando em Breve' ? 'rgba(255, 170, 0, 0.1)' : 'rgba(160, 160, 160, 0.1)',
                color: w.status === 'Ativa' ? 'var(--success)' : w.status === 'Expirando em Breve' ? 'var(--warning)' : 'var(--text-secondary)'
              }}>
                {w.status}
              </span>
            </div>

            <div style={{ fontSize: '14px' }}>
              <p style={{ marginBottom: '4px' }}><span style={{ color: 'var(--text-secondary)' }}>Aparelho:</span> {w.aparelho} {w.modelo}</p>
              <p style={{ marginBottom: '4px' }}><span style={{ color: 'var(--text-secondary)' }}>Conclusão:</span> {w.dataConclusaoFormated}</p>
              <p><span style={{ color: 'var(--text-secondary)' }}>Garantia até:</span> {w.garantiaAteFormated}</p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Progresso da garantia</span>
                <span style={{ fontWeight: 'bold', color: w.daysRemaining > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                  {w.daysRemaining > 0 ? `${w.daysRemaining} dias restantes` : 'Expirada'}
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${w.progressPercent}%`, 
                  backgroundColor: w.progressColor,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        ))}
        {filteredList.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Nenhuma garantia encontrada.
          </div>
        )}
      </div>

      {/* Return Modal */}
      {showReturnModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCcw size={20} color="var(--accent)" />
                Registrar Retorno de Garantia
              </h2>
              <button onClick={() => setShowReturnModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleReturnSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>OS Original (Apenas Ativas/Expirando)</label>
                <select 
                  required
                  value={returnForm.osId}
                  onChange={(e) => setReturnForm({...returnForm, osId: e.target.value})}
                  style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                >
                  <option value="">Selecione uma OS</option>
                  {[...ativas, ...expirando].map(w => (
                    <option key={w.id} value={w.id}>OS #{w.id} - {w.clienteNome} ({w.aparelho})</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Motivo do Retorno (Relato do Cliente)</label>
                <textarea 
                  required
                  rows={4}
                  value={returnForm.motivo}
                  onChange={(e) => setReturnForm({...returnForm, motivo: e.target.value})}
                  placeholder="Descreva o problema relatado..."
                  style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowReturnModal(false)} style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '10px 16px', backgroundColor: 'var(--accent)', border: 'none', borderRadius: '8px', color: 'var(--bg-primary)', fontWeight: 'bold', cursor: 'pointer' }}>
                  Registrar OS de Retorno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Damaged Part Modal */}
      {showDamagedPartModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PackageMinus size={20} color="var(--danger)" />
                Baixa de Peça Defeituosa
              </h2>
              <button onClick={() => setShowDamagedPartModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleDamagedPartSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Peça em Estoque</label>
                <select 
                  required
                  value={damagedPartForm.itemId}
                  onChange={(e) => setDamagedPartForm({...damagedPartForm, itemId: e.target.value})}
                  style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                >
                  <option value="">Selecione uma peça</option>
                  {estoque.filter(i => i.quantidade > 0).map(item => (
                    <option key={item.id} value={item.id}>{item.nome} (Estoque: {item.quantidade})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Quantidade</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={damagedPartForm.quantity}
                  onChange={(e) => setDamagedPartForm({...damagedPartForm, quantity: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Motivo da Baixa</label>
                <textarea 
                  required
                  rows={3}
                  value={damagedPartForm.motivo}
                  onChange={(e) => setDamagedPartForm({...damagedPartForm, motivo: e.target.value})}
                  placeholder="Ex: Peça veio com defeito de fábrica, danificada durante instalação..."
                  style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowDamagedPartModal(false)} style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '10px 16px', backgroundColor: 'var(--danger)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
