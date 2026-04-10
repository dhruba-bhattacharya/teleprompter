import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export default function TextBlock({ block, onChange, onRemove }) {
  const { setNodeRef, listeners, attributes, transform } = useDraggable({
    id: `text:${block.id}`,
    data: { type: 'text', blockId: block.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ left: block.x, top: block.y, transform: CSS.Translate.toString(transform) }}
      className="absolute w-64 rounded-lg border border-amber-300/40 bg-amber-100/90 p-2 text-slate-900 shadow"
    >
      <div className="mb-1 flex items-center justify-between text-xs">
        <button {...listeners} {...attributes} className="cursor-move rounded bg-amber-300 px-2 py-0.5 font-medium">
          Drag
        </button>
        <button onClick={() => onRemove(block.id)} className="text-rose-700 hover:text-rose-900">
          Delete
        </button>
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(block.id, e.currentTarget.textContent || '')}
        className="min-h-10 rounded border border-amber-400 bg-white p-2 text-sm outline-none"
      >
        {block.text}
      </div>
    </div>
  );
}
