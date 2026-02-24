'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext?: string;
}

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'content', label: 'Content Issue' },
  { value: 'other', label: 'Other' },
];

const COOLDOWN_KEY = 'radiordle_feedback_cooldown';
const COOLDOWN_MS = 60000; // 1 minute between submissions

export default function FeedbackModal({ isOpen, onClose, pageContext }: FeedbackModalProps) {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check client-side cooldown
    const lastSubmit = localStorage.getItem(COOLDOWN_KEY);
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < COOLDOWN_MS) {
      setStatus('error');
      setErrorMessage('Please wait a moment before submitting again.');
      return;
    }

    if (!category) {
      setStatus('error');
      setErrorMessage('Please select a category.');
      return;
    }

    if (message.trim().length < 10) {
      setStatus('error');
      setErrorMessage('Message must be at least 10 characters.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to submit feedback.');
        return;
      }

      // Success
      localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
      setStatus('success');
      setCategory('');
      setMessage('');
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4 animate-backdrop-fade"
      onClick={handleClose}
    >
      <div
        className="bg-gradient-to-b from-modal-bg to-page-bg-dark rounded-lg p-4 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto font-baloo-2 animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6">
          Send Feedback
        </h2>

        {status === 'success' ? (
          <div className="text-center">
            <div className="bg-success rounded-lg p-6 mb-6">
              <p className="text-xl font-bold text-white mb-2">Thank you!</p>
              <p className="text-gray-200">Your feedback has been submitted.</p>
            </div>
            <button
              onClick={handleClose}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Category Select */}
            <div className="mb-4">
              <label className="block text-white text-sm font-medium mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={status === 'submitting'}
              >
                <option value="">Select a category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Textarea */}
            <div className="mb-4">
              <label className="block text-white text-sm font-medium mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                placeholder="Describe your feedback..."
                rows={5}
                className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                disabled={status === 'submitting'}
              />
              <p className="text-gray-400 text-xs mt-1 text-right">
                {message.length}/1000
              </p>
            </div>

            {/* Error Message */}
            {status === 'error' && errorMessage && (
              <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
                disabled={status === 'submitting'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Sending...' : 'Submit'}
              </button>
            </div>

            {/* About Link */}
            <div className="mt-6 pt-4 border-t border-white/20 text-center">
              <Link
                href="/about"
                className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
                onClick={handleClose}
              >
                Learn more about Radiordle
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
