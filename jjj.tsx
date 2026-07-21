"use client";

import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-12 flex justify-between items-center border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Pro AI Study Suite
          </h1>
          <p className="text-slate-400 text-sm mt-1">Your intelligent learning assistant</p>
        </div>
        <div className="flex gap-4">
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-semibold border border-indigo-500/20">
            AI Engine Online
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition">
          <h2 className="text-xl font-semibold mb-2 text-indigo-300">📚 Smart Summarizer</h2>
          <p className="text-slate-400 text-sm mb-4">Drop long lecture notes or PDFs to get instant, bulleted study guides.</p>
          <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">
            Open Summarizer
          </button>
        </div>

        {/* Module 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition">
          <h2 className="text-xl font-semibold mb-2 text-cyan-300">🧠 Flashcard Generator</h2>
          <p className="text-slate-400 text-sm mb-4">Convert any topic text into active-recall flashcard decks automatically.</p>
          <button className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition">
            Generate Cards
          </button>
        </div>

        {/* Module 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition">
          <h2 className="text-xl font-semibold mb-2 text-emerald-300">⏱️ Mock Exam Coach</h2>
          <p className="text-slate-400 text-sm mb-4">Simulate customized test conditions and get diagnostic grading from the AI.</p>
          <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition">
            Start Quiz
          </button>
        </div>
      </main>
    </div>
  );
}