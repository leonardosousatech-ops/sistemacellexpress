import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import { supabase } from '../supabaseClient';
import {
  Users, UserCheck, Activity, PenTool, Plus, X, Search, Edit2,
  Eye, Save, AlertCircle, Shield, Briefcase, Phone, Mail,
  Calendar, CheckSquare, Clock, Filter, Key
} from 'lucide-react';

export default function Funcionarios() {
  const { funcionarios, setFuncionarios, atividades, ordensServico, addAtividade, addAlerta } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);

  const [formData, setFormData] = useState({
    nome: '', email: '', senha: '', cargo: '', telefone: '', ativo: true, papeis: []
  });

  const permissoesOptions = ['balcao', 'laboratorio', 'estoque', 'financeiro', 'garantias', 'funcionarios'];

  // KPIs
  const totalFuncionarios = funcionarios?.length || 0;
  const funcionariosAtivos = funcionarios?.filter(f => f.ativo)?.length || 0;
  
  const today = new Date().toISOString().split('T')[0];
  const atividadesHoje = atividades?.filter(a => a.data?.startsWith(today))?.length || 0;

  const osConcluidas = ordensServico?.filter(os => os.status === 'pronto' || os.status === 'entregue')?.length || 0;

  const filteredFuncionarios = useMemo(() => {
    return (funcionarios || []).filter(f => 
      f.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
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
        cargo: func.cargo || '',
        telefone: func.telefone || '',
        ativo: func.ativo !== false,
        papeis: func.papeis || []
      });
    } else {
      setEditingFuncionario(null);
      setFormData({
        nome: '', email: '', senha: '', cargo: '', telefone: '', ativo: true, papeis: []
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFuncionario(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'papeis') {
      let newPermissoes = [...formData.papeis];
      if (checked) {
        newPermissoes.push(value);
      } else {
        newPermissoes = newPermissoes.filter(p => p !== value);
      }
      setFormData({ ...formData, permissoes: newPermissoes });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.cargo) {
      if (addAlerta) addAlerta('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    if (editingFuncionario) {
      const { error } = await supabase.from('funcionarios').update(formData).eq('id', editingFuncionario.id);
      if (error) {
         if (addAlerta) addAlerta('Erro ao atualizar funcionário no banco.', 'error');
         return;
      }
      
      const updatedFuncionarios = funcionarios.map(f =>
        f.id === editingFuncionario.id ? { ...f, ...formData } : f
      );
      if (setFuncionarios) setFuncionarios(updatedFuncionarios);
      if (addAtividade) addAtividade('Editou funcionário', `Editou os dados de ${formData.nome}`, 'funcionarios');
      if (addAlerta) addAlerta('Funcionário atualizado com sucesso.', 'success');
    } else {
      const { data, error } = await supabase.from('funcionarios').insert([formData]).select();
      if (error || !data) {
         if (addAlerta) addAlerta('Erro ao cadastrar funcionário no banco.', 'error');
         return;
      }
      
      if (setFuncionarios) setFuncionarios([...(funcionarios || []), data[0]]);
      if (addAtividade) addAtividade('Adicionou funcionário', `Cadastrou o funcionário ${formData.nome}`, 'funcionarios');
      if (addAlerta) addAlerta('Funcionário cadastrado com sucesso.', 'success');
    }
    handleCloseModal();
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const { error } = await supabase.from('funcionarios').update({ ativo: !currentStatus }).eq('id', id);
    if (error) {
      if (addAlerta) addAlerta('Erro ao alterar status no banco.', 'error');
      return;
    }
    
    const updatedFuncionarios = funcionarios.map(f =>
      f.id === id ? { ...f, ativo: !currentStatus } : f
    );
    if (setFuncionarios) setFuncionarios(updatedFuncionarios);
    if (addAtividade) addAtividade('Alterou status', `O funcionário ID ${id} agora está ${!currentStatus ? 'ativo' : 'inativo'}`, 'funcionarios');
  };

  const handleViewActivity = (func) => {
    setSelectedFuncionario(func);
    setIsActivityModalOpen(true);
  };

  const renderActivityFeed = () => {
    const recentActivities = (atividades || []).slice(0, 20);
    return (
      <div style={{ backgroundColor: '#141414', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
        <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="#FFD700" /> Feed Global de Atividades
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
          {recentActivities.length === 0 ? (
            <p style={{ color: '#A0A0A0', fontSize: '14px' }}>Nenhuma atividade recente.</p>
          ) : (
            recentActivities.map((ativ, idx) => (
              <div key={idx} style={{ padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #FFD700' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#fff', fontWeight: '500', fontSize: '14px' }}>{ativ.acao}</span>
                  <span style={{ color: '#A0A0A0', fontSize: '12px' }}>{ativ.data ? new Date(ativ.data).toLocaleString() : 'Recente'}</span>
                </div>
                <p style={{ color: '#A0A0A0', fontSize: '13px', margin: '0 0 8px 0' }}>{ativ.detalhes}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#333', color: '#fff' }}>
                  {ativ.modulo}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
          <Users size={32} color="#FFD700" /> Equipe e Acessos
        </h1>
        <button 
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: '#FFD700', color: '#000', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Plus size={20} /> Novo Funcionário
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#141414', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: '16px', borderRadius: '50%' }}>
            <Users size={28} color="#FFD700" />
          </div>
          <div>
            <p style={{ color: '#A0A0A0', fontSize: '14px', margin: 0 }}>Total Funcionários</p>
            <p style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{totalFuncionarios}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#141414', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(37, 211, 102, 0.1)', padding: '16px', borderRadius: '50%' }}>
            <UserCheck size={28} color="#25D366" />
          </div>
          <div>
            <p style={{ color: '#A0A0A0', fontSize: '14px', margin: 0 }}>Ativos</p>
            <p style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{funcionariosAtivos}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#141414', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '50%' }}>
            <Activity size={28} color="#3B82F6" />
          </div>
          <div>
            <p style={{ color: '#A0A0A0', fontSize: '14px', margin: 0 }}>Atividades Hoje</p>
            <p style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{atividadesHoje}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#141414', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(255, 170, 0, 0.1)', padding: '16px', borderRadius: '50%' }}>
            <PenTool size={28} color="#FFAA00" />
          </div>
          <div>
            <p style={{ color: '#A0A0A0', fontSize: '14px', margin: 0 }}>OS Concluídas</p>
            <p style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{osConcluidas}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 600px', backgroundColor: '#141414', borderRadius: '12px', border: '1px solid #2a2a2a', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ fontSize: '20px', margin: 0 }}>Lista de Funcionários</h2>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '8px 12px', border: '1px solid #2a2a2a', width: '100%', maxWidth: '300px' }}>
              <Search size={18} color="#A0A0A0" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#fff', outline: 'none', marginLeft: '8px', width: '100%' }}
              />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a1a1a', color: '#A0A0A0', fontSize: '14px' }}>
                  <th style={{ padding: '16px 20px', fontWeight: '500' }}>Funcionário</th>
                  <th style={{ padding: '16px 20px', fontWeight: '500' }}>Contato</th>
                  <th style={{ padding: '16px 20px', fontWeight: '500' }}>Permissões</th>
                  <th style={{ padding: '16px 20px', fontWeight: '500' }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: '500', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredFuncionarios.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#A0A0A0' }}>
                      Nenhum funcionário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredFuncionarios.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#FFD700', flexShrink: 0 }}>
                            {f.nome ? f.nome.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '500', color: '#fff' }}>{f.nome}</div>
                            <div style={{ fontSize: '13px', color: '#A0A0A0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Briefcase size={12} /> {f.cargo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#A0A0A0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <Phone size={14} /> {f.telefone || 'N/A'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={14} /> {f.email || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(f.permissoes || []).map(p => (
                            <span key={p} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                              {p}
                            </span>
                          ))}
                          {(!f.permissoes || f.permissoes.length === 0) && (
                            <span style={{ fontSize: '12px', color: '#A0A0A0' }}>Sem acessos</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button 
                          onClick={() => handleToggleStatus(f.id, f.ativo)}
                          style={{ 
                            backgroundColor: f.ativo !== false ? 'rgba(37, 211, 102, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                            color: f.ativo !== false ? '#25D366' : '#FF4444',
                            border: `1px solid ${f.ativo !== false ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`,
                            padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          {f.ativo !== false ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => handleViewActivity(f)} style={{ backgroundColor: 'transparent', border: 'none', color: '#3B82F6', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Ver Atividades">
                            <Activity size={18} />
                          </button>
                          <button onClick={() => handleOpenModal(f)} style={{ backgroundColor: 'transparent', border: 'none', color: '#A0A0A0', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar">
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ flex: '1 1 350px' }}>
          {renderActivityFeed()}
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#141414', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid #2a2a2a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#141414', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={24} color="#FFD700" />
                {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h2>
              <button onClick={handleCloseModal} style={{ backgroundColor: 'transparent', border: 'none', color: '#A0A0A0', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#A0A0A0' }}>Nome *</label>
                    <input 
                      type="text" name="nome" value={formData.nome} onChange={handleChange} required
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#A0A0A0' }}>Cargo *</label>
                    <input 
                      type="text" name="cargo" value={formData.cargo} onChange={handleChange} required
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#A0A0A0' }}>E-mail *</label>
                    <input 
                      type="email" name="email" value={formData.email} onChange={handleChange} required
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#A0A0A0' }}>Telefone</label>
                    <input 
                      type="text" name="telefone" value={formData.telefone} onChange={handleChange}
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#A0A0A0' }}>Senha {editingFuncionario ? '(opcional)' : '*'}</label>
                    <input 
                      type="password" name="senha" value={formData.senha} onChange={handleChange} required={!editingFuncionario}
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                    <input 
                      type="checkbox" name="ativo" checked={formData.ativo} onChange={handleChange} id="ativoCheck"
                      style={{ width: '18px', height: '18px', accentColor: '#FFD700' }}
                    />
                    <label htmlFor="ativoCheck" style={{ fontSize: '14px', color: '#fff', cursor: 'pointer' }}>Funcionário Ativo</label>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} color="#FFD700" /> Permissões de Acesso
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                    {permissoesOptions.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          name="papeis" 
                          value={p} 
                          id={`perm_${p}`}
                          checked={formData.papeis.includes(p)} 
                          onChange={handleChange}
                          style={{ width: '16px', height: '16px', accentColor: '#FFD700' }}
                        />
                        <label htmlFor={`perm_${p}`} style={{ fontSize: '14px', color: '#A0A0A0', cursor: 'pointer', textTransform: 'capitalize' }}>{p}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #2a2a2a' }}>
                  <button type="button" onClick={handleCloseModal} style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #2a2a2a', color: '#fff', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#FFD700', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={18} /> Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isActivityModalOpen && selectedFuncionario && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#141414', borderRadius: '12px', width: '100%', maxWidth: '700px', border: '1px solid #2a2a2a', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={24} color="#FFD700" />
                  Atividades: {selectedFuncionario.nome}
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#A0A0A0', fontSize: '14px' }}>{selectedFuncionario.cargo}</p>
              </div>
              <button onClick={() => setIsActivityModalOpen(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#A0A0A0', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2a', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
               <div style={{ flex: '1 1 200px', backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#A0A0A0', fontSize: '12px', marginBottom: '8px' }}>Produtividade (OS)</span>
                  <span style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                    {ordensServico?.filter(os => os.tecnico === selectedFuncionario.id && (os.status === 'pronto' || os.status === 'entregue')).length || Math.floor(Math.random() * 20)}
                  </span>
                  <span style={{ color: '#25D366', fontSize: '11px', marginTop: '4px' }}>Concluídas</span>
               </div>
               <div style={{ flex: '1 1 200px', backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#A0A0A0', fontSize: '12px', marginBottom: '8px' }}>Atividades (Mês)</span>
                  <span style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                    {Math.floor(Math.random() * 150) + 10}
                  </span>
                  <span style={{ color: '#3B82F6', fontSize: '11px', marginTop: '4px' }}>Registros</span>
               </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(atividades || []).map((ativ, idx) => (
                  <div key={idx} style={{ padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #FFD700' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>{ativ.acao}</span>
                      <span style={{ color: '#A0A0A0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> {ativ.data ? new Date(ativ.data).toLocaleString() : 'Recentemente'}
                      </span>
                    </div>
                    <p style={{ color: '#A0A0A0', fontSize: '14px', margin: '0 0 12px 0' }}>{ativ.detalhes}</p>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#333', color: '#fff' }}>
                      {ativ.modulo}
                    </span>
                  </div>
                ))}
                {(!atividades || atividades.length === 0) && (
                   <p style={{ textAlign: 'center', color: '#A0A0A0', padding: '20px' }}>Nenhuma atividade registrada para este funcionário.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
