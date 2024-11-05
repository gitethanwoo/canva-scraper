// app/docs/page.tsx
'use client';

import { useState } from 'react';

interface ChatMessage {
  question: string;
  answer: string;
}

export default function Home() {
  const [docUrl, setDocUrl] = useState('');
  const [question, setQuestion] = useState('');
  const [docContent, setDocContent] = useState<{ title?: string; content?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDocLoaded, setIsDocLoaded] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const handleAddContext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docUrl }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setDocContent(data);
      setIsDocLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docContent) return;
    
    setLoading(true);
    setError('');
    const currentQuestion = question;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: currentQuestion,
          context: docContent.content 
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setChatHistory(prev => [...prev, { 
        question: currentQuestion, 
        answer: data.answer 
      }]);
      setQuestion(''); // Clear input after successful response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Doc Chat Assistant</h1>
      
      <form onSubmit={handleAddContext} className="mb-6">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            placeholder="Paste Google Doc URL"
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 whitespace-nowrap"
          >
            {loading ? 'Loading...' : 'Add Context'}
          </button>
        </div>
        {isDocLoaded && (
          <div className="flex items-center text-green-600 mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Document loaded: {docContent?.title}</span>
          </div>
        )}
      </form>

      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">
          {error}
        </div>
      )}

      {isDocLoaded && (
        <>
          <form onSubmit={handleAskQuestion} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about the document..."
                className="flex-1 p-2 border rounded"
              />
              <button
                type="submit"
                disabled={loading || !question}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-green-300 whitespace-nowrap"
              >
                {loading ? 'Thinking...' : 'Ask Question'}
              </button>
            </div>
          </form>

          {/* Chat history */}
          <div className="space-y-4">
            {chatHistory.map((chat, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="font-semibold text-gray-700 mb-2">
                  Q: {chat.question}
                </div>
                <div className="text-gray-600 whitespace-pre-wrap">
                  A: {chat.answer}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}