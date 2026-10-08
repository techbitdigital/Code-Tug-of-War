"use client";

import { Question } from "@/lib/types";

interface PredictPanelProps {
  question: Question;
  selected: number | null;
  answered: boolean;
  onSelect: (index: number) => void;
}

export default function PredictPanel({ question, selected, answered, onSelect }: PredictPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-base font-semibold">{question.prompt}</div>
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctIndex;
          const isSelected = index === selected;

          let classes = "font-mono text-lg font-semibold p-3 rounded-lg border-2 transition-colors ";

          if (!answered) {
            classes += "border-[#E2DFD3] bg-white hover:border-[#2F6FED]";
          } else if (isCorrect) {
            classes += "border-[#2F6FED] bg-[#EAF0FE] text-[#2F6FED]";
          } else if (isSelected) {
            classes += "border-[#D64B3F] bg-[#FBEAE8] text-[#D64B3F]";
          } else {
            classes += "border-[#E2DFD3] bg-white opacity-60";
          }

          return (
            <button
              key={index}
              type="button"
              disabled={answered}
              onClick={() => onSelect(index)}
              className={classes}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
