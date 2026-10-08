import { StackEntry } from "@/lib/types";

interface StatePanelProps {
  stack: StackEntry[];
  note?: string;
}

export default function StatePanel({ stack, note }: StatePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap">
        {stack.length === 0 && (
          <div className="text-sm text-[#8A8578]">Nothing on the stack yet.</div>
        )}
        {stack.map((entry, i) => (
          <div key={`${entry.name}-${i}`} className="bg-[#F3F1EA] rounded-lg px-3 py-2 min-w-[72px]">
            <div className="text-[11px] font-semibold text-[#8A8578]">{entry.name}</div>
            <div className="font-mono text-lg font-semibold">{entry.value}</div>
          </div>
        ))}
      </div>
      {note && <div className="text-sm text-[#57534E] italic">{note}</div>}
    </div>
  );
}
