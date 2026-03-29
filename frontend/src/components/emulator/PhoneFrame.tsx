import { type ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="w-[360px] h-[640px] bg-gray-900 rounded-[2.5rem] border-4 border-gray-700 shadow-2xl overflow-hidden flex flex-col">
      {/* Status bar */}
      <div className="h-8 bg-gray-800 flex items-center justify-center">
        <div className="w-24 h-1 bg-gray-700 rounded-full" />
      </div>

      {/* Chat header */}
      <div className="h-12 bg-[#1c2733] flex items-center px-4 border-b border-gray-700">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          B
        </div>
        <div className="ml-3">
          <div className="text-sm text-white font-medium">BotForge Bot</div>
          <div className="text-xs text-gray-400">online</div>
        </div>
      </div>

      {/* Chat body */}
      <div className="flex-1 overflow-y-auto bg-[#0e1621]">{children}</div>

      {/* Input bar */}
      <div className="h-12 bg-[#17212b] border-t border-gray-700 flex items-center px-3 gap-2">
        <input
          type="text"
          placeholder="Сообщение..."
          className="flex-1 bg-[#242f3d] text-sm text-gray-200 rounded-full px-4 py-2 outline-none placeholder-gray-500"
          readOnly
        />
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
          ➤
        </div>
      </div>
    </div>
  );
}
