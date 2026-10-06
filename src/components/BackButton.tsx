import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ label }: { label?: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
      className="inline-flex items-center gap-2 py-1 text-[15px] font-semibold text-ink active:opacity-70"
    >
      <ArrowLeft className="size-6" />
      {label}
    </button>
  )
}
