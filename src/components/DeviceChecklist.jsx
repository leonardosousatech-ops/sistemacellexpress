import React from 'react';
import { 
  Wifi, Camera, Volume2, Mic, Zap, Smartphone, 
  Fingerprint, Power, Check, X, HelpCircle, ShieldAlert 
} from 'lucide-react';

export const CHECKLIST_ITEMS = [
  { key: 'wifi', label: 'Wi-Fi & Rede', icon: Wifi },
  { key: 'cameras', label: 'Câmeras (F/T)', icon: Camera },
  { key: 'alto_falante', label: 'Alto-falante / Som', icon: Volume2 },
  { key: 'microfone', label: 'Microfone', icon: Mic },
  { key: 'carregamento', label: 'Conector / Carga', icon: Zap },
  { key: 'touch', label: 'Tela / Touch', icon: Smartphone },
  { key: 'biometria', label: 'Biometria / Face ID', icon: Fingerprint },
  { key: 'botoes', label: 'Botões Físicos', icon: Power }
];

export default function DeviceChecklist({ value = {}, onChange, readOnly = false, senha = '', onSenhaChange }) {
  const currentChecklist = value || {};

  const handleToggle = (key, state) => {
    if (readOnly || !onChange) return;
    onChange({
      ...currentChecklist,
      [key]: currentChecklist[key] === state ? undefined : state
    });
  };

  const handleSetAll = (state) => {
    if (readOnly || !onChange) return;
    const updated = {};
    CHECKLIST_ITEMS.forEach(item => {
      updated[item.key] = state;
    });
    onChange(updated);
  };

  return (
    <div style={{ backgroundColor: '#141414', border: '1px solid var(--border, #2a2a2a)', borderRadius: '12px', padding: '16px' }}>
      {/* Header and Quick Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} color="var(--accent-yellow, #FFD700)" /> Checklist de Teste do Aparelho
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary, #A0A0A0)' }}>
            Inspeção de entrada/saída para evitar reclamações
          </span>
        </div>

        {!readOnly && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleSetAll('ok')}
              style={{
                backgroundColor: 'rgba(37, 211, 102, 0.15)',
                color: '#25D366',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Marcar Todos OK
            </button>
            <button
              type="button"
              onClick={() => handleSetAll('nao_liga')}
              style={{
                backgroundColor: 'rgba(255, 68, 68, 0.15)',
                color: '#FF4444',
                border: '1px solid rgba(255, 68, 68, 0.3)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Aparelho Não Liga
            </button>
          </div>
        )}
      </div>

      {/* Password / Pattern field */}
      {(onSenhaChange || senha) && (
        <div style={{ marginBottom: '14px', backgroundColor: '#1a1a1a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-yellow, #FFD700)' }}>
            🔑 Senha / PIN do Aparelho:
          </label>
          {!readOnly && onSenhaChange ? (
            <input 
              type="text" 
              placeholder="Ex: 1234 ou Padrão em L (opcional)" 
              value={senha} 
              onChange={e => onSenhaChange(e.target.value)}
              className="form-input"
              style={{ flex: 1, minWidth: '180px', padding: '6px 10px', fontSize: '13px' }}
            />
          ) : (
            <span style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>{senha || 'Não informada'}</span>
          )}
        </div>
      )}

      {/* Checklist Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        {CHECKLIST_ITEMS.map(item => {
          const status = currentChecklist[item.key];
          const Icon = item.icon;

          const isOk = status === 'ok';
          const isDefeito = status === 'defeito';
          const isNaoLiga = status === 'nao_liga';

          let bg = '#1a1a1a';
          let border = '1px solid var(--border, #2a2a2a)';
          let color = 'var(--text-secondary, #A0A0A0)';

          if (isOk) {
            bg = 'rgba(37, 211, 102, 0.12)';
            border = '1px solid #25D366';
            color = '#25D366';
          } else if (isDefeito) {
            bg = 'rgba(255, 68, 68, 0.12)';
            border = '1px solid #FF4444';
            color = '#FF4444';
          } else if (isNaoLiga) {
            bg = 'rgba(255, 170, 0, 0.12)';
            border = '1px solid #FFAA00';
            color = '#FFAA00';
          }

          return (
            <div
              key={item.key}
              style={{
                backgroundColor: bg,
                border: border,
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: color, fontSize: '12px', fontWeight: '600' }}>
                <Icon size={14} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              </div>

              {!readOnly ? (
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key, 'ok')}
                    title="Funcionando"
                    style={{
                      flex: 1,
                      backgroundColor: isOk ? '#25D366' : '#262626',
                      color: isOk ? '#000' : '#888',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key, 'defeito')}
                    title="Com Defeito"
                    style={{
                      flex: 1,
                      backgroundColor: isDefeito ? '#FF4444' : '#262626',
                      color: isDefeito ? '#fff' : '#888',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key, 'nao_liga')}
                    title="Não testado / Não liga"
                    style={{
                      flex: 1,
                      backgroundColor: isNaoLiga ? '#FFAA00' : '#262626',
                      color: isNaoLiga ? '#000' : '#888',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <HelpCircle size={12} />
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '11px', fontWeight: '700', color: color }}>
                  {isOk ? '✅ OK' : isDefeito ? '❌ Defeito' : isNaoLiga ? '⚪ Não Testado' : '—'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
