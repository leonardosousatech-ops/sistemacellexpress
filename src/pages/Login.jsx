import { useState } from 'react'
import { useAuth } from '../App'
import { Smartphone, Eye, EyeOff, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'

// Official Google Multi-Color SVG Icon
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

export default function Login() {
  const { login, loginWithGoogle, signUp } = useAuth()
  
  // 'login' or 'signup'
  const [mode, setMode] = useState('login')
  
  // Form fields
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [showPass, setShowPass] = useState(false)
  
  // States
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  const handleGoogleLogin = async () => {
    setError('')
    setSuccessMsg('')
    setLoadingGoogle(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      console.error('Google login error:', err)
      setError(err?.message || 'Erro ao conectar com a conta Google. Tente novamente.')
      setLoadingGoogle(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (mode === 'signup') {
      if (!nome.trim()) {
        setError('Por favor, informe seu nome completo.')
        return
      }
      if (senha.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.')
        return
      }
      if (senha !== confirmSenha) {
        setError('As senhas não coincidem.')
        return
      }

      setLoading(true)
      try {
        const res = await signUp(nome.trim(), email.trim(), senha)
        if (res?.user && !res?.session) {
          setSuccessMsg('Conta criada com sucesso! Verifique seu email para confirmar o acesso ou entre na sua conta.')
          setMode('login')
        } else {
          setSuccessMsg('Conta criada com sucesso! Entrando...')
        }
      } catch (err) {
        console.error('Sign up error:', err)
        setError(err?.message || 'Erro ao criar conta. Verifique os dados e tente novamente.')
      } finally {
        setLoading(false)
      }

    } else {
      // Login mode
      setLoading(true)
      const res = await login(email.trim(), senha)
      if (!res?.success) {
        setError(res?.error || 'Email ou senha incorretos.')
        setLoading(false)
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0a0a0a)',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow effect */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '430px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            background: 'var(--accent-yellow, #FFD700)',
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 35px rgba(255,215,0,0.3)'
          }}>
            <Smartphone size={34} color="#000" />
          </div>
          <h1 style={{
            fontSize: '1.7rem',
            fontWeight: '800',
            color: 'var(--accent-yellow, #FFD700)',
            letterSpacing: '-0.5px',
            margin: '0 0 4px 0'
          }}>
            CELL EXPRESS
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted, #888)',
            margin: 0
          }}>
            Sistema de Gestão
          </p>
        </div>

        {/* Login / SignUp Card */}
        <div style={{
          background: 'var(--bg-card, #141414)',
          border: '1px solid var(--border, #2a2a2a)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {/* Mode Switch Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-primary, #0a0a0a)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border, #2a2a2a)',
            marginBottom: '22px'
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'login' ? 'var(--accent-yellow, #FFD700)' : 'transparent',
                color: mode === 'login' ? '#000' : 'var(--text-secondary, #A0A0A0)',
                fontWeight: mode === 'login' ? '700' : '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <LogIn size={16} /> Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'signup' ? 'var(--accent-yellow, #FFD700)' : 'transparent',
                color: mode === 'signup' ? '#000' : 'var(--text-secondary, #A0A0A0)',
                fontWeight: mode === 'signup' ? '700' : '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <UserPlus size={16} /> Criar Conta
            </button>
          </div>

          {/* Card Title & Subtitle */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 6px 0', color: '#fff' }}>
              {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #888)', margin: 0 }}>
              {mode === 'login' ? 'Faça login para acessar o sistema' : 'Preencha seus dados para cadastrar seu usuário'}
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 68, 68, 0.12)',
              border: '1px solid #FF4444',
              color: '#FF4444',
              fontSize: '0.85rem',
              marginBottom: '18px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(37, 211, 102, 0.12)',
              border: '1px solid #25D366',
              color: '#25D366',
              fontSize: '0.85rem',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              backgroundColor: '#ffffff',
              color: '#1f1f1f',
              border: '1px solid #e0e0e0',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '0.92rem',
              fontWeight: '600',
              cursor: loadingGoogle ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              opacity: loadingGoogle ? 0.7 : 1
            }}
            onMouseOver={e => !loadingGoogle && (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseOut={e => !loadingGoogle && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loadingGoogle ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                Conectando ao Google...
              </span>
            ) : (
              <>
                <GoogleIcon />
                <span>Continuar com o Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border, #2a2a2a)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #777)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ou com email
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border, #2a2a2a)' }} />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary, #e0e0e0)' }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Leonardo Silva"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary, #e0e0e0)' }}>
                Email
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: mode === 'signup' ? '16px' : '22px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary, #e0e0e0)' }}>
                Senha {mode === 'signup' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #777)' }}>(mínimo 6 dígitos)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 42px 12px 12px', borderRadius: '8px' }}
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
                    color: 'var(--text-muted, #777)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary, #e0e0e0)' }}>
                  Confirmar Senha
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={confirmSenha}
                  onChange={e => setConfirmSenha(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || loadingGoogle}
              style={{
                width: '100%',
                backgroundColor: 'var(--accent-yellow, #FFD700)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                padding: '13px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.15s, opacity 0.15s',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                  {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </span>
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {mode === 'login' ? 'Entrar no Sistema' : 'Criar Minha Conta'}
                </>
              )}
            </button>
          </form>

          {/* Footer toggle link */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            {mode === 'login' ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #A0A0A0)' }}>
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-yellow, #FFD700)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.85rem',
                    textDecoration: 'underline'
                  }}
                >
                  Cadastre-se
                </button>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #A0A0A0)' }}>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-yellow, #FFD700)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.85rem',
                    textDecoration: 'underline'
                  }}
                >
                  Fazer Login
                </button>
              </p>
            )}
          </div>
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
