import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('navegación pública', () => {
  it('lleva de la portada al acceso desde el enlace principal', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: /iniciar sesión/i }))

    expect(screen.getByRole('heading', { name: /acceso a farmaestudio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continuar con google/i })).toBeInTheDocument()
  })

  it('renderiza el CTA principal como enlace con el estilo de botón', () => {
    renderApp()

    const cta = within(screen.getByRole('main')).getByRole('link', { name: /iniciar sesión/i })
    expect(cta).toHaveClass('button', 'button-primary')
    expect(cta).not.toHaveAttribute('tabindex', '-1')
  })

  it('explica que el acceso con Google todavía no está disponible', () => {
    renderApp('/acceso')

    const accessButton = screen.getByRole('button', { name: /continuar con google/i })
    expect(accessButton).toBeDisabled()
    expect(accessButton).toHaveAccessibleDescription(/conexión con google aún no está disponible/i)
  })

  it('expone la navegación de secciones en el menú compacto', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /abrir navegación/i }))

    expect(screen.getByRole('navigation', { name: /secciones principales/i })).toBeVisible()
    expect(within(screen.getByRole('navigation', { name: /secciones principales/i })).getByRole('link', { name: 'Biblioteca' })).toBeVisible()
  })

  it('cambia el estado de error a recuperación al reintentar', async () => {
    const user = userEvent.setup()
    renderApp('/estados')

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Recuperando módulos').closest('[role="status"]')).toBeInTheDocument()
  })
})
