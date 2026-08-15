import ProfileModal from './ProfileModal'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth, useData } from '../App'
import {
  Monitor, Wrench, Package, DollarSign, Shield, Users,
  LogOut, Menu, X, Smartphone, Bell, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/balcao', label: 'Balcão', icon: Monitor, role: 'balcao' },
  { path: '/laboratorio', label: 'Laboratório', icon: Wrench, role: 'laboratorio' },
  { path: '/estoque', label: 'Estoque', icon: Package, role: 'estoque' },
  { path: '/financeiro', label: 'Financeiro', icon: DollarSign, role: 'financeiro' },
  { path: '/garantias', label: 'Garantias', icon: Shield, role: 'garantias' },
  { path: '/funcionarios', label: 'Funcionários', icon: Users, role: 'funcionarios' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { alertas, ordensServico } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const allowedNav = NAV_ITEMS.filter(item => user.papeis.includes(item.role))

  // Count alerts for balcao (OS marked as "pronto")
  const prontoCount = ordensServico.filter(os => os.status === 'pronto').length

  const handleNav = (path) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const currentPage = NAV_ITEMS.find(item => item.path === location.pathname)

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Smartphone size={20} />
          </div>
          <h1>CELL EXPRESS</h1>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-title">Módulos</span>
          {allowedNav.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.role === 'balcao' && prontoCount > 0 && (
                  <span className="badge">{prontoCount}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">
            {user.nome.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{user.nome}</div>
            <div className="user-role">{user.cargo}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-icon"
              onClick={() => setIsProfileModalOpen(true)}
              title="Editar Perfil"
              style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button
              className="btn-icon"
              onClick={() => { logout(); navigate('/'); }}
              title="Sair"
              style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="app-main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="topbar-title">
              <h2>{currentPage?.label || 'Cell Express'}</h2>
              <p>Sistema de Gestão</p>
            </div>
          </div>

          {/* Multi-role tabs on topbar */}
          {allowedNav.length > 1 && (
            <div className="topbar-tabs">
              {allowedNav.map(item => (
                <button
                  key={item.path}
                  className={`topbar-tab ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => handleNav(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="topbar-right">
            {prontoCount > 0 && user.papeis.includes('balcao') && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleNav('/balcao')}
                style={{ animation: 'pulse 2s infinite' }}
              >
                <Bell size={14} />
                {prontoCount} pronto{prontoCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </header>

        {/* Toast notifications */}
        {alertas.length > 0 && (
          <div className="toast-container">
            {alertas.map(a => (
              <div key={a.id} className={`toast ${a.tipo}`}>
                {a.tipo === 'success' && <Bell size={16} style={{ color: 'var(--success)' }} />}
                {a.tipo === 'error' && <X size={16} style={{ color: 'var(--danger)' }} />}
                {a.tipo === 'warning' && <Bell size={16} style={{ color: 'var(--warning)' }} />}
                <span style={{ fontSize: '0.85rem' }}>{a.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Page content */}
        <div className="app-content">
          {children}
        </div>
        {/* Modal de Perfil */}
        <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      </div>
    </div>
  )
}
