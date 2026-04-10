import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export default function Card({ id, name, origin, disabled = false, source = 'pool' }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type: 'card', source },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={`rounded-lg border px-3 py-2 text-sm shadow-sm transition ${
        disabled
          ? 'cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500'
          : 'cursor-grab border-slate-600 bg-slate-800 text-slate-100 hover:border-indigo-400'
      } ${isDragging ? 'opacity-60' : ''}`}
    >
      <p className="font-medium">{name}</p>
      <p className="mt-1 text-xs text-slate-400">{origin}</p>
    </div>
  );
}
