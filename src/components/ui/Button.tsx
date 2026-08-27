import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  asChild?: boolean
}

export function Button({ children, variant = 'primary', asChild = false, className = '', ...props }: ButtonProps) {
  const classes = `button button-${variant} ${className}`.trim()
  if (asChild) return <span className={classes}>{children}</span>
  return <button className={classes} {...props}>{children}</button>
}
