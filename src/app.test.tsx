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

  it('expone la navegación de secciones en el menú compacto', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /abrir navegación/i }))

    expect(screen.getByRole('navigation', { name: /secciones principales/i })).toBeVisible()
    expect(within(screen.getByRole('navigation', { name: /secciones principales/i })).getByRole('link', { name: 'Biblioteca' })).toBeVisible()
  })
})
