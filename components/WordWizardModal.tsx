import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { getScrabbleAdvice } from '../services/geminiService';

interface WordWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WordWizardModal: React.FC<WordWizardModalProps> = ({ isOpen, onClose }) => {
  const [letters, setLetters] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letters.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const advice = await getScrabbleAdvice(letters);
      setResult(advice);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl border-4 border-nsp-orange">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors"
        >
          <Icon icon="ph:x-bold" width="24" height="24" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-luckiest text-nsp-teal mb-2">Word Wizard</h2>
          <p className="text-gray-600 text-sm">Stuck with bad letters? Ask our AI Grandmaster.</p>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={letters}
              onChange={(e) => setLetters(e.target.value.toUpperCase())}
              placeholder="ENTER LETTERS (e.g. QIJZOA)"
              className="flex-1 bg-gray-100 border-2 border-gray-200 rounded-lg px-4 py-3 font-bold text-xl text-nsp-dark-teal placeholder-gray-400 focus:outline-none focus:border-nsp-orange transition-colors"
              maxLength={7}
            />
            <button
              type="submit"
              disabled={loading || !letters}
              className="bg-nsp-teal hover:bg-nsp-dark-teal disabled:opacity-50 text-white p-3 rounded-lg transition-colors flex items-center justify-center w-14"
            >
              {loading ? (
                <Icon icon="line-md:loading-twotone-loop" width="24" height="24" />
              ) : (
                <Icon icon="ph:magnifying-glass-bold" width="24" height="24" />
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-nsp-yellow/20 border-2 border-nsp-yellow p-5 rounded-xl">
            <p className="font-marker text-xl text-nsp-dark-teal leading-relaxed">
              {result}
            </p>
          </div>
        )}
        
        <div className="mt-4 text-center">
             <p className="text-xs text-gray-400">Powered by Gemini 2.5 Flash</p>
        </div>
      </div>
    </div>
  );
};

export default WordWizardModal;