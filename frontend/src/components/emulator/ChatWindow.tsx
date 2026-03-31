interface Message {
  id: string;
  from: 'bot' | 'user';
  text: string;
  buttons?: { text: string; callback_data: string }[];
  timestamp: number;
}

interface ChatWindowProps {
  messages: Message[];
  onButtonClick?: (callbackData: string) => void;
}

export default function ChatWindow({ messages, onButtonClick }: ChatWindowProps) {
  return (
    <div className="p-3 space-y-2">
      {messages.map((msg) => (
        <div key={msg.id}>
          <div
            className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              msg.from === 'bot'
                ? 'bg-[#182533] text-gray-200 rounded-tl-sm'
                : 'bg-[#2b5278] text-white rounded-tr-sm ml-auto'
            }`}
          >
            {msg.text.split('\n').map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </div>
          {msg.buttons && msg.buttons.length > 0 && (
            <div className="mt-1 space-y-1 max-w-[80%]">
              {msg.buttons.map((btn, i) => (
                <button
                  key={i}
                  onClick={() => onButtonClick?.(btn.callback_data)}
                  className="w-full text-center text-sm text-blue-400 bg-[#182533] hover:bg-[#1e3045] px-3 py-2 rounded-lg transition-colors"
                >
                  {btn.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
