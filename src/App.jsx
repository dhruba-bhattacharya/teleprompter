import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import Canvas from './components/Canvas';
import Card from './components/Card';
import { useBoardStore } from './store';

function getCardPoolEntries(cards) {
  return Object.values(cards).sort((a, b) => a.name.localeCompare(b.name));
}

export default function App() {
  const {
    datasets,
    cards,
    groups,
    textBlocks,
    importDataset,
    addGroup,
    removeGroup,
    moveGroup,
    addTextBlock,
    moveTextBlock,
    updateTextBlock,
    removeTextBlock,
    placeCardInGroup,
    returnCardToPool,
    exportMatches,
  } = useBoardStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));
  const poolDrop = useDroppable({ id: 'pool-drop' });

  const [datasetType, setDatasetType] = useState('single-use');
  const [status, setStatus] = useState('Upload .txt or .csv to create cards.');
  const [exported, setExported] = useState('');

  const pool = useMemo(() => getCardPoolEntries(cards), [cards]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.csv')) {
      setStatus('Only .txt and .csv files are supported.');
      return;
    }

    const content = await file.text();
    const count = importDataset(file.name, content, datasetType);
    setStatus(`Imported ${count} card${count === 1 ? '' : 's'} from ${file.name}.`);
    event.target.value = '';
  };

  const parseCanvasCardId = (id) => {
    const [, groupId, instanceId] = String(id).split(':');
    return { groupId, instanceId };
  };

  const onDragEnd = ({ active, over, delta }) => {
    if (!active) return;

    const activeId = String(active.id);
    const overId = over?.id ? String(over.id) : null;

    if (activeId.startsWith('group:')) {
      const groupId = activeId.replace('group:', '');
      const group = groups.find((g) => g.id === groupId);
      if (group) moveGroup(groupId, { x: group.x + delta.x, y: group.y + delta.y });
      return;
    }

    if (activeId.startsWith('text:')) {
      const textId = activeId.replace('text:', '');
      const block = textBlocks.find((t) => t.id === textId);
      if (block) moveTextBlock(textId, { x: block.x + delta.x, y: block.y + delta.y });
      return;
    }

    if (activeId.startsWith('pool-card:')) {
      if (!overId?.startsWith('group-drop:')) return;
      const groupId = overId.replace('group-drop:', '');
      const baseCardId = activeId.replace('pool-card:', '');
      placeCardInGroup(baseCardId, groupId);
      return;
    }

    if (activeId.startsWith('canvas-card:')) {
      const { groupId: fromGroupId, instanceId } = parseCanvasCardId(activeId);
      const [baseCardId] = instanceId.split('::');

      if (overId?.startsWith('group-drop:')) {
        const toGroupId = overId.replace('group-drop:', '');
        placeCardInGroup(baseCardId, toGroupId, null, fromGroupId, instanceId);
      } else if (overId === 'pool-drop') {
        const card = cards[baseCardId];
        if (card?.datasetType === 'reusable') {
          returnCardToPool(fromGroupId, instanceId);
        }
      }
    }
  };

  const handleExport = () => {
    const text = exportMatches();
    setExported(text || 'No groups to export yet.');
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd} modifiers={[restrictToWindowEdges]}>
      <div className="flex h-full bg-slate-950 text-slate-100">
        <aside className="w-[360px] shrink-0 space-y-4 border-r border-slate-800 p-4">
          <h1 className="text-xl font-bold">Card Match Canvas</h1>
          <p className="text-sm text-slate-400">Upload text data and organize draggable cards into match groups.</p>

          <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
            <label className="block text-sm font-medium">Dataset type</label>
            <select
              value={datasetType}
              onChange={(e) => setDatasetType(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-sm"
            >
              <option value="single-use">single-use</option>
              <option value="reusable">reusable</option>
            </select>
            <input type="file" accept=".txt,.csv" onChange={handleFile} className="w-full text-sm" />
            <p className="text-xs text-slate-400">{status}</p>
          </section>

          <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={addGroup} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500">
                Add group
              </button>
              <button onClick={addTextBlock} className="rounded-md bg-amber-500 px-3 py-1.5 text-sm text-slate-950 hover:bg-amber-400">
                Add text
              </button>
              <button onClick={handleExport} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm hover:bg-emerald-500">
                Export matches
              </button>
            </div>
            <textarea
              readOnly
              value={exported}
              placeholder="Exported group list appears here"
              className="h-32 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs"
            />
          </section>

          <section
            id="pool-drop"
            ref={poolDrop.setNodeRef}
            className={`space-y-2 rounded-lg border bg-slate-900 p-3 ${
              poolDrop.isOver ? 'border-indigo-400' : 'border-slate-700'
            }`}
          >
            <h2 className="text-sm font-semibold">Card pool</h2>
            <p className="text-xs text-slate-400">Drag cards to groups. Reusable cards can be dragged back here.</p>
            <div className="max-h-[45vh] space-y-2 overflow-auto pr-1">
              {pool.map((card) => {
                const disabled = card.datasetType === 'single-use' && card.used;
                const dataset = datasets.find((d) => d.id === card.datasetId);
                return (
                  <Card
                    key={card.id}
                    id={`pool-card:${card.id}`}
                    name={card.name}
                    origin={`${dataset?.name ?? 'dataset'} • ${card.datasetType}`}
                    disabled={disabled}
                  />
                );
              })}
            </div>
          </section>
        </aside>

        <main className="flex-1 overflow-auto p-4">
          <Canvas
            groups={groups}
            cards={cards}
            textBlocks={textBlocks}
            onRemoveGroup={removeGroup}
            onTextUpdate={updateTextBlock}
            onTextRemove={removeTextBlock}
          />
        </main>
      </div>
    </DndContext>
  );
}
