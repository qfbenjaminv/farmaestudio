import { render, screen } from '@testing-library/react'
import { EmptyState, ErrorState, LoadingState } from './FeedbackStates'

describe('estados de retroalimentación', () => {
  it('anuncia la carga a tecnologías de asistencia', () => {
    render(<LoadingState label="Cargando módulos" />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando módulos')
  })

  it('ofrece una acción de recuperación en el estado de error', () => {
    render(<ErrorState title="No fue posible cargar" actionLabel="Reintentar" onAction={() => undefined} />)

    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible cargar')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  })

  it('describe un resultado vacío con un encabezado visible', () => {
    render(<EmptyState title="Sin resultados" description="Prueba otra búsqueda." />)

    expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeVisible()
  })
})
