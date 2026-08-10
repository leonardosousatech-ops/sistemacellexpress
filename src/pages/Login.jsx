import { useState } from 'react'
import { useAuth } from '../App'
import { Smartphone, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      const user = login(email, senha)
      if (!user) {
        setError('Email ou senha incorretos')
      }
      setLoading(false)
    }, 600)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow effect */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            background: 'var(--accent-yellow)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(255,215,0,0.25)'
          }}>
            <Smartphone size={34} color="#000" />
          </div>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: 'var(--accent-yellow)',
            letterSpacing: '-0.5px',
            marginBottom: '6px'
          }}>
            CELL EXPRESS
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            Sistema de Gestão
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
        }}>
          <h2 style={{
            fontSize: '1.15rem',
            fontWeight: '700',
            marginBottom: '6px'
          }}>
            Entrar
          </h2>
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '24px'
          }}>
            Faça login para acessar o sistema
          </p>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '12px',
                fontSize: '0.9rem'
              }}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                  Entrando...
                </span>
              ) : (
                <>
                  <LogIn size={16} />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div style={{
          marginTop: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
        }}>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px'
          }}>
            Contas de demonstração
          </p>
          <div style={{ padding: '20px', borderTop: '1px solid var(--border-color, #2a2a2a)', backgroundColor: 'var(--bg-primary, #0a0a0a)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                CONTA ADMINISTRATIVA
              </p>
              
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>admin@cellexpress.com</span>
                    <span style={{ color: 'var(--text-secondary, #A0A0A0)', fontSize: '11px' }}>Gerente (Acesso Total)</span>
                  </div>
                  <span style={{ color: 'var(--accent-color, #FFD700)', fontWeight: 'bold' }}>senha: 123</span>
                </div>
              </div>
            </div>         
          {[
            { email: 'leo@cellexpress.com', cargo: 'Gerente (Acesso Total)' },
            { email: 'ana@cellexpress.com', cargo: 'Atendente (Balcão)' },
            { email: 'carlos@cellexpress.com', cargo: 'Técnico (Laboratório)' },
            { email: 'marcos@cellexpress.com', cargo: 'Estoquista (Estoque)' },
            { email: 'julia@cellexpress.com', cargo: 'Financeiro' },
          ].map(demo => (
            <button
              key={demo.email}
              onClick={() => { setEmail(demo.email); setSenha('123'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                textAlign: 'left',
                transition: 'background 150ms ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <div>
                <span style={{ fontWeight: '600' }}>{demo.email}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.75rem' }}>
                  {demo.cargo}
                </span>
              </div>
              <span style={{ color: 'var(--accent-yellow)', fontSize: '0.7rem', fontWeight: '600' }}>
                senha: 123
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
