import React, { useState } from 'react';
import type { CompletePayload, ArgumentPayload } from './StreamingArgumentDisplay';
import { useSession } from '@/context/SessionContext';
import { DISCLAIMER_COMPACT } from '@/constants/legalNotices';
import generatePdf from '@/services/pdfExport';

export default function RebuttalWorkspace({ finalData }: { finalData: CompletePayload }) {
  const { rebuttals, setRebuttal, structuredCase } = useSession();
  
  const [hintLoadingId, setHintLoadingId] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<string, string>>({});

  const fetchHints = async (argIdx: number, text: string) => {
    const id = argIdx.toString();
    if (hints[id]) return; // already fetched
    
    setHintLoadingId(id);
    try {
      const res = await fetch('/api/rebuttal-hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ argument_text: text })
      });
      if (res.ok) {
        const data = await res.json();
        setHints(prev => ({ ...prev, [id]: data.hints }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHintLoadingId(null);
    }
  };

  const handleExport = () => {
    if (!structuredCase) return;
    generatePdf(structuredCase, finalData, rebuttals);
  };

  const totalArgs = finalData.arguments.length;
  const completedArgs = finalData.arguments.filter((_, idx) => (rebuttals[idx.toString()] || '').trim().length > 10).length;
  const progressPercent = totalArgs > 0 ? (completedArgs / totalArgs) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Rebuttal Workspace</h2>
          <p className="text-navy-300 text-sm">Draft your responses below. Your work is kept private to your device.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn-primary text-sm px-4">
            Export PDF Rehearsal Guide
          </button>
        </div>
      </div>

      <div className="card-glass p-4">
        <div className="flex justify-between text-xs text-navy-300 font-semibold mb-2 uppercase tracking-wide">
          <span>Rebuttal Progress</span>
          <span>{completedArgs} of {totalArgs} Completed</span>
        </div>
        <div className="w-full bg-navy-900 rounded-full h-2.5">
          <div className="bg-gold-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {finalData.arguments.map((arg, idx) => {
        const id = idx.toString();
        const currentRebuttal = rebuttals[id] || '';
        const isDrafting = currentRebuttal.length > 0 && currentRebuttal.length <= 10;
        const isComplete = currentRebuttal.length > 10;
        const argHint = hints[id];

        return (
          <div key={idx} className="card-glass p-0 overflow-hidden flex flex-col md:flex-row">
            
            {/* Left Column: Opposing Argument */}
            <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-navy-700 bg-navy-900/40 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="uppercase text-xs font-bold tracking-widest text-gold-400">
                  {arg.category} Argument
                </span>
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  arg.confidence === 'High' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                  arg.confidence === 'Medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {arg.confidence} Confidence
                </span>
              </div>
              
              <div className="text-navy-100 text-sm leading-relaxed flex-grow">
                {arg.claim_text}
              </div>
              
              <div className="mt-4 pt-4 border-t border-navy-700/50">
                <h4 className="text-xs font-semibold text-navy-400 uppercase mb-2">Supporting Authorities</h4>
                <ul className="space-y-2">
                  {arg.supporting_authority.map((auth, authIdx) => (
                    <li key={authIdx} className="flex items-start gap-2 text-xs text-navy-200">
                      {auth.unverified ? (
                        <span className="text-red-400 font-bold shrink-0">✗ [Unverified]</span>
                      ) : (
                        <span className="text-green-400 font-bold shrink-0">✓ [Verified]</span>
                      )}
                      <span className={auth.unverified ? "line-through opacity-70" : ""}>{auth.citation}</span>
                    </li>
                  ))}
                  {arg.supporting_authority.length === 0 && (
                    <li className="text-xs text-amber-400/80 italic">No authorities cited.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Right Column: Rebuttal Drafting */}
            <div className="w-full md:w-1/2 p-6 flex flex-col relative">
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Your Rebuttal
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  isComplete ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                  isDrafting ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  'bg-navy-800 border-navy-600 text-navy-300'
                }`}>
                  {isComplete ? 'Complete' : isDrafting ? 'Drafting' : 'Not Started'}
                </span>
              </div>

              {!argHint && (
                <button 
                  onClick={() => fetchHints(idx, arg.claim_text)}
                  disabled={hintLoadingId === id}
                  className="mb-4 text-xs btn-outline self-start"
                >
                  {hintLoadingId === id ? 'Loading hints...' : '💡 Get rebuttal starting points'}
                </button>
              )}
              
              {argHint && (
                <div className="mb-4 p-3 bg-navy-800/60 border border-navy-700 rounded-lg animate-fade-in">
                  <h4 className="text-xs font-bold text-gold-400 mb-2">Guiding Questions:</h4>
                  <div className="text-xs text-navy-200 whitespace-pre-line leading-relaxed">
                    {argHint}
                  </div>
                </div>
              )}

              <textarea
                value={currentRebuttal}
                onChange={(e) => setRebuttal(id, e.target.value)}
                placeholder="Draft your counter-argument here..."
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-3 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 flex-grow resize-y min-h-[150px]"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
