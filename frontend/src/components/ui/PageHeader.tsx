import { type LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  count?: number
  color?: string
  onNew?: () => void
  newLabel?: string
  newColor?: string
}

export default function PageHeader({
  icon: Icon, title, count, color = 'text-indigo-600',
  onNew, newLabel = 'Nuevo', newColor = 'bg-indigo-600 hover:bg-indigo-700',
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={20} className={color} />
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {count !== undefined && (
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {onNew && (
        <button
          onClick={onNew}
          className={`flex items-center gap-1.5 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors ${newColor}`}
        >
          <Plus size={16} /> {newLabel}
        </button>
      )}
    </div>
  )
}
