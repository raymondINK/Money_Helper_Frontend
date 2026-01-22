import React from 'react'
import { Sparkles, Check } from 'lucide-react'

interface Message {
  id: number
  sender: string
  isBot: boolean
  content: string
  timestamp?: string
  isConfirmation?: boolean
  amount?: string
}

interface ChatMessageProps {
  message: Message
  compact?: boolean
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, compact = false }) => {
  if (message.isBot) {
    return (
      <div className={`flex items-start gap-2 ${compact ? 'py-1' : 'py-2'}`}>
        <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20`}>
          <Sparkles className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-white`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-semibold text-white ${compact ? 'text-sm' : ''}`}>{message.sender || 'Finny'}</span>
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
            </div>
          </div>
          <div className={`inline-block ${compact ? 'p-2' : 'p-3'} rounded-xl max-w-md ${
            message.isConfirmation 
              ? 'bg-[#1a1d24] border border-white/10' 
              : 'bg-[#1a1d24]/80'
          }`}>
            {message.isConfirmation && (
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-4 h-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-slate-400">Transaction logged:</span>
                <span className={`text-sm font-bold ${
                  message.amount?.startsWith('+') ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {message.amount}
                </span>
              </div>
            )}
            <p className={`text-slate-300 ${compact ? 'text-xs' : 'text-sm'}`}>{message.content}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end py-1">
      <div className="flex items-end gap-2">
        <span className="text-xs text-slate-500 mb-2">You</span>
        <div className={`bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white ${compact ? 'p-2' : 'p-3'} rounded-xl max-w-md`}>
          <p className={compact ? 'text-xs' : 'text-sm'}>{message.content}</p>
        </div>
        <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
