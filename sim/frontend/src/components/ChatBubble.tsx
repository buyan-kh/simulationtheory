'use client';

import type { ChatMessage } from '@/lib/types';

interface ChatBubbleProps {
  message: ChatMessage;
  characterName: string;
}

export default function ChatBubble({ message, characterName }: ChatBubbleProps) {
  const truncated = message.content.length > 60
    ? message.content.slice(0, 57) + '...'
    : message.content;

  return (
    <div className={message.is_thought ? 'speech-bubble thought-bubble' : 'speech-bubble'}>
      <div className="font-pixel" style={{ fontSize: '6px', marginBottom: '2px', color: '#6a6a8a' }}>
        {characterName}
      </div>
      <div className="font-pixel leading-tight" style={{ fontSize: '7px' }}>
        {truncated}
      </div>
    </div>
  );
}
