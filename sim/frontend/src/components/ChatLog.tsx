'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage, Character } from '@/lib/types';

interface ChatLogProps {
  messages: ChatMessage[];
  characters: Record<string, Character>;
}

const CHAR_COLORS = ['#4a9aaa', '#c45a7a', '#5a9a5a', '#c49a35', '#c4555a', '#6a88b5', '#8a6aaa', '#cc7744'];

function getCharColor(index: number): string {
  return CHAR_COLORS[index % CHAR_COLORS.length];
}

export default function ChatLog({ messages, characters }: ChatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const charIds = Object.keys(characters);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="pixel-panel flex flex-col h-full">
      <div className="pixel-panel-title">Chat Log</div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 pixel-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8 font-pixel text-pixel-text-dim" style={{ fontSize: '8px' }}>
            No messages yet...
          </div>
        )}
        {messages.map((msg) => {
          const charIndex = charIds.indexOf(msg.speaker_id);
          const color = getCharColor(charIndex >= 0 ? charIndex : 0);

          return (
            <div
              key={msg.id}
              className={`p-2 ${msg.is_thought ? 'opacity-60' : ''}`}
              style={{
                background: '#e8dfd2',
                borderLeft: `2px solid ${msg.is_thought ? '#c8c0b0' : color}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-pixel" style={{ fontSize: '7px', color }}>
                  {msg.speaker_name}
                </span>
                {msg.target_name && (
                  <>
                    <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>→</span>
                    <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>
                      {msg.target_name}
                    </span>
                  </>
                )}
                <span className="font-pixel text-pixel-text-dim ml-auto" style={{ fontSize: '6px' }}>
                  T{msg.tick}
                </span>
              </div>
              <p
                className={`font-pixel leading-relaxed ${msg.is_thought ? 'italic text-pixel-text-dim' : 'text-pixel-text'}`}
                style={{ fontSize: '7px' }}
              >
                {msg.is_thought ? `(${msg.content})` : msg.content}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
