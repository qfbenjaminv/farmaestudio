import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react'
import { Button } from '../ui/Button'

export function LoadingState({ label }: { label: string }) {
  return <div className="feedback-state loading-state" role="status"><LoaderCircle aria-hidden="true" size={24} /><span>{label}</span></div>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="feedback-state empty-state"><Inbox aria-hidden="true" size={25} /><h2>{title}</h2><p>{description}</p></div>
}

export function ErrorState({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return <div className="feedback-state error-state" role="alert"><AlertTriangle aria-hidden="true" size={25} /><h2>{title}</h2><p>Revisa tu conexión e inténtalo de nuevo.</p><Button variant="secondary" onClick={onAction}>{actionLabel}</Button></div>
}
