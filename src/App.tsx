import { useState } from 'react'
import { AlertCircle, ArrowRight, BookOpen, Menu, X } from 'lucide-react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from './components/feedback/FeedbackStates'
import { Button } from './components/ui/Button'

const sections = [
  { to: '/inicio', label: 'Inicio', code: '00' },
  { to: '/biblioteca', label: 'Biblioteca', code: 'REF' },
  { to: '/mi-progreso', label: 'Mi progreso', code: 'PRO' },
]

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <header className="site-header">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="header-inner">
        <Link className="wordmark" to="/" aria-label="FarmaEstudio, inicio">
          <span className="wordmark-mark">FE</span>
          <span>FarmaEstudio</span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
          <span>{isMenuOpen ? 'Cerrar navegación' : 'Abrir navegación'}</span>
        </button>
        <nav
          id="primary-navigation"
          className={`primary-nav ${isMenuOpen ? 'is-open' : ''}`}
          aria-label="Secciones principales"
        >
          {sections.map((section) => (
            <NavLink
              className="nav-link"
              key={section.to}
              to={section.to}
              aria-current={location.pathname === section.to ? 'page' : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              <span aria-hidden="true">{section.code}</span>{section.label}
            </NavLink>
          ))}
          <Link className="nav-access" to="/acceso" onClick={() => setIsMenuOpen(false)}>Iniciar sesión</Link>
        </nav>
      </div>
    </header>
  )
}

function EditorialMargin({ code, label }: { code: string; label: string }) {
  return <aside className="editorial-margin" aria-label={`${code}: ${label}`}><span>{code}</span><i /><small>{label}</small></aside>
}

function LandingPage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <EditorialMargin code="01" label="Estudio clínico" />
        <div className="hero-copy">
          <p className="eyebrow">Farmacología · colección de estudio</p>
          <h1 id="hero-title">Aprende fármacos con <em>criterio</em>, no de memoria.</h1>
          <p className="lede">Una biblioteca curada y sesiones de práctica para vincular mecanismo, indicación y seguridad.</p>
          <div className="hero-actions">
            <Button asChild><Link to="/acceso">Iniciar sesión <ArrowRight size={17} aria-hidden="true" /></Link></Button>
            <Link className="text-link" to="/biblioteca">Explorar biblioteca</Link>
          </div>
        </div>
        <dl className="monograph-summary">
          <div><dt>Método</dt><dd>Práctica espaciada</dd></div>
          <div><dt>Enfoque</dt><dd>Uso clínico razonado</dd></div>
          <div><dt>Formato</dt><dd>11 módulos esenciales</dd></div>
        </dl>
      </section>
      <section className="principles" aria-labelledby="principles-title">
        <EditorialMargin code="02" label="Principios" />
        <div>
          <p className="eyebrow">Una herramienta, tres preguntas</p>
          <h2 id="principles-title">Lo que importa antes de indicar.</h2>
        </div>
        <ol>
          <li><span>01</span><strong>¿Qué modifica?</strong><p>Comprende el blanco farmacológico antes de elegir la respuesta.</p></li>
          <li><span>02</span><strong>¿Para quién?</strong><p>Relaciona la indicación con el contexto de cada paciente.</p></li>
          <li><span>03</span><strong>¿Qué vigilar?</strong><p>Incorpora efectos adversos e interacciones en cada decisión.</p></li>
        </ol>
      </section>
    </>
  )
}

function AccessPage() {
  return (
    <section className="auth-page" aria-labelledby="access-title">
      <EditorialMargin code="AC" label="Acceso" />
      <div className="auth-card">
        <p className="eyebrow">Sesión de estudio</p>
        <h1 id="access-title">Acceso a FarmaEstudio</h1>
        <p>Ingresa con tu cuenta de Google para conservar tu avance entre sesiones.</p>
        <Button type="button" variant="primary" disabled aria-describedby="google-access-unavailable"><span className="google-mark" aria-hidden="true">G</span>Continuar con Google</Button>
        <p id="google-access-unavailable" className="small-print">La conexión con Google aún no está disponible en esta versión.</p>
      </div>
    </section>
  )
}

function StudyPlaceholder({ title, code }: { title: string; code: string }) {
  return (
    <section className="content-page" aria-labelledby="page-title">
      <EditorialMargin code={code} label="En preparación" />
      <p className="eyebrow">Área de estudio</p>
      <h1 id="page-title">{title}</h1>
      <EmptyState title="Aún no hay contenido disponible" description="Esta sección se habilitará con el material de estudio." />
    </section>
  )
}

function StateGallery() {
  const [isRetrying, setIsRetrying] = useState(false)

  return (
    <section className="content-page" aria-labelledby="states-title">
      <EditorialMargin code="EST" label="Estados" />
      <p className="eyebrow">Estados del sistema</p>
      <h1 id="states-title">Referencia de interfaz</h1>
      <div className="state-grid">
        <LoadingState label="Cargando módulos" />
        {isRetrying
          ? <LoadingState label="Recuperando módulos" />
          : <ErrorState title="No fue posible cargar" actionLabel="Reintentar" onAction={() => setIsRetrying(true)} />}
      </div>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section className="content-page" aria-labelledby="not-found-title">
      <AlertCircle aria-hidden="true" className="page-icon" />
      <p className="eyebrow">Error 404</p>
      <h1 id="not-found-title">No encontramos esa página.</h1>
      <Link className="text-link" to="/">Volver al inicio</Link>
    </section>
  )
}

function Footer() {
  return <footer className="site-footer"><BookOpen aria-hidden="true" size={16} /><span>FarmaEstudio · material de apoyo para el estudio.</span></footer>
}

export function App() {
  return (
    <div className="app-shell">
      <Header />
      <main id="contenido" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/acceso" element={<AccessPage />} />
          <Route path="/inicio" element={<StudyPlaceholder title="Tu estudio" code="00" />} />
          <Route path="/biblioteca" element={<StudyPlaceholder title="Biblioteca farmacológica" code="REF" />} />
          <Route path="/mi-progreso" element={<StudyPlaceholder title="Mi progreso" code="PRO" />} />
          <Route path="/estados" element={<StateGallery />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
