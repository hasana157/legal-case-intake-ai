// =============================================================================
// pages/simulation.tsx
// Full redesign: 2-column ArgumentComparisonView layout, ink/brass design
// system, AppShell wrapper, ArgumentCard components, no avatars.
// =============================================================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertTriangle,
  ChevronRight,
  Zap,
  BarChart3,
  RefreshCw,
  FileOutput,
  Save,
  Check,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { CaseHeader } from '@/components/layout/CaseHeader';
import { ArgumentCard } from '@/components/simulation/ArgumentCard';
import { ArgumentCardSkeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { GroundingScoreBadge } from '@/components/ui/badges';
import { Textarea } from '@/components/ui/TextArea';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSession, type DebateMessage, type WeaknessAnalysis } from '@/context/SessionContext';
import type { CompletePayload } from '@/components/simulation/StreamingArgumentDisplay';
import { CLAIM_TYPE_LABELS } from '@/types/intake_v2';

// ── Framer variants ─────────────────────────────────────────────────────────

const pageVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } },
};

const listVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
};

// =============================================================================

export default function SimulationPage() {
  const router = useRouter();
  const {
    structuredCase,
    messages,
    setMessages,
    setSimulationResult,
    simulationResult,
    rebuttals,
    setRebuttal,
    setAnalysis,
  } = useSession();

  const [draft, setDraft]               = useState('');
  const [status, setStatus]             = useState('');
  const [isStreaming, setIsStreaming]   = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const [weaknessModal, setWeaknessModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<WeaknessAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function handleSaveCase() {
    if (!structuredCase) return;
    try {
      const caseData = {
        structuredCase,
        messages,
        rebuttals,
        simulationResult,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(`saved_case_${structuredCase.case_id}`, JSON.stringify(caseData));
      
      // Also trigger a JSON download backup for safety
      const blob = new Blob([JSON.stringify(caseData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_${structuredCase.case_id || 'session'}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setErrorMsg('Failed to save case to local storage.');
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (structuredCase && messages.length === 0 && !isStreaming) {
      requestOpponentTurn([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuredCase]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  const shortcuts = useMemo(() => [
    {
      key: 'Enter',
      ctrl: true,
      label: 'Submit rebuttal',
      handler: () => handleSend(),
    },
    {
      key: 's',
      ctrl: true,
      label: 'Save draft (auto-saved)',
      handler: () => {/* draft already in state */},
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [draft, isStreaming]);

  useKeyboardShortcuts(shortcuts);

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!structuredCase) {
    return (
      <>
        <Head><title>Practice Simulation — Opposing-Argument Simulator</title></Head>
        <AppShell title="Practice Simulation">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Zap className="mb-4 h-12 w-12 text-slate-300" />
            <h2 className="font-display text-xl font-semibold text-ink-800">No case ready yet</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Complete the intake form so the practice arena can prepare your opponent.
            </p>
            <button type="button" className="btn-primary mt-6" onClick={() => router.push('/intake')}>
              Go to intake
            </button>
          </div>
        </AppShell>
      </>
    );
  }

  const plaintiff = structuredCase.parties.find(p => p.role === 'plaintiff')?.name || 'You';
  const defendant = structuredCase.parties.find(p => p.role === 'defendant')?.name || 'Opposing Party';
  const claimLabel = CLAIM_TYPE_LABELS[structuredCase.claim_type];

  // ── SSE streaming ────────────────────────────────────────────────────────

  async function requestOpponentTurn(nextMessages: DebateMessage[]) {
    if (!structuredCase) return;
    setIsStreaming(true);
    setErrorMsg('');
    setStatus('Retrieving legal context…');

    let streamText = '';
    setMessages([...nextMessages, { sender: 'opponent', text: '', citations: [] }]);

    try {
      const response = await fetch('/api/generate-opposition-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          case_facts: structuredCase,
          chat_history: nextMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'opponent',
            content: msg.text,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Could not reach simulation engine (${response.status}).`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let finalPayload: CompletePayload | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;
          const lines     = event.split('\n');
          const eventType = lines.find(l => l.startsWith('event: '))?.replace('event: ', '').trim() || 'message';
          const dataLine  = lines.find(l => l.startsWith('data: '));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.replace('data: ', '').trim());

          if (eventType === 'heartbeat' || eventType === 'retry') setStatus(payload.status);
          if (eventType === 'delta') {
            streamText += payload.text;
            setMessages([...nextMessages, { sender: 'opponent', text: streamText, citations: [] }]);
          }
          if (eventType === 'complete') finalPayload = payload as CompletePayload;
          if (eventType === 'error') throw new Error(payload.error || 'Simulation failed.');
        }
      }

      if (finalPayload) {
        setSimulationResult(finalPayload);
        const opponentText = finalPayload.arguments
          .map((arg, i) => `${i + 1}. ${arg.claim_text}`)
          .join('\n\n');
        const citations = finalPayload.arguments.flatMap(a => a.supporting_authority);
        setMessages([...nextMessages, { sender: 'opponent', text: opponentText, citations }]);
      }
      setStatus('');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Simulation failed.');
      setMessages(nextMessages);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || isStreaming) return;
    const nextMessages: DebateMessage[] = [...messages, { sender: 'user', text }];
    setDraft('');
    setMessages(nextMessages);
    requestOpponentTurn(nextMessages);
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/analyze-weaknesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_facts: structuredCase,
          chat_history: messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'opponent',
            content: msg.text,
          })),
        }),
      });
      if (!response.ok) throw new Error('Could not analyze the session.');
      const data = await response.json();
      setAnalysisResult(data);
      setAnalysis(data);
      setWeaknessModal(true);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ── Derive argument cards from latest completed result ───────────────────

  const latestResult = simulationResult;
  const userMessages = messages.filter(m => m.sender === 'user');

  return (
    <>
      <Head>
        <title>Practice Simulation — {plaintiff} v. {defendant}</title>
        <meta name="description" content="Compare opposing arguments and draft your rebuttals." />
      </Head>

      <AppShell
        title="Practice Simulation"
        description={`${plaintiff} v. ${defendant}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-sm"
              onClick={() => router.push('/intake')}
            >
              Edit case
            </button>
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-1.5"
              onClick={handleSaveCase}
              title="Save current case and session state"
            >
              {savedSuccess ? (
                <><Check className="h-3.5 w-3.5 text-signal-success" /> Saved!</>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Save Case</>
              )}
            </button>
            <button
              className="btn-secondary text-sm flex items-center gap-1.5"
              onClick={handleAnalyze}
              disabled={isAnalyzing || messages.length < 2}
            >
              {isAnalyzing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
              ) : (
                <><BarChart3 className="h-3.5 w-3.5" /> Conclude & Analyze</>
              )}
            </button>
            <button
              className="btn-primary text-sm flex items-center gap-1.5"
              onClick={() => router.push('/export')}
              disabled={!latestResult}
            >
              <FileOutput className="h-3.5 w-3.5" />
              Export Guide
            </button>
          </div>
        }
      >
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Case header */}
          <CaseHeader
            title={`${plaintiff} v. ${defendant}`}
            claimType={claimLabel}
            jurisdiction={structuredCase.jurisdiction}
            status="in_progress"
            actions={
              latestResult && (
                <GroundingScoreBadge score={latestResult.g_v_score} />
              )
            }
          />

          {/* Insufficient grounding warning */}
          {latestResult?.insufficient_grounding && (
            <Alert variant="warning">
              The retrieval layer found fewer strongly matching authorities than preferred.
              Treat arguments as practice prompts and verify sources manually.
            </Alert>
          )}

          {/* Error */}
          {errorMsg && (
            <Alert variant="danger" onDismiss={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          {/* ── Streaming state ─────────────────────────────────────────── */}
          {isStreaming && !latestResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-brass-500" />
                <span>{status || 'Generating opposition arguments…'}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[0, 1, 2].map(i => <ArgumentCardSkeleton key={i} />)}
              </div>
            </div>
          )}

          {/* ── 2-column argument comparison ────────────────────────────── */}
          {latestResult && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink-800">
                  Opposing Arguments
                </h2>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => requestOpponentTurn(messages.filter(m => m.sender === 'user').map(m => m))}
                  disabled={isStreaming}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-run
                </button>
              </div>

              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {latestResult.arguments.map((arg, idx) => {
                  const id = idx.toString();
                  const currentRebuttal = rebuttals[id] || '';

                  return (
                    <motion.div
                      key={idx}
                      variants={itemVariants}
                      className="grid gap-4 lg:grid-cols-2"
                    >
                      {/* Opposing argument card */}
                      <ArgumentCard
                        side="opposing"
                        category={arg.category}
                        claimText={arg.claim_text}
                        confidence={arg.confidence}
                        authorities={arg.supporting_authority.map(a => ({
                          citation: a.citation,
                          unverified: a.unverified,
                        }))}
                      />

                      {/* Rebuttal draft panel */}
                      <div className="rounded-xl border border-white/60 bg-white/40 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:bg-white/60 hover:shadow-md">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-signal-info">
                            Your rebuttal
                          </span>
                          <span
                            className={[
                              'rounded-full border px-2 py-0.5 text-xs font-medium',
                              currentRebuttal.length > 10
                                ? 'border-signal-success/25 bg-signal-successSoft text-signal-success'
                                : currentRebuttal.length > 0
                                ? 'border-signal-warning/25 bg-signal-warningSoft text-signal-warning'
                                : 'border-slate-200 bg-slate-50 text-slate-500',
                            ].join(' ')}
                          >
                            {currentRebuttal.length > 10
                              ? 'Drafted'
                              : currentRebuttal.length > 0
                              ? 'Drafting…'
                              : 'Not started'}
                          </span>
                        </div>
                        <Textarea
                          id={`rebuttal-${idx}`}
                          value={currentRebuttal}
                          onChange={e => setRebuttal(id, e.target.value)}
                          placeholder="Draft your counter-argument here…"
                          rows={5}
                          aria-label={`Rebuttal for argument ${idx + 1}`}
                        />
                        <p className="mt-1.5 text-right text-xs text-slate-400">
                          {currentRebuttal.length} chars
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </section>
          )}

          {/* ── Conversation history (user turns) ───────────────────────── */}
          {userMessages.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-semibold text-ink-700">
                Your submitted rebuttals
              </h2>
              <div className="space-y-3">
                {userMessages.map((msg, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-signal-info/20 bg-signal-infoSoft p-4 text-sm leading-relaxed text-ink-800"
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div ref={bottomRef} />
        </motion.div>
      </AppShell>

      {/* ── Fixed rebuttal bar ───────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/40 bg-white/70 px-4 py-3 backdrop-blur-xl shadow-[0_-4px_20px_rgb(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-5xl items-end gap-3">
          <div className="flex-1">
            <Textarea
              id="rebuttal-draft"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Type your rebuttal… (Ctrl+Enter to submit)"
              rows={3}
              disabled={isStreaming}
              aria-label="Rebuttal draft input"
            />
          </div>
          <div className="flex flex-col gap-2 pb-1">
            <button
              id="submit-rebuttal"
              className="btn-primary"
              onClick={handleSend}
              disabled={isStreaming || !draft.trim()}
            >
              {isStreaming ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <>Submit <ChevronRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Weakness analysis modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {weaknessModal && analysisResult && (
          <Dialog
            open={weaknessModal}
            onClose={() => setWeaknessModal(false)}
            title="Case Weaknesses & Strategy"
            description="Based on the practice session so far."
            maxWidth="max-w-2xl"
          >
            <div className="space-y-5">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-signal-warning">
                  Weaknesses identified
                </h3>
                <ul className="space-y-2">
                  {analysisResult.weaknesses.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal-warning" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-signal-success">
                  How to improve
                </h3>
                <ul className="space-y-2">
                  {analysisResult.improvement_tips.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                      <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal-success" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <DialogFooter>
              <button className="btn-secondary" onClick={() => setWeaknessModal(false)}>
                Keep practicing
              </button>
              <button className="btn-primary" onClick={() => { setWeaknessModal(false); router.push('/export'); }}>
                Export review
              </button>
            </DialogFooter>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
