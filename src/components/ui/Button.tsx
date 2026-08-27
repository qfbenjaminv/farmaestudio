import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  asChild?: boolean
}

export function Button({ children, variant = 'primary', asChild = false, className = '', ...props }: ButtonProps) {
  const classes = `button button-${variant} ${className}`.trim()
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>
    return cloneElement(child, { className: `${classes} ${child.props.className ?? ''}`.trim() })
  }
  return <button className={classes} {...props}>{children}</button>
}
