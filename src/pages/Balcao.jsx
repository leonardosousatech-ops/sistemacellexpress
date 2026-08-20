import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, useAuth } from '../App';
import { supabase } from '../supabaseClient'
import DamageMap from '../components/DamageMap';
import { 
  Users, 
  Wrench, 
  CheckCircle, 
  ShoppingCart, 
  Plus, 
  Search, 
  AlertTriangle,
  X,
  FileText,
  Smartphone,
  Bot,
  Trash2,
  PlusCircle
} from 'lucide-react';

export default function Balcao() {
  const navigate = useNavigate();
  const { 
    clientes, 
    setClientes, 
    ordensServico, 
    setOrdensServico, 
    estoque,
    setEstoque,
    setFinanceiro,
    addAtividade, 
    addAlerta 
  } = useData();
  
  // const { user } = useAuth(); // If needed for context

  // Modals state
  const [isOsModalOpen, setIsOsModalOpen] = useState(false);
  const [damageMarkers, setDamageMarkers] = useState([]);
  const [isClientListModalOpen, setIsClientListModalOpen] = useState(false);
  const [viewOsData, setViewOsData] = useState(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Sales state
  const [cart, setCart] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // Form states
  const [osForm, setOsForm] = useState({
    clienteId: '',
    tipoAparelho: 'Celular',
    modelo: '',
    condicao: '',
    problema: '',
    prioridade: 'Normal',
    isChatbot: false
  });

  const [clientForm, setClientForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    cep: '',
    endereco: ''
  });

  
  const handleDeleteClient = async (id) => {
    if (!window.confirm('Tem certeza que deseja apagar este cliente? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) {
      if(addAlerta) addAlerta('Erro ao apagar cliente no banco de dados', 'error');
      return;
    }
    setClientes(prev => prev.filter(c => c.id !== id));
    if(addAlerta) addAlerta('Cliente apagado com sucesso', 'success');
  };

  const handleViewOS = (os) => {
    setViewOsData(os);
  };

  const handleDeleteOS = async (id) => {
    if (!window.confirm('Tem certeza que deseja APAGAR esta OS? Isso não pode ser desfeito!')) return;
    const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
    if (error) {
      if(addAlerta) addAlerta('Erro ao excluir OS no banco', 'error');
      return;
    }
    setOrdensServico(prev => prev.filter(os => os.id !== id));
    setViewOsData(null);
    if(addAlerta) addAlerta('OS apagada com sucesso.', 'success');
  };

  const handleCepChange = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    setClientForm({ ...clientForm, cep: e.target.value });
    
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setClientForm(prev => ({
            ...prev,
            cep: e.target.value,
            endereco: `${data.logradouro},  - ${data.bairro}, ${data.localidade} - ${data.uf}`
          }));
        } else {
          if(addAlerta) addAlerta('CEP não encontrado', 'warning');
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  // Derived data
  const osAtivas = ordensServico ? ordensServico.filter(os => !['concluido', 'cancelado'].includes(os.status.toLowerCase())) : [];
  const osProntas = ordensServico ? ordensServico.filter(os => os.status.toLowerCase() === 'pronto') : [];
  const vendasDia = 0; // Placeholder for actual sales data

  const filteredOS = useMemo(() => {
    if (!ordensServico) return [];
    return ordensServico.filter(os => {
      const cliente = clientes?.find(c => c.id === os.id_cliente);
      const matchesSearch = 
        os.id.toString().includes(searchQuery) ||
        (cliente && cliente.nome.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || os.status.toLowerCase() === filterStatus.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [ordensServico, searchQuery, filterStatus, clientes]);

  const handleCreateOS = async (e) => {
    e.preventDefault();
    if (!osForm.clienteId || !osForm.modelo || !osForm.problema) {
      if(addAlerta) addAlerta('Preencha todos os campos obrigatórios', 'warning');
      return;
    }

    const finalProblema = osForm.isChatbot ? `[CHATBOT] ${osForm.problema}` : osForm.problema;
    const finalPrioridade = osForm.isChatbot ? 'urgente' : osForm.prioridade.toLowerCase();

    const novaOS = {
      id_cliente: parseInt(osForm.clienteId),
      tipo_aparelho: osForm.tipoAparelho,
      modelo: osForm.modelo,
      condicao: JSON.stringify(damageMarkers),
      problema: finalProblema,
      prioridade: finalPrioridade,
      status: 'na-fila',
      data_entrada: new Date().toISOString()
    };

    const { data, error } = await supabase.from('ordens_servico').insert([novaOS]).select();

    if (error) {
      console.error(error);
      if(addAlerta) addAlerta('Erro ao criar OS no banco.', 'error');
      return;
    }

    setOrdensServico([...(ordensServico || []), data[0]]);
    
    const clienteNome = clientes?.find(c => c.id === novaOS.id_cliente)?.nome || 'Cliente';
    if(addAtividade) addAtividade('OS Criada', `OS #${data[0].id} - ${osForm.modelo} - ${clienteNome}`, 'balcao');
    if(addAlerta) addAlerta('Ordem de serviço criada com sucesso!', 'success');
    
    setIsOsModalOpen(false);
    setOsForm({
      clienteId: '',
      tipoAparelho: 'Celular',
      modelo: '',
      condicao: '',
      problema: '',
      prioridade: 'Normal',
      isChatbot: false
    });
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantidadeCarrinho >= product.quantidade) {
        if(addAlerta) addAlerta('Quantidade máxima em estoque atingida!', 'warning');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantidadeCarrinho: item.quantidadeCarrinho + 1 } : item));
    } else {
      if (product.quantidade <= 0) {
        if(addAlerta) addAlerta('Produto sem estoque!', 'warning');
        return;
      }
      setCart([...cart, { ...product, quantidadeCarrinho: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const total = cart.reduce((acc, item) => acc + (item.preco_venda * item.quantidadeCarrinho), 0);
    
    // 1. Atualizar estoque
    for (const item of cart) {
      const novaQtd = item.quantidade - item.quantidadeCarrinho;
      await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', item.id);
      // Update local state optimistically
      setEstoque(prev => prev.map(p => p.id === item.id ? { ...p, quantidade: novaQtd } : p));
    }
    
    // 2. Registrar no financeiro
    const { data: finData, error: finError } = await supabase.from('financeiro').insert([{
      tipo: 'entrada',
      categoria: 'venda',
      valor: total,
      descricao: `Venda avulsa: ${cart.map(i => `${i.quantidadeCarrinho}x ${i.nome}`).join(', ')}`
    }]).select();

    if (!finError && finData) {
      setFinanceiro(prev => [finData[0], ...(prev || [])]);
    }
    
    if (addAtividade) addAtividade('Venda Realizada', `Valor Total: R$ ${total.toFixed(2)}`, 'balcao');
    if (addAlerta) addAlerta('Venda finalizada com sucesso!', 'success');
    
    setCart([]);
    setProductSearch('');
  };

  const filteredProducts = useMemo(() => {
    if (!estoque) return [];
    return estoque.filter(p => p.nome.toLowerCase().includes(productSearch.toLowerCase()) && p.quantidade > 0).slice(0, 5);
  }, [estoque, productSearch]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.preco_venda * item.quantidadeCarrinho), 0);


  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!clientForm.nome || !clientForm.telefone) {
      if(addAlerta) addAlerta('Nome e telefone são obrigatórios', 'warning');
      return;
    }

    const novoCliente = {
      nome: clientForm.nome,
      telefone: clientForm.telefone,
      email: clientForm.email,
      cpf: clientForm.cpf,
      endereco: clientForm.endereco
    };

    const { data, error } = await supabase.from('clientes').insert([novoCliente]).select();

    if (error) {
      console.error(error);
      if(addAlerta) addAlerta('Erro ao criar cliente no banco.', 'error');
      return;
    }

    setClientes([...(clientes || []), data[0]]);
    if(addAtividade) addAtividade('Cliente Cadastrado', `Cliente ${novoCliente.nome} cadastrado via balcão`, 'balcao');
    if(addAlerta) addAlerta('Cliente cadastrado com sucesso!', 'success');
    
    setIsClientModalOpen(false);
    setOsForm({ ...osForm, clienteId: data[0].id });
    setIsOsModalOpen(true);
    
    setClientForm({
      nome: '',
      telefone: '',
      email: '',
      cpf: '',
      cep: '',
      endereco: ''
    });
  };

  const getStatusBadgeClass = (status) => {
    const s = status.toLowerCase();
    if (s.includes('pronto')) return 'badge-success';
    if (s.includes('aguardando')) return 'badge-warning';
    if (s.includes('bancada')) return 'badge-info';
    if (s.includes('cancelado')) return 'badge-danger';
    return 'badge-neutral';
  };

  const getPriorityBadgeClass = (prioridade) => {
    const p = prioridade.toLowerCase();
    if (p === 'urgente') return 'badge-danger';
    if (p === 'alta') return 'badge-warning';
    if (p === 'normal') return 'badge-info';
    return 'badge-neutral';
  };

  return (
    <div className="page-container" style={{ padding: '20px', backgroundColor: 'var(--bg-primary, #0a0a0a)', minHeight: '100vh', color: 'var(--text-primary, #FFFFFF)' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Balcão de Atendimento</h1>
          <p style={{ color: 'var(--text-secondary, #A0A0A0)', margin: '5px 0 0 0' }}>Gestão de ordens de serviço, clientes e vendas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setIsClientModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 15px', backgroundColor: 'var(--bg-elevated, #1a1a1a)', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
            <Users size={18} /> Novo Cliente
          </button>
          <button className="btn btn-primary" onClick={() => setIsOsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 15px', backgroundColor: 'var(--accent-color, #FFD700)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            <FileText size={18} /> Nova OS
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {osProntas.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(255, 170, 0, 0.15)', 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--accent-yellow)', 
          padding: '16px 20px', 
          borderRadius: '8px', 
          marginBottom: '20px', 
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '1.05rem' }}>
            <AlertTriangle size={24} />
            <span>{osProntas.length} aparelho(s) pronto(s) para retirada! Entrar em contato com o cliente:</span>
          </div>
          <ul style={{ marginTop: '12px', paddingLeft: '34px', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {osProntas.map(os => {
              const cliente = clientes?.find(c => c.id === (os.clienteId || os.id_cliente));
              return (
                <li key={os.id} style={{ fontSize: '0.9rem', color: '#fff' }}>
                  <strong style={{ color: 'var(--accent-yellow)' }}>OS #{os.id}</strong> — {os.tipoAparelho || os.tipo_aparelho} {os.modelo} 
                  <span style={{ color: 'var(--text-secondary, #A0A0A0)', marginLeft: '6px' }}>({cliente?.nome || 'Cliente Desconhecido'})</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div className="kpi-card card" onClick={() => navigate('/laboratorio')} style={{ padding: '15px', backgroundColor: 'var(--card-bg, #141414)', borderRadius: '8px', border: '1px solid var(--border-color, #2a2a2a)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #A0A0A0)' }}>OS Ativas</h3>
            <Wrench size={20} color="var(--info-color, #3B82F6)" />
          </div>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{osAtivas.length}</p>
        </div>
        
        <div className="kpi-card card" onClick={() => navigate('/laboratorio')} style={{ padding: '15px', backgroundColor: 'var(--card-bg, #141414)', borderRadius: '8px', border: '1px solid var(--border-color, #2a2a2a)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #A0A0A0)' }}>OS Prontas</h3>
            <CheckCircle size={20} color="var(--success-color, #25D366)" />
          </div>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{osProntas.length}</p>
        </div>

        <div className="kpi-card card" onClick={() => setIsClientListModalOpen(true)} style={{ padding: '15px', backgroundColor: 'var(--card-bg, #141414)', borderRadius: '8px', border: '1px solid var(--border-color, #2a2a2a)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #A0A0A0)' }}>Clientes Cadastrados</h3>
            <Users size={20} color="var(--accent-color, #FFD700)" />
          </div>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{clientes?.length || 0}</p>
        </div>

        <div className="kpi-card card" onClick={() => navigate('/financeiro')} style={{ padding: '15px', backgroundColor: 'var(--card-bg, #141414)', borderRadius: '8px', border: '1px solid var(--border-color, #2a2a2a)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #A0A0A0)' }}>Vendas do Dia</h3>
            <ShoppingCart size={20} color="var(--success-color, #25D366)" />
          </div>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>R$ {vendasDia.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* OS Table Section */}
        <section className="card" style={{ padding: '20px', backgroundColor: 'var(--card-bg, #141414)', borderRadius: '8px', border: '1px solid var(--border-color, #2a2a2a)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Ordens de Serviço</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div className="search-bar" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary, #0a0a0a)', padding: '5px 10px', borderRadius: '4px', border: '1px solid var(--border-color, #2a2a2a)' }}>
                <Search size={16} color="var(--text-secondary, #A0A0A0)" style={{ marginRight: '5px' }} />
                <input 
                  type="text" 
                  placeholder="Buscar OS ou Cliente" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
                />
              </div>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', padding: '5px 10px', borderRadius: '4px' }}
              >
                <option value="all">Todos os Status</option>
                <option value="aguardando avaliação">Aguardando Avaliação</option>
                <option value="na bancada">Na Bancada</option>
                <option value="pronto">Pronto</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #2a2a2a)', color: 'var(--text-secondary, #A0A0A0)' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Cliente</th>
                  <th style={{ padding: '10px' }}>Aparelho</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Prioridade</th>
                  <th style={{ padding: '10px' }}>Data Entrada</th>
                  <th style={{ padding: '10px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOS.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary, #A0A0A0)' }}>Nenhuma OS encontrada.</td>
                  </tr>
                ) : (
                  filteredOS.map(os => (
                    <tr key={os.id} style={{ borderBottom: '1px solid var(--border-color, #2a2a2a)' }}>
                      <td data-label="ID" style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          #{os.id}
                          {os.problema?.includes('[CHATBOT]') && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--warning-color, #FFAA00)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                              <Bot size={12} />
                              Chatbot
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Cliente" style={{ padding: '10px' }}>{clientes?.find(c => c.id === os.id_cliente)?.nome || 'Desconhecido'}</td>
                      <td data-label="Aparelho" style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Smartphone size={14} />
                          {os.modelo}
                        </div>
                      </td>
                      <td data-label="Status" style={{ padding: '10px' }}>
                        <span className={`status-badge`} style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: getStatusBadgeClass(os.status).includes('success') ? 'var(--success-color, #25D366)' : getStatusBadgeClass(os.status).includes('warning') ? 'var(--warning-color, #FFAA00)' : 'var(--info-color, #3B82F6)', color: '#000' }}>
                          {os.status}
                        </span>
                      </td>
                      <td data-label="Prioridade" style={{ padding: '10px' }}>
                        <span className={`status-badge`} style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: getPriorityBadgeClass(os.prioridade).includes('danger') ? 'var(--danger-color, #FF4444)' : getPriorityBadgeClass(os.prioridade).includes('warning') ? 'var(--warning-color, #FFAA00)' : 'var(--info-color, #3B82F6)', color: '#fff' }}>
                          {os.prioridade}
                        </span>
                      </td>
                      <td data-label="Data Entrada" style={{ padding: '10px' }}>{new Date(os.data_entrada || os.created_at || new Date()).toLocaleDateString('pt-BR')}</td>
                      <td data-label="Ações" style={{ padding: '10px' }}>
                        <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: 'var(--bg-elevated, #1a1a1a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleViewOS(os)}>Detalhes</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Sales Section */}
        <section className="card" style={{ padding: '20px', backgroundColor: 'var(--card-bg, #141414)', borderRadius: '8px', border: '1px solid var(--border-color, #2a2a2a)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Venda Avulsa</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} color="var(--text-secondary, #A0A0A0)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  style={{ padding: '8px 10px 8px 35px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px', width: '250px' }}
                />
                {productSearch && filteredProducts.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-elevated, #1a1a1a)', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px', marginTop: '5px', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredProducts.map(p => (
                      <div key={p.id} style={{ padding: '10px', borderBottom: '1px solid var(--border-color, #2a2a2a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{p.nome}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #A0A0A0)' }}>Estoque: {p.quantidade} | R$ {p.preco_venda.toFixed(2)}</div>
                        </div>
                        <button onClick={() => addToCart(p)} style={{ background: 'none', border: 'none', color: 'var(--success-color, #25D366)', cursor: 'pointer' }}>
                          <PlusCircle size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: '20px', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '8px', backgroundColor: 'var(--bg-primary, #0a0a0a)' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary, #A0A0A0)', padding: '20px 0' }}>
                <ShoppingCart size={32} color="var(--text-secondary, #A0A0A0)" style={{ margin: '0 auto 10px auto' }} />
                <p>O carrinho está vazio. Busque produtos acima para adicionar.</p>
              </div>
            ) : (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color, #2a2a2a)', color: 'var(--text-secondary, #A0A0A0)', fontSize: '13px', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Produto</th>
                      <th style={{ padding: '8px' }}>Qtd</th>
                      <th style={{ padding: '8px' }}>Preço Unit.</th>
                      <th style={{ padding: '8px' }}>Total</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color, #2a2a2a)', fontSize: '13px' }}>
                        <td style={{ padding: '8px' }}>{item.nome}</td>
                        <td style={{ padding: '8px' }}>{item.quantidadeCarrinho}</td>
                        <td style={{ padding: '8px' }}>R$ {item.preco_venda.toFixed(2)}</td>
                        <td style={{ padding: '8px' }}>R$ {(item.preco_venda * item.quantidadeCarrinho).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger-color, #FF4444)', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color, #2a2a2a)', paddingTop: '15px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    Total: <span style={{ color: 'var(--accent-color, #FFD700)' }}>R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={handleCheckout} className="btn btn-primary" style={{ padding: '10px 20px', backgroundColor: 'var(--accent-color, #FFD700)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Finalizar Venda
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* New OS Modal */}
      {isOsModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-elevated, #1a1a1a)', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color, #2a2a2a)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-color, #FFD700)' }}>Nova Ordem de Serviço</h2>
              <button onClick={() => setIsOsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #A0A0A0)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOS}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Cliente *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    className="form-input" 
                    value={osForm.clienteId} 
                    onChange={(e) => setOsForm({...osForm, clienteId: e.target.value})}
                    required
                    style={{ flex: 1, padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes?.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} - {c.telefone}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsOsModalOpen(false); setIsClientModalOpen(true); }} style={{ padding: '0 15px', backgroundColor: 'var(--bg-primary, #0a0a0a)', border: '1px solid var(--border-color, #2a2a2a)', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                  <input 
                    type="checkbox" 
                    checked={osForm.isChatbot} 
                    onChange={(e) => setOsForm({...osForm, isChatbot: e.target.checked})}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>
                    <Bot size={16} style={{ verticalAlign: 'middle', marginRight: '5px', color: 'var(--warning-color, #FFAA00)' }} />
                    Criado pelo Chatbot
                  </span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Tipo de Aparelho</label>
                  <select 
                    className="form-input" 
                    value={osForm.tipoAparelho} 
                    onChange={(e) => setOsForm({...osForm, tipoAparelho: e.target.value})}
                    style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                  >
                    <option value="Celular">Celular</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Notebook">Notebook</option>
                    <option value="Computador">Computador</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Prioridade</label>
                  <select 
                    className="form-input" 
                    value={osForm.prioridade} 
                    onChange={(e) => setOsForm({...osForm, prioridade: e.target.value})}
                    style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Modelo do Aparelho *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={osForm.modelo} 
                  onChange={(e) => setOsForm({...osForm, modelo: e.target.value})}
                  required
                  placeholder="Ex: iPhone 13 Pro Max"
                  style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Observações *</label>
                <textarea 
                  className="form-input" 
                  value={osForm.problema} 
                  onChange={(e) => setOsForm({...osForm, problema: e.target.value})}
                  required
                  rows={3}
                  placeholder="Observações sobre o aparelho, defeito relatado, etc"
                  style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Condição do Aparelho (Mapa de Avarias)</label>
                <DamageMap markers={damageMarkers} onChange={setDamageMarkers} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOsModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', backgroundColor: 'var(--accent-color, #FFD700)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar OS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {isClientModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, padding: '20px' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-elevated, #1a1a1a)', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '500px', border: '1px solid var(--border-color, #2a2a2a)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-color, #FFD700)' }}>Novo Cliente</h2>
              <button onClick={() => setIsClientModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #A0A0A0)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Nome Completo *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={clientForm.nome} 
                  onChange={(e) => setClientForm({...clientForm, nome: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Telefone (WhatsApp) *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={clientForm.telefone} 
                    onChange={(e) => setClientForm({...clientForm, telefone: e.target.value})}
                    required
                    style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>CPF</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={clientForm.cpf} 
                    onChange={(e) => setClientForm({...clientForm, cpf: e.target.value})}
                    style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>E-mail</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={clientForm.email} 
                  onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>CEP</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={clientForm.cep} 
                    onChange={handleCepChange}
                    maxLength="9"
                    placeholder="00000-000"
                    style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary, #A0A0A0)' }}>Endereço</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={clientForm.endereco} 
                    onChange={(e) => setClientForm({...clientForm, endereco: e.target.value})}
                    style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-primary, #0a0a0a)', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsClientModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', backgroundColor: 'var(--accent-color, #FFD700)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client List Modal */}
      {isClientListModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, padding: '20px' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-elevated, #1a1a1a)', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border-color, #2a2a2a)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-color, #FFD700)' }}>Clientes Cadastrados</h2>
              <button onClick={() => setIsClientListModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #A0A0A0)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #2a2a2a)', color: 'var(--text-secondary, #A0A0A0)' }}>
                  <th style={{ padding: '10px' }}>Nome</th>
                  <th style={{ padding: '10px' }}>Telefone</th>
                  <th style={{ padding: '10px' }}>E-mail</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes?.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color, #2a2a2a)' }}>
                    <td style={{ padding: '10px' }}>{c.nome}</td>
                    <td style={{ padding: '10px' }}>{c.telefone}</td>
                    <td style={{ padding: '10px' }}>{c.email || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button className="btn btn-danger" style={{ padding: '5px 10px', backgroundColor: 'var(--danger-color, #FF4444)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }} onClick={() => handleDeleteClient(c.id)}>
                        <Trash2 size={14} /> Apagar
                      </button>
                    </td>
                  </tr>
                ))}
                {(!clientes || clientes.length === 0) && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Nenhum cliente cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View OS Modal */}
      {viewOsData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, padding: '20px' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-elevated, #1a1a1a)', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '600px', border: '1px solid var(--border-color, #2a2a2a)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-color, #FFD700)' }}>Detalhes da OS #{viewOsData.id}</h2>
              <button onClick={() => setViewOsData(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #A0A0A0)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <p><strong>Cliente:</strong> {clientes?.find(c => c.id === viewOsData.clienteId || c.id === viewOsData.id_cliente)?.nome || 'Desconhecido'}</p>
              <p><strong>Aparelho:</strong> {viewOsData.modelo || viewOsData.tipo_aparelho}</p>
              <p><strong>Observações:</strong> {viewOsData.problema}</p>
              <p><strong>Status:</strong> {viewOsData.status}</p>
              <p><strong>Prioridade:</strong> {viewOsData.prioridade}</p>
              <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                <p style={{ marginBottom: '5px' }}><strong>Condição / Avarias:</strong></p>
                <DamageMap 
                  readOnly={true} 
                  markers={viewOsData?.condicao && viewOsData.condicao.startsWith('[') ? JSON.parse(viewOsData.condicao) : []} 
                />
              </div>

              <p><strong>Data de Entrada:</strong> {new Date(viewOsData.dataEntrada || viewOsData.data_entrada).toLocaleString('pt-BR')}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button className="btn btn-danger" style={{ padding: '10px 20px', backgroundColor: 'var(--danger-color, #FF4444)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleDeleteOS(viewOsData.id)}>
                <Trash2 size={16} style={{ marginRight: '5px' }} /> Apagar OS
              </button>
              <button className="btn btn-secondary" style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#fff', border: '1px solid var(--border-color, #2a2a2a)', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setViewOsData(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
