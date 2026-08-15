import React, { useState } from 'react';
import { X, Save, User } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth, useData } from '../App';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, setUser } = useAuth();
  const { addAlerta, funcionarios, setFuncionarios } = useData();
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    senha: user?.senha || '',
    telefone: user?.telefone || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .update({
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          telefone: formData.telefone
        })
        .eq('id', user.id)
        .select();

      if (error) throw error;

      // Update local state
      const updatedUser = { ...user, ...formData };
      setUser(updatedUser);
      
      if (funcionarios && setFuncionarios) {
        setFuncionarios(funcionarios.map(f => f.id === user.id ? updatedUser : f));
      }

      if (addAlerta) addAlerta('Perfil atualizado com sucesso!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      if (addAlerta) addAlerta('Erro ao atualizar perfil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-elevated, #1a1a1a)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '450px',
        border: '1px solid var(--border-color, #2a2a2a)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color, #2a2a2a)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--accent-color, #FFD700)" />
            Editar Meu Perfil
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#A0A0A0', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#A0A0A0' }}>Nome Completo</label>
              <input 
                required type="text" name="nome" value={formData.nome} onChange={handleChange}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#141414', color: '#fff', outline: 'none' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#A0A0A0' }}>Email de Acesso</label>
              <input 
                required type="email" name="email" value={formData.email} onChange={handleChange}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#141414', color: '#fff', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#A0A0A0' }}>Nova Senha</label>
              <input 
                required type="password" name="senha" value={formData.senha} onChange={handleChange}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#141414', color: '#fff', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#A0A0A0' }}>Telefone</label>
              <input 
                type="text" name="telefone" value={formData.telefone} onChange={handleChange}
                placeholder="(00) 00000-0000"
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#141414', color: '#fff', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'var(--accent-color, #FFD700)', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
