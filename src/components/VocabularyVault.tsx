import React, { useMemo, useState } from 'react';
import { LanguageCode, LanguageConfig } from '../config/languages';
import { generateRevisionQuestions, SavedVocabItem } from '../utils/learningEngine';
import { playWavBase64OrSpeak } from '../utils/audioStream';
import {
  BookMarked,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Volume2,
  Search,
  BrainCircuit,
} from 'lucide-react';

interface VocabularyVaultProps {
  languages: LanguageConfig[];
  vocabularyNotebook: SavedVocabItem[];
  defaultLanguage: LanguageCode;
  onAddVocab: (item: Partial<SavedVocabItem>) => Promise<void>;
  onDeleteVocab: (id: string) => Promise<void>;
  onBoostMastery: (id: string, delta: number) => Promise<void>;
}

export const VocabularyVault: React.FC<VocabularyVaultProps> = ({
  languages,
  vocabularyNotebook,
  defaultLanguage,
  onAddVocab,
  onDeleteVocab,
  onBoostMastery,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'notebook' | 'revision'>('notebook');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  // New Phrase Form
  const [newLang, setNewLang] = useState<LanguageCode>(defaultLanguage);
  const [newPhrase, setNewPhrase] = useState<string>('');
  const [newTranslation, setNewTranslation] = useState<string>('');
  const [newExplanation, setNewExplanation] = useState<string>('');
  const [newExample, setNewExample] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);

  // Revision Exercise State
  const revisionQuestions = useMemo(
    () => generateRevisionQuestions(vocabularyNotebook),
    [vocabularyNotebook]
  );
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);

  const filteredVocab = vocabularyNotebook.filter((item) => {
    const matchesLang = filterLanguage === 'all' || item.languageCode === filterLanguage;
    const matchesQuery =
      !searchQuery.trim() ||
      item.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.explanation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLang && matchesQuery;
  });

  const handleCreatePhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhrase.trim()) return;
    setAdding(true);
    try {
      await onAddVocab({
        languageCode: newLang,
        phrase: newPhrase.trim(),
        translation: newTranslation.trim() || 'Custom learner expression',
        explanation: newExplanation.trim() || 'Saved for active speaking practice.',
        naturalExample: newExample.trim() || newPhrase.trim(),
        category: 'Vocabulary',
      });
      setNewPhrase('');
      setNewTranslation('');
      setNewExplanation('');
      setNewExample('');
    } finally {
      setAdding(false);
    }
  };

  const currentQuestion = revisionQuestions[currentQIndex];

  const handleSelectOption = async (opt: string) => {
    if (selectedAnswer || !currentQuestion) return;
    setSelectedAnswer(opt);
    if (opt === currentQuestion.correctAnswer) {
      setCorrectCount((prev) => prev + 1);
      await onBoostMastery(currentQuestion.vocabId, 10);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">
            Vocabulary Notebook, Saved Phrases & Revision Exercises
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review corrected sentences from your voice conversations and test retention with interactive grammar drills.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveSubTab('notebook')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'notebook'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Saved Notebook ({vocabularyNotebook.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('revision');
              setCurrentQIndex(0);
              setSelectedAnswer(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'revision'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Revision Exercises ({revisionQuestions.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'notebook' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 cols: Saved Phrases List */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  aria-label="Search saved vocabulary phrases"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search phrases, Hindi/English meanings, or grammar rules..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <select
                aria-label="Filter vocabulary by language"
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="all">All Languages ({vocabularyNotebook.length})</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {filteredVocab.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No matching phrases found. Save a correction from the Live Tutor or add a custom phrase on the right.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVocab.map((item) => {
                  const langObj =
                    languages.find((l) => l.code === item.languageCode) || languages[0];
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{langObj.name}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            Mastery: {item.masteryScore}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              playWavBase64OrSpeak(null, item.phrase, langObj.bcp47)
                            }
                            aria-label={`Pronounce ${item.phrase}`}
                            className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-medium cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteVocab(item.id)}
                            aria-label={`Delete phrase ${item.phrase}`}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-sm font-bold text-slate-900">{item.phrase}</div>
                      <div className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Meaning / Context: </span>
                        {item.translation}
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-semibold text-slate-800">Grammar Note: </span>
                        {item.explanation}
                      </div>
                      <div className="text-xs text-slate-500 italic">
                        <span className="not-italic font-semibold text-slate-700">Example: </span>“
                        {item.naturalExample}”
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 4 cols: Add Phrase to Notebook Form */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-600" />
              <span>Save New Phrase or Idiom</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Add workplace expressions, travel phrases, or grammar patterns to your personal revision deck.
            </p>

            <form onSubmit={handleCreatePhrase} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label htmlFor="vocab-lang" className="block font-semibold text-slate-800 mb-1">
                  Language
                </label>
                <select
                  id="vocab-lang"
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value as LanguageCode)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="vocab-phrase" className="block font-semibold text-slate-800 mb-1">
                  Target Phrase or Corrected Sentence
                </label>
                <input
                  id="vocab-phrase"
                  type="text"
                  required
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  placeholder="e.g., Let's align on the key deliverables by Friday."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="vocab-translation"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  Hindi / Native Meaning
                </label>
                <input
                  id="vocab-translation"
                  type="text"
                  value={newTranslation}
                  onChange={(e) => setNewTranslation(e.target.value)}
                  placeholder="e.g., आइए शुक्रवार तक मुख्य लक्ष्यों पर सहमति बनाएं।"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="vocab-explanation"
                  className="block font-semibold text-slate-800 mb-1"
                >
                  Explanation / Usage Rule
                </label>
                <textarea
                  id="vocab-explanation"
                  rows={2}
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  placeholder="Why this structure is natural..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={adding || !newPhrase.trim()}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {adding ? 'Saving...' : 'Save to Vocabulary Notebook'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Interactive Revision Exercise Drill */
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-3xl mx-auto space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-mono text-sky-700">
                Question {currentQIndex + 1} of {Math.max(1, revisionQuestions.length)}
              </span>
              <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                Active Sentence Correction & Fluency Drill
              </h2>
            </div>
            <div className="text-right font-mono text-xs tabular-nums">
              Score: <span className="font-bold text-slate-900">{correctCount}</span> /{' '}
              {revisionQuestions.length}
            </div>
          </div>

          {currentQuestion ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">{currentQuestion.promptText}</div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
                  Meaning / Context: “{currentQuestion.translationHint}”
                </div>
              </div>

              <div className="space-y-2.5">
                {currentQuestion.options.map((opt, idx) => {
                  const isChosen = selectedAnswer === opt;
                  const isCorrect = opt === currentQuestion.correctAnswer;
                  let btnStyle = 'border-slate-200 bg-white hover:border-slate-300 text-slate-800';
                  if (selectedAnswer) {
                    if (isCorrect) {
                      btnStyle = 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-semibold';
                    } else if (isChosen) {
                      btnStyle = 'border-rose-600 bg-rose-50/70 text-rose-950';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full p-3.5 rounded-lg border text-left text-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {selectedAnswer && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {selectedAnswer && isChosen && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer && (
                <div className="p-4 rounded-lg bg-sky-50/70 border border-sky-200 text-xs space-y-2">
                  <div className="font-semibold text-slate-900">
                    {selectedAnswer === currentQuestion.correctAnswer
                      ? 'Correct! Mastery score increased (+10%).'
                      : 'Review the grammatical rule below:'}
                  </div>
                  <p className="text-slate-700 leading-relaxed">{currentQuestion.explanation}</p>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAnswer(null);
                        setCurrentQIndex((prev) => (prev + 1) % revisionQuestions.length);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Next Exercise
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Save phrases to your notebook first to generate personalized revision drills.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
