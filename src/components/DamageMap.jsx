import React, { useState } from 'react';
import { X } from 'lucide-react';

export const DAMAGE_TYPES = [
  { id: 'trincado', label: 'Trincado / Quebrado', color: '#FF4444' },
  { id: 'risco', label: 'Risco / Arranhão', color: '#FFD700' },
  { id: 'amassado', label: 'Amassado / Desgaste', color: '#3B82F6' },
  { id: 'mancha', label: 'Mancha / Oxidação', color: '#FFFFFF' }
];

export default function DamageMap({ markers = [], onChange, readOnly = false }) {
  const [selectedType, setSelectedType] = useState(DAMAGE_TYPES[0]);

  const handleMapClick = (e, view) => {
    if (readOnly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newMarker = {
      id: Date.now().toString(),
      view,
      x,
      y,
      type: selectedType.id,
      color: selectedType.color
    };
    onChange([...markers, newMarker]);
  };

  const handleRemoveMarker = (e, id) => {
    e.stopPropagation();
    if (readOnly || !onChange) return;
    onChange(markers.filter(m => m.id !== id));
  };

  const renderMarkers = (view) => {
    return markers.filter(m => m.view === view).map(m => (
      <div
        key={m.id}
        onClick={(e) => handleRemoveMarker(e, m.id)}
        style={{
          position: 'absolute',
          left: `${m.x}%`,
          top: `${m.y}%`,
          transform: 'translate(-50%, -50%)',
          width: '14px',
          height: '14px',
          backgroundColor: m.color,
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: readOnly ? 'default' : 'pointer',
          boxShadow: `0 0 8px ${m.color}`,
          zIndex: 10
        }}
        title={DAMAGE_TYPES.find(d => d.id === m.type)?.label}
      >
        {!readOnly && <X size={10} color="#000" />}
      </div>
    ));
  };

  return (
    <div style={{ padding: '15px', backgroundColor: 'var(--card-bg, #141414)', borderRadius: '8px', border: '1px solid var(--border-color, #2a2a2a)' }}>
      {/* Selector */}
      {!readOnly && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)' }}>
            Tipo de Avaria (Selecione e clique no aparelho abaixo para marcar):
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {DAMAGE_TYPES.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: selectedType.id === type.id ? 'var(--bg-primary, #0a0a0a)' : 'transparent',
                  border: `1px solid ${selectedType.id === type.id ? type.color : 'var(--border-color, #2a2a2a)'}`,
                  borderRadius: '20px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: '0.2s'
                }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: type.color, boxShadow: `0 0 5px ${type.color}` }} />
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map Area */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Front */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)' }}>Frente / Tela</span>
          <div 
            onClick={(e) => handleMapClick(e, 'front')}
            style={{ position: 'relative', width: '120px', height: '240px', backgroundColor: '#0a0a0a', border: '2px solid var(--border-color, #2a2a2a)', borderRadius: '20px', cursor: readOnly ? 'default' : 'crosshair', overflow: 'hidden' }}
          >
            {/* Screen Inner Border */}
            <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px', border: '1px solid #1f1f1f', borderRadius: '16px' }} />
            {/* Notch / Dynamic Island */}
            <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '12px', backgroundColor: '#000', borderRadius: '6px', border: '1px solid #1f1f1f' }} />
            {renderMarkers('front')}
          </div>
        </div>

        {/* Back */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)' }}>Traseira / Tampa</span>
          <div 
            onClick={(e) => handleMapClick(e, 'back')}
            style={{ position: 'relative', width: '120px', height: '240px', backgroundColor: '#0a0a0a', border: '2px solid var(--border-color, #2a2a2a)', borderRadius: '20px', cursor: readOnly ? 'default' : 'crosshair', overflow: 'hidden' }}
          >
            {/* Camera Module */}
            <div style={{ position: 'absolute', top: '12px', left: '12px', width: '35px', height: '40px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
               <div style={{ position: 'absolute', top: '5px', left: '5px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#000' }} />
               <div style={{ position: 'absolute', bottom: '5px', left: '5px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#000' }} />
            </div>
            {renderMarkers('back')}
          </div>
        </div>

        {/* Sides */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)' }}>Laterais / Chassi</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div 
              onClick={(e) => handleMapClick(e, 'left-side')}
              style={{ position: 'relative', width: '20px', height: '230px', backgroundColor: '#0a0a0a', border: '2px solid var(--border-color, #2a2a2a)', borderRadius: '10px', cursor: readOnly ? 'default' : 'crosshair' }}
            >
              {renderMarkers('left-side')}
            </div>
            <div 
              onClick={(e) => handleMapClick(e, 'right-side')}
              style={{ position: 'relative', width: '20px', height: '230px', backgroundColor: '#0a0a0a', border: '2px solid var(--border-color, #2a2a2a)', borderRadius: '10px', cursor: readOnly ? 'default' : 'crosshair' }}
            >
              {renderMarkers('right-side')}
            </div>
          </div>
        </div>

      </div>

      {readOnly && (!markers || markers.length === 0) && (
        <div style={{ textAlign: 'center', marginTop: '15px', color: 'var(--text-muted)' }}>
          Nenhuma avaria registrada.
        </div>
      )}
    </div>
  );
}
