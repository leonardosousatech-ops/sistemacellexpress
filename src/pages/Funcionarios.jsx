import React, { useState, useMemo } from 'react';
import { useData, useAuth } from '../App';
import { supabase } from '../supabaseClient';
import {
  Users, UserCheck, Activity, Plus, X, Search, Edit2,
  Save, AlertCircle, Shield, Briefcase, Phone, Mail,
  Calendar, Clock, Trash2, CheckCircle, Lock, ShoppingCart,
  Wrench, Package, DollarSign, Award
} from 'lucide-react';

const MODULES_CONFIG = {
  balcao: { label: 'Balcão / PDV', icon: ShoppingCart, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)', desc: 'Frente de caixa, vendas e cadastro de clientes' },
  laboratorio: { label: 'Laboratório', icon: Wrench, color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)', desc: 'Ordens de serviço, bancada e reparos' },
  estoque: { label: 'Estoque', icon: Package, color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)', desc: 'Consulta, cadastro de peças e produtos' },
  financeiro: { label: 'Financeiro', icon: DollarSign, color: '#25D366', bg: 'rgba(37, 211, 102, 0.15)', desc: 'Fluxo de caixa, entradas e saídas' },
  garantias: { label: 'Garantias', icon: Award, color: '#FFAA00', bg: 'rgba(255, 170, 0, 0.15)', desc: 'Controle de prazos e termos de garantia' },
  funcionarios: { label: 'Gestão de Equipe', icon: Shield, color: '#FF4444', bg: 'rgba(255, 68, 68, 0.15)', desc: 'Criar funcionários e alterar permissões' }
};

const ROLE_PRESETS = [
  { name: '👑 Administrador', cargo: 'Administrador', papeis: ['balcao', 'laboratorio', 'estoque', 'financeiro', 'garantias', 'funcionarios'] },
  { name: '📊 Gerente', cargo: 'Gerente', papeis: ['balcao', 'laboratorio', 'estoque', 'financeiro', 'garantias'] },
  { name: '👨‍🔧 Técnico', cargo: 'Técnico', papeis: ['laboratorio', 'estoque'] },
  { name: '💼 Atendente / Caixa', cargo: 'Atendente', papeis: ['balcao', 'garantias'] }
];

