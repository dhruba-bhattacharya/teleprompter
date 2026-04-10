import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Card from './Card';

export default function Group({ group, cards, onRemove }) {
  const drag = useDraggable({ id: `group:${group.id}`, data: { type: 'group' } });
  const drop = useDroppable({ id: `group-drop:${group.id}`, data: { type: 'group-drop', groupId: group.id } });

  return (
    <section
      ref={drag.setNodeRef}
      style={{ transform: CSS.Translate.toString(drag.transform), left: group.x, top: group.y }}
      className="absolute w-72 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl"
    >
      <header
        {...drag.listeners}
        {...drag.attributes}
        className="mb-3 flex cursor-move items-center justify-between rounded-md bg-slate-800 px-2 py-1"
      >
        <h3 className="text-sm font-semibold text-slate-100">{group.title}</h3>
        <button onClick={() => onRemove(group.id)} className="text-xs text-rose-300 hover:text-rose-200">
          Remove
        </button>
      </header>
      <div
        ref={drop.setNodeRef}
        className={`min-h-24 space-y-2 rounded-md border border-dashed p-2 ${
          drop.isOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600'
        }`}
      >
        {group.cardIds.map((instanceId) => {
          const [baseId] = instanceId.split('::');
          const card = cards[baseId];
          if (!card) return null;
          return (
            <Card
              key={instanceId}
              id={`canvas-card:${group.id}:${instanceId}`}
              name={card.name}
              origin={`From ${card.datasetType}`}
              source="canvas"
            />
          );
        })}
      </div>
    </section>
  );
}
