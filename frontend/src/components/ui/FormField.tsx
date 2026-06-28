import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface FieldProps {
  label: string
  error?: string
  required?: boolean
}

interface InputFieldProps extends FieldProps, InputHTMLAttributes<HTMLInputElement> {}
interface TextareaFieldProps extends FieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}
interface SelectFieldProps extends FieldProps, SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
  placeholder?: string
}

const baseInput = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors'

export function InputField({ label, error, required, className, ...props }: InputFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        className={clsx(baseInput, error ? 'border-red-400' : 'border-gray-300', className)}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function TextareaField({ label, error, required, className, ...props }: TextareaFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea
        rows={3}
        {...props}
        className={clsx(baseInput, 'resize-none', error ? 'border-red-400' : 'border-gray-300', className)}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function SelectField({ label, error, required, options, placeholder, className, ...props }: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        {...props}
        className={clsx(baseInput, 'bg-white', error ? 'border-red-400' : 'border-gray-300', className)}
      >
        <option value="">{placeholder ?? 'Seleccionar...'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
