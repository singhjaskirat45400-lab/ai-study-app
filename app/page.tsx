'use client';

import { useChat } from 'ai/react';

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="w-full max-w-2xl py-4 border-b border-slate-800 text-center">
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
        <p className="text-sm text-slate-400">Powered by Gemini & Vercel AI SDK</p>
      </header>

      {/* Messages Feed */}
      <div className="flex-1 w-full max-w-2xl overflow-y-auto my-6 space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-slate-500 text-sm">
            Ask me anything to start chatting!
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col p-4 rounded-lg text-sm max-w-[85%] ${
              m.role === 'user'
                ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                : 'mr-auto bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
            }`}
          >
            <span className="text-xs text-slate-400 mb-1 font-semibold">
              {m.role === 'user' ? 'You' : 'AI'}
            </span>
            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="mr-auto bg-slate-800 border border-slate-700 p-4 rounded-lg rounded-bl-none text-slate-400 text-sm animate-pulse">
            Thinking...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl flex gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-lg"
      >
        <input
          className="flex-1 bg-transparent px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
          value={input}
          placeholder="Type your message..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
        >
          Send
        </button>
      </form>
    </main>
  );
}