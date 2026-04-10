import Group from './Group';
import TextBlock from './TextBlock';

export default function Canvas({ groups, cards, textBlocks, onRemoveGroup, onTextUpdate, onTextRemove }) {
  return (
    <div className="relative h-[1200px] w-[2000px] rounded-xl border border-slate-700 bg-slate-900 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.08)_1px,_transparent_0)] bg-[size:22px_22px]">
      {groups.map((group) => (
        <Group key={group.id} group={group} cards={cards} onRemove={onRemoveGroup} />
      ))}
      {textBlocks.map((block) => (
        <TextBlock key={block.id} block={block} onChange={onTextUpdate} onRemove={onTextRemove} />
      ))}
    </div>
  );
}
