import React from 'react';
import { HistoryIcon } from './icons/HistoryIcon';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelect, onClear }) => {
  return (
    <div>
      <div className="bg-base-100/50 rounded-md p-2 max-h-96 overflow-y-auto">
        {history.length > 0 ? (
          <ul className="space-y-2">
            {history.map((item) => (
              <li
                key={item.id}
                onClick={() => onSelect(item)}
                className="p-2 bg-base-300 rounded-md cursor-pointer hover:bg-secondary/30 transition-colors"
              >
                <p className="text-sm font-semibold text-text-main truncate">{item.params.deceptionTarget}</p>
                <p className="text-xs text-text-secondary">{item.timestamp}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-secondary text-sm text-center py-4">No history yet.</p>
        )}
      </div>
       {history.length > 0 && (
         <button
            onClick={onClear}
            className="w-full text-xs text-text-secondary hover:text-primary-amber mt-4 py-1"
        >
            Clear History
        </button>
      )}
    </div>
  );
};