export default function Funcionarios() {
  const { funcionarios, setFuncionarios, atividades, ordensServico, addAtividade, addAlerta } = useData();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);

  const [formData, setFormData] = useState({
    nome: '', email: '', senha: '', cargo: '', telefone: '', ativo: true, papeis: []
  });

  // KPIs
  const totalFuncionarios = funcionarios?.length || 0;
  const funcionariosAtivos = funcionarios?.filter(f => f.ativo !== false)?.length || 0;
  const today = new Date().toISOString().split('T')[0];
  const atividadesHoje = atividades?.filter(a => a.data?.startsWith(today) || a.data_hora?.startsWith(today))?.length || 0;
  const osConcluidas = ordensServico?.filter(os => os.status === 'pronto' || os.status === 'entregue')?.length || 0;

  const filteredFuncionarios = useMemo(() => {
    return (funcionarios || []).filter(f => 
      f.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [funcionarios, searchTerm]);

  const handleOpenModal = (func = null) => {
    if (func) {
      setEditingFuncionario(func);
      setFormData({
        nome: func.nome || '',
        email: func.email || '',
        senha: '',
        cargo: func.cargo || 'Atendente',
        telefone: func.telefone || '',
        ativo: func.ativo !== false,
        papeis: Array.isArray(func.papeis) ? func.papeis : []
      });
    } else {
      setEditingFuncionario(null);
      setFormData({
        nome: '', email: '', senha: '', cargo: 'Atendente', telefone: '', ativo: true,
        papeis: ['balcao', 'laboratorio', 'estoque', 'financeiro', 'garantias']
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFuncionario(null);
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      cargo: preset.cargo,
      papeis: [...preset.papeis]
    }));
  };

  const togglePapel = (key) => {
    setFormData(prev => {
      const exists = prev.papeis.includes(key);
      const newPapeis = exists ? prev.papeis.filter(p => p !== key) : [...prev.papeis, key];
      return { ...prev, papeis: newPapeis };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.cargo) {
      if (addAlerta) addAlerta('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    if (editingFuncionario) {
      // Direct update in supabase funcionarios table
      const updates = {
        nome: formData.nome,
        email: formData.email,
        cargo: formData.cargo,
        telefone: formData.telefone || '',
        ativo: formData.ativo,
        papeis: formData.papeis
      };

      const { data, error } = await supabase.from('funcionarios').update(updates).eq('id', editingFuncionario.id).select();
      
      if (error || !data) {
        console.error(error);
        if (addAlerta) addAlerta('Erro ao atualizar funcionário.', 'error');
        return;
      }

      const updatedFuncionario = data[0];
      if (setFuncionarios) {
        setFuncionarios(prev => prev.map(f => f.id === editingFuncionario.id ? updatedFuncionario : f));
      }
      if (addAtividade) addAtividade('Permissões Atualizadas', `[${user?.nome || 'Admin'}] Atualizou acessos e cargo de ${formData.nome}`, 'funcionarios');
      if (addAlerta) addAlerta(`Permissões de ${formData.nome} salvas com sucesso!`, 'success');
    } else {
      // Create new employee
      const newRecord = {
        nome: formData.nome,
        email: formData.email,
        cargo: formData.cargo,
        telefone: formData.telefone || '',
        ativo: formData.ativo,
        papeis: formData.papeis
      };

      const { data, error } = await supabase.from('funcionarios').insert([newRecord]).select();
      
      if (error || !data) {
        console.error(error);
        if (addAlerta) addAlerta('Erro ao cadastrar funcionário.', 'error');
        return;
      }

      if (setFuncionarios) {
        setFuncionarios(prev => [data[0], ...(prev || [])]);
      }
      if (addAtividade) addAtividade('Novo Funcionário', `[${user?.nome || 'Admin'}] Cadastrou ${formData.nome} (${formData.cargo})`, 'funcionarios');
      if (addAlerta) addAlerta(`Funcionário ${formData.nome} cadastrado com sucesso!`, 'success');
    }
    handleCloseModal();
  };

  const handleToggleStatus = async (func) => {
    const nextStatus = func.ativo === false ? true : false;
    const { error } = await supabase.from('funcionarios').update({ ativo: nextStatus }).eq('id', func.id);
    if (error) {
      if (addAlerta) addAlerta('Erro ao alterar status.', 'error');
      return;
    }
    
    if (setFuncionarios) {
      setFuncionarios(prev => prev.map(f => f.id === func.id ? { ...f, ativo: nextStatus } : f));
    }
    if (addAtividade) addAtividade('Status Alterado', `${func.nome} agora está ${nextStatus ? 'Ativo' : 'Inativo'}`, 'funcionarios');
    if (addAlerta) addAlerta(`${func.nome} marcado como ${nextStatus ? 'Ativo' : 'Inativo'}.`, 'success');
  };

  const handleDeleteFuncionario = async (func) => {
    if (!window.confirm(`Tem certeza que deseja REMOVER o usuário "${func.nome}" do sistema?`)) {
      return;
    }

    const { error } = await supabase.from('funcionarios').delete().eq('id', func.id);
    if (error) {
      if (addAlerta) addAlerta('Erro ao remover funcionário.', 'error');
      return;
    }

    if (setFuncionarios) {
      setFuncionarios(prev => prev.filter(f => f.id !== func.id));
    }
    if (addAtividade) addAtividade('Funcionário Removido', `[${user?.nome || 'Admin'}] Removeu o usuário "${func.nome}"`, 'funcionarios');
    if (addAlerta) addAlerta(`Usuário "${func.nome}" removido do sistema.`, 'success');
  };

  const handleViewActivity = (func) => {
    setSelectedFuncionario(func);
    setIsActivityModalOpen(true);
  };

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 4px 0' }}>
            <Users size={30} color="var(--accent-yellow, #FFD700)" /> Gestão de Equipe & Permissões
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary, #A0A0A0)', fontSize: '14px' }}>
            Visualize os usuários cadastrados e defina os módulos e acessos de cada um.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Novo Usuário / Funcionário
        </button>
      </div>

      {/* KPIs Grid */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.12)', padding: '12px', borderRadius: '12px' }}>
              <Users size={24} color="#FFD700" />
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #A0A0A0)', fontSize: '13px' }}>Total Cadastrados</span>
              <p style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>{totalFuncionarios}</p>
            </div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(37, 211, 102, 0.12)', padding: '12px', borderRadius: '12px' }}>
              <UserCheck size={24} color="#25D366" />
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #A0A0A0)', fontSize: '13px' }}>Usuários Ativos</span>
              <p style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#25D366' }}>{funcionariosAtivos}</p>
            </div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', padding: '12px', borderRadius: '12px' }}>
              <Activity size={24} color="#3B82F6" />
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #A0A0A0)', fontSize: '13px' }}>Ações Hoje</span>
              <p style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#3B82F6' }}>{atividadesHoje}</p>
            </div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.12)', padding: '12px', borderRadius: '12px' }}>
              <Award size={24} color="#A855F7" />
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #A0A0A0)', fontSize: '13px' }}>OS Finalizadas</span>
              <p style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>{osConcluidas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #2a2a2a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 4px 0' }}>Usuários e Permissões</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)' }}>Clique em "Editar" para alterar os módulos permitidos para cada pessoa.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '8px 14px', border: '1px solid var(--border, #2a2a2a)', width: '100%', maxWidth: '320px' }}>
            <Search size={18} color="#A0A0A0" />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou cargo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ backgroundColor: 'transparent', border: 'none', color: '#fff', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a', color: 'var(--text-secondary, #A0A0A0)', fontSize: '13px', borderBottom: '1px solid var(--border, #2a2a2a)' }}>
                <th style={{ padding: '14px 20px', fontWeight: '600' }}>Usuário / Cargo</th>
                <th style={{ padding: '14px 20px', fontWeight: '600' }}>Email / Contato</th>
                <th style={{ padding: '14px 20px', fontWeight: '600' }}>Módulos e Permissões</th>
                <th style={{ padding: '14px 20px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredFuncionarios.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary, #A0A0A0)' }}>
                    Nenhum usuário cadastrado encontrado.
                  </td>
                </tr>
              ) : (
                filteredFuncionarios.map(f => {
                  const papeis = Array.isArray(f.papeis) ? f.papeis : [];
                  const isUserActive = f.ativo !== false;
                  const registerDate = f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '-';

                  return (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border, #2a2a2a)', transition: 'background-color 0.15s' }}>
                      {/* Name and Cargo */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '42px', height: '42px', borderRadius: '50%', 
                            backgroundColor: 'rgba(255, 215, 0, 0.15)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontWeight: '800', color: 'var(--accent-yellow, #FFD700)', flexShrink: 0,
                            border: '1px solid rgba(255, 215, 0, 0.3)'
                          }}>
                            {f.nome ? f.nome.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#fff', fontSize: '15px' }}>{f.nome}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ 
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                                backgroundColor: f.cargo?.toLowerCase().includes('admin') ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                color: f.cargo?.toLowerCase().includes('admin') ? '#FF4444' : '#e0e0e0'
                              }}>
                                {f.cargo || 'Atendente'}
                              </span>
                              <span>• Cadastrado em {registerDate}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary, #A0A0A0)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', marginBottom: '4px' }}>
                          <Mail size={13} color="var(--accent-yellow, #FFD700)" /> {f.email || 'Sem email'}
                        </div>
                        {f.telefone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <Phone size={13} /> {f.telefone}
                          </div>
                        )}
                      </td>

                      {/* Permissions / Badges */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '340px' }}>
                          {papeis.length > 0 ? (
                            papeis.map(pKey => {
                              const conf = MODULES_CONFIG[pKey] || { label: pKey, color: '#FFD700', bg: 'rgba(255,215,0,0.1)' };
                              const ModIcon = conf.icon || Shield;
                              return (
                                <span 
                                  key={pKey} 
                                  style={{ 
                                    fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', 
                                    backgroundColor: conf.bg, color: conf.color, border: `1px solid ${conf.color}40`,
                                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  <ModIcon size={12} /> {conf.label}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--danger, #FF4444)', fontWeight: '500' }}>
                              ⚠️ Sem permissões atribuídas
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <button 
                          onClick={() => handleToggleStatus(f)}
                          style={{ 
                            backgroundColor: isUserActive ? 'rgba(37, 211, 102, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                            color: isUserActive ? '#25D366' : '#FF4444',
                            border: `1px solid ${isUserActive ? '#25D366' : '#FF4444'}40`,
                            padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isUserActive ? '#25D366' : '#FF4444' }} />
                          {isUserActive ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            onClick={() => handleOpenModal(f)} 
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }} 
                            title="Editar Permissões e Dados"
                          >
                            <Edit2 size={14} /> Editar Acessos
                          </button>
                          <button 
                            onClick={() => handleViewActivity(f)} 
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', color: 'var(--info, #3B82F6)' }} 
                            title="Histórico de Atividades"
                          >
                            <Activity size={15} />
                          </button>
                          {f.email !== 'admin@cellexpress.com' && (
                            <button 
                              onClick={() => handleDeleteFuncionario(f)} 
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', color: 'var(--danger, #FF4444)', borderColor: 'rgba(255,68,68,0.3)' }} 
                              title="Remover Usuário"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Employee Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card, #141414)', borderRadius: '16px', width: '100%', maxWidth: '640px', border: '1px solid var(--border, #2a2a2a)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 15px 50px rgba(0,0,0,0.7)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border, #2a2a2a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={20} color="var(--accent-yellow, #FFD700)" />
                  {editingFuncionario ? `Editar Acessos: ${editingFuncionario.nome}` : 'Cadastrar Novo Usuário / Funcionário'}
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary, #A0A0A0)' }}>
                  Defina quais módulos o usuário terá permissão para visualizar e operar.
                </span>
              </div>
              <button onClick={handleCloseModal} style={{ backgroundColor: 'transparent', border: 'none', color: '#A0A0A0', cursor: 'pointer', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            {/* Modal Form Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <form onSubmit={handleSubmit}>

                {/* Preset Fast Buttons */}
                <div style={{ marginBottom: '20px', backgroundColor: '#1a1a1a', padding: '14px', borderRadius: '10px', border: '1px solid var(--border, #2a2a2a)' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-yellow, #FFD700)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    ⚡ Preenchimento Rápido por Perfil / Cargo:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {ROLE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        style={{
                          backgroundColor: formData.cargo === preset.cargo ? 'var(--accent-yellow, #FFD700)' : '#262626',
                          color: formData.cargo === preset.cargo ? '#000' : '#fff',
                          border: '1px solid #3a3a3a',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic Info Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', color: '#A0A0A0', marginBottom: '6px', display: 'block' }}>Nome Completo *</label>
                    <input 
                      type="text" 
                      value={formData.nome} 
                      onChange={e => setFormData({ ...formData, nome: e.target.value })} 
                      required
                      className="form-input"
                      placeholder="Ex: Leonardo Silva"
                      style={{ width: '100%', padding: '10px 12px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '13px', color: '#A0A0A0', marginBottom: '6px', display: 'block' }}>Cargo / Função *</label>
                    <input 
                      type="text" 
                      value={formData.cargo} 
                      onChange={e => setFormData({ ...formData, cargo: e.target.value })} 
                      required
                      className="form-input"
                      placeholder="Ex: Administrador, Técnico, Atendente..."
                      style={{ width: '100%', padding: '10px 12px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '13px', color: '#A0A0A0', marginBottom: '6px', display: 'block' }}>E-mail *</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })} 
                      required
                      className="form-input"
                      placeholder="seu@email.com"
                      style={{ width: '100%', padding: '10px 12px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '13px', color: '#A0A0A0', marginBottom: '6px', display: 'block' }}>Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      value={formData.telefone} 
                      onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                      className="form-input"
                      placeholder="Ex: (11) 99999-9999"
                      style={{ width: '100%', padding: '10px 12px' }}
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1a1a1a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                  <input 
                    type="checkbox" 
                    id="statusAtivo"
                    checked={formData.ativo} 
                    onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#FFD700', cursor: 'pointer' }}
                  />
                  <label htmlFor="statusAtivo" style={{ fontSize: '14px', color: '#fff', cursor: 'pointer', margin: 0, fontWeight: '600' }}>
                    Usuário Ativo (Pode fazer login no sistema)
                  </label>
                </div>

                {/* Module Permissions Grid */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '15px', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={16} color="var(--accent-yellow, #FFD700)" /> Permissões dos Módulos:
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--accent-yellow, #FFD700)', fontWeight: '600' }}>
                      {formData.papeis.length} de {Object.keys(MODULES_CONFIG).length} selecionados
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                    {Object.entries(MODULES_CONFIG).map(([key, config]) => {
                      const isChecked = formData.papeis.includes(key);
                      const Icon = config.icon;

                      return (
                        <div 
                          key={key}
                          onClick={() => togglePapel(key)}
                          style={{
                            backgroundColor: isChecked ? config.bg : '#1a1a1a',
                            border: `1px solid ${isChecked ? config.color : 'var(--border, #2a2a2a)'}`,
                            borderRadius: '10px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            style={{ width: '18px', height: '18px', accentColor: config.color, cursor: 'pointer', marginTop: '2px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isChecked ? config.color : '#fff', fontWeight: '700', fontSize: '14px' }}>
                              <Icon size={16} /> {config.label}
                            </div>
                            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)', lineHeight: '1.3' }}>
                              {config.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border, #2a2a2a)' }}>
                  <button type="button" onClick={handleCloseModal} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={18} /> Salvar Permissões
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Activity History Modal */}
      {isActivityModalOpen && selectedFuncionario && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card, #141414)', borderRadius: '16px', width: '100%', maxWidth: '700px', border: '1px solid var(--border, #2a2a2a)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border, #2a2a2a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="var(--accent-yellow, #FFD700)" />
                  Atividades de {selectedFuncionario.nome}
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary, #A0A0A0)' }}>Cargo: {selectedFuncionario.cargo}</span>
              </div>
              <button onClick={() => setIsActivityModalOpen(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#A0A0A0', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(atividades || []).filter(a => a.id_usuario === selectedFuncionario.id).map((ativ, idx) => (
                  <div key={idx} style={{ padding: '14px', backgroundColor: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid var(--accent-yellow, #FFD700)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{ativ.acao}</span>
                      <span style={{ color: '#A0A0A0', fontSize: '12px' }}>{ativ.data_hora ? new Date(ativ.data_hora).toLocaleString('pt-BR') : 'Recentemente'}</span>
                    </div>
                    <p style={{ color: '#A0A0A0', fontSize: '13px', margin: '0 0 8px 0' }}>{ativ.detalhes}</p>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#333', color: '#fff' }}>
                      {ativ.modulo}
                    </span>
                  </div>
                ))}
                {(atividades || []).filter(a => a.id_usuario === selectedFuncionario.id).length === 0 && (
                  <p style={{ textAlign: 'center', color: '#A0A0A0', padding: '30px 20px' }}>
                    Nenhuma atividade registrada ainda para este usuário.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
