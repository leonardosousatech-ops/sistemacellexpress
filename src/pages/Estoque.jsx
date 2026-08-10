import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import { 
  Package, Search, Plus, Edit2, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Archive, Box, Filter
} from 'lucide-react';

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function Estoque() {
  const { estoque, setEstoque, addAtividade, addAlerta } = useData();
  
  // State
  const [filter, setFilter] = useState('todos'); // todos, pecas, produtos, baixo
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [isMovModalOpen, setIsMovModalOpen] = useState(false);
  
  // Form states
  const [itemForm, setItemForm] = useState({
    nome: '',
    categoria: 'peça',
    quantidade: 0,
    estoque_minimo: 5,
    preco_custo: 0,
    preco_venda: 0
  });
  
  const [movForm, setMovForm] = useState({
    itemId: '',
    tipo: 'entrada',
    quantidade: 1,
    motivo: ''
  });

  // KPIs
  const kpis = useMemo(() => {
    let totalItens = estoque.length;
    let pecas = 0;
    let produtos = 0;
    let estoqueBaixo = 0;
    
    estoque.forEach(item => {
      if (item.categoria === 'peça') pecas++;
      if (item.categoria === 'produto_venda') produtos++;
      if (item.quantidade <= item.estoque_minimo) estoqueBaixo++;
    });
    
    return { totalItens, pecas, produtos, estoqueBaixo };
  }, [estoque]);

  // Filtered list
  const filteredEstoque = useMemo(() => {
    return estoque.filter(item => {
      // Search
      const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter
      let matchesFilter = true;
      if (filter === 'pecas') matchesFilter = item.categoria === 'peça';
      if (filter === 'produtos') matchesFilter = item.categoria === 'produto_venda';
      if (filter === 'baixo') matchesFilter = item.quantidade <= item.estoque_minimo;
      
      return matchesSearch && matchesFilter;
    });
  }, [estoque, searchTerm, filter]);

  // Handlers
  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ ...item });
    } else {
      setEditingItem(null);
      setItemForm({
        nome: '',
        categoria: 'peça',
        quantidade: 0,
        estoque_minimo: 5,
        preco_custo: 0,
        preco_venda: 0
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (editingItem) {
      // Edit
      setEstoque(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...itemForm } : i));
      addAtividade(`Item atualizado no estoque: ${itemForm.nome}`);
    } else {
      // Add
      const newItem = {
        ...itemForm,
        id: Date.now().toString(),
        quantidade: Number(itemForm.quantidade),
        estoque_minimo: Number(itemForm.estoque_minimo),
        preco_custo: Number(itemForm.preco_custo),
        preco_venda: Number(itemForm.preco_venda)
      };
      setEstoque(prev => [...prev, newItem]);
      addAtividade(`Novo item adicionado ao estoque: ${itemForm.nome}`);
    }
    setIsItemModalOpen(false);
  };

  const handleSaveMovimento = (e) => {
    e.preventDefault();
    const item = estoque.find(i => i.id === movForm.itemId);
    if (!item) return;

    const qtd = Number(movForm.quantidade);
    const isEntrada = movForm.tipo === 'entrada';
    const novaQuantidade = isEntrada ? item.quantidade + qtd : item.quantidade - qtd;

    if (!isEntrada && novaQuantidade < 0) {
      alert('Quantidade insuficiente em estoque.');
      return;
    }

    setEstoque(prev => prev.map(i => i.id === item.id ? { ...i, quantidade: novaQuantidade } : i));
    addAtividade(`${isEntrada ? 'Entrada' : 'Saída'} de estoque: ${qtd}x ${item.nome} (${movForm.motivo})`);
    
    if (novaQuantidade <= item.estoque_minimo) {
      addAlerta(`Estoque baixo: ${item.nome} restam apenas ${novaQuantidade} unidades.`, 'warning');
    }

    setIsMovModalOpen(false);
  };

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Package /> Estoque</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setIsMovModalOpen(true)}>
            <ArrowUpRight size={18} /> Movimentação
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenItemModal()}>
            <Plus size={18} /> Novo Item
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary, #A0A0A0)' }}>
            <Archive /> <h3>Total de Itens</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{kpis.totalItens}</p>
        </div>
        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--info, #3B82F6)' }}>
            <Package /> <h3>Peças p/ Reparo</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{kpis.pecas}</p>
        </div>
        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success, #25D366)' }}>
            <Box /> <h3>Produtos p/ Venda</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{kpis.produtos}</p>
        </div>
        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger, #FF4444)' }}>
            <AlertTriangle /> <h3>Estoque Baixo</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{kpis.estoqueBaixo}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
            <button className={`btn ${filter === 'todos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('todos')}>Todos</button>
            <button className={`btn ${filter === 'pecas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('pecas')}>Peças</button>
            <button className={`btn ${filter === 'produtos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('produtos')}>Produtos</button>
            <button className={`btn ${filter === 'baixo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('baixo')}>
              Estoque Baixo
            </button>
          </div>
          <div className="form-group" style={{ position: 'relative', margin: 0, minWidth: '250px' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary, #A0A0A0)' }} size={20} />
            <input 
              type="text" 
              placeholder="Buscar item..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border, #2a2a2a)' }}>
              <th style={{ padding: '15px' }}>Nome</th>
              <th style={{ padding: '15px' }}>Categoria</th>
              <th style={{ padding: '15px' }}>Quantidade</th>
              <th style={{ padding: '15px' }}>Preço Custo</th>
              <th style={{ padding: '15px' }}>Preço Venda</th>
              <th style={{ padding: '15px' }}>Margem</th>
              <th style={{ padding: '15px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredEstoque.length > 0 ? filteredEstoque.map(item => {
              const margem = item.preco_custo > 0 
                ? ((item.preco_venda - item.preco_custo) / item.preco_custo * 100).toFixed(1) 
                : 100;
              
              const isBaixo = item.quantidade <= item.estoque_minimo;
              const isCritico = item.quantidade === 0;

              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border, #2a2a2a)' }}>
                  <td data-label="Nome" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isBaixo && <AlertTriangle size={16} color={isCritico ? 'var(--danger, #FF4444)' : 'var(--warning, #FFAA00)'} />}
                    {item.nome}
                  </td>
                  <td data-label="Categoria" style={{ padding: '15px' }}>
                    <span className="status-badge" style={{ 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem',
                      backgroundColor: item.categoria === 'peça' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 211, 102, 0.2)',
                      color: item.categoria === 'peça' ? 'var(--info, #3B82F6)' : 'var(--success, #25D366)'
                    }}>
                      {item.categoria === 'peça' ? 'Peça' : 'Produto'}
                    </span>
                  </td>
                  <td data-label="Quantidade" style={{ 
                    padding: '15px', 
                    color: isCritico ? 'var(--danger, #FF4444)' : isBaixo ? 'var(--warning, #FFAA00)' : 'inherit',
                    fontWeight: isBaixo ? 'bold' : 'normal'
                  }}>
                    {item.quantidade} <span style={{ fontSize: '0.8em', color: 'var(--text-secondary, #A0A0A0)' }}>(mín: {item.estoque_minimo})</span>
                  </td>
                  <td data-label="Preço Custo" style={{ padding: '15px' }}>{formatCurrency(item.preco_custo)}</td>
                  <td data-label="Preço Venda" style={{ padding: '15px' }}>{formatCurrency(item.preco_venda)}</td>
                  <td data-label="Margem %" style={{ padding: '15px', color: margem > 0 ? 'var(--success, #25D366)' : 'var(--danger, #FF4444)' }}>
                    {margem}%
                  </td>
                  <td data-label="Ações" style={{ padding: '15px' }}>
                    <button className="btn btn-secondary" style={{ padding: '5px' }} onClick={() => handleOpenItemModal(item)}>
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary, #A0A0A0)' }}>
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="card modal-content" style={modalContentStyle}>
            <h2>{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
            <form onSubmit={handleSaveItem}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Nome</label>
                <input required type="text" value={itemForm.nome} onChange={e => setItemForm({...itemForm, nome: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label>Categoria</label>
                  <select value={itemForm.categoria} onChange={e => setItemForm({...itemForm, categoria: e.target.value})} style={{ width: '100%', padding: '8px' }}>
                    <option value="peça">Peça de Reparo</option>
                    <option value="produto_venda">Produto para Venda</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estoque Mínimo</label>
                  <input required type="number" min="0" value={itemForm.estoque_minimo} onChange={e => setItemForm({...itemForm, estoque_minimo: e.target.value})} style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>

              {!editingItem && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label>Quantidade Inicial</label>
                  <input required type="number" min="0" value={itemForm.quantidade} onChange={e => setItemForm({...itemForm, quantidade: e.target.value})} style={{ width: '100%', padding: '8px' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Preço de Custo (R$)</label>
                  <input required type="number" step="0.01" min="0" value={itemForm.preco_custo} onChange={e => setItemForm({...itemForm, preco_custo: e.target.value})} style={{ width: '100%', padding: '8px' }} />
                </div>
                <div className="form-group">
                  <label>Preço de Venda (R$)</label>
                  <input required type="number" step="0.01" min="0" value={itemForm.preco_venda} onChange={e => setItemForm({...itemForm, preco_venda: e.target.value})} style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsItemModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movimentacao Modal */}
      {isMovModalOpen && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="card modal-content" style={modalContentStyle}>
            <h2>Registrar Movimentação</h2>
            <form onSubmit={handleSaveMovimento}>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Item</label>
                <select required value={movForm.itemId} onChange={e => setMovForm({...movForm, itemId: e.target.value})} style={{ width: '100%', padding: '8px' }}>
                  <option value="">Selecione um item...</option>
                  {estoque.map(i => (
                    <option key={i.id} value={i.id}>{i.nome} (Atual: {i.quantidade})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={movForm.tipo} onChange={e => setMovForm({...movForm, tipo: e.target.value})} style={{ width: '100%', padding: '8px' }}>
                    <option value="entrada">Entrada (+)</option>
                    <option value="saída">Saída (-)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantidade</label>
                  <input required type="number" min="1" value={movForm.quantidade} onChange={e => setMovForm({...movForm, quantidade: e.target.value})} style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Motivo / Observação</label>
                <input required type="text" placeholder="Ex: Compra de fornecedor, Descarte..." value={movForm.motivo} onChange={e => setMovForm({...movForm, motivo: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMovModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline styles for modals (fallback if generic classes aren't enough)
const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: 'var(--card-bg, #141414)',
  width: '90%',
  maxWidth: '500px',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid var(--border, #2a2a2a)',
  maxHeight: '90vh',
  overflowY: 'auto'
};
