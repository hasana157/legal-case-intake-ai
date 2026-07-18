// =============================================================================
// frontend/src/pages/simulation.tsx
// Anime-style continuous debate arena.
// Left: Litigant (Blue, #42A5F5)   |   ⚡   |   Right: Opposing Counsel (Red, #EF5350)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from '@/context/SessionContext';
import { analyzeWeaknesses, buildSimulationPayload } from '@/services/api';
import type { ChatMessage, WeaknessAnalysisResult } from '@/services/api';
import type { StructuredCaseV2 } from '@/types/intake_v2';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated avatar circle */
function Avatar({
  side,
  isSpeaking,
  label,
}: {
  side: 'user' | 'opponent';
  isSpeaking: boolean;
  label: string;
}) {
  const isUser = side === 'user';
  const accent = isUser ? '#42A5F5' : '#EF5350';
  const emoji = isUser ? '👤' : '⚖️';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        className={isSpeaking ? (isUser ? 'glow-blue-ring' : 'glow-red-ring') : ''}
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          border: `3px solid ${accent}`,
          background: `radial-gradient(circle at 35% 35%, ${accent}30, rgba(10,12,20,0.9))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          transition: 'box-shadow 0.3s ease',
        }}
      >
        <span
          className={isSpeaking ? 'avatar-speaking' : 'avatar-idle'}
          style={{ display: 'block' }}
        >
          {emoji}
        </span>
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: accent,
          textTransform: 'uppercase',
        }}
      >
        {isSpeaking ? '🎙 Speaking…' : label}
      </span>
    </div>
  );
}

/** Typing indicator (3 bouncing dots) */
function TypingIndicator({ side }: { side: 'opponent' }) {
  return (
    <div
      className="bubble-opponent"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '14px 20px',
        borderRadius: '18px 18px 18px 4px',
        marginTop: 8,
      }}
    >
      <span className="typing-dot-1" style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: '#EF5350' }} />
      <span className="typing-dot-2" style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: '#EF5350' }} />
      <span className="typing-dot-3" style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: '#EF5350' }} />
    </div>
  );
}

/** Individual speech bubble */
function SpeechBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const isUser = msg.role === 'user';
  return (
    <div
      className={`bubble-pop ${isUser ? 'bubble-user' : 'bubble-opponent'}`}
      key={index}
      style={{
        padding: '14px 18px',
        marginBottom: 12,
        maxWidth: '90%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        lineHeight: 1.65,
        fontSize: 14,
        color: isUser ? '#bbdefb' : '#ffcdd2',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 6,
          color: isUser ? '#42A5F5' : '#EF5350',
        }}
      >
        {isUser ? '🧑 You (Plaintiff)' : '⚖️ Opposing Counsel'}
      </div>
      {msg.content}
    </div>
  );
}

/** Weakness analysis result modal */
function WeaknessModal({
  result,
  onClose,
  onExport,
}: {
  result: WeaknessAnalysisResult;
  onClose: () => void;
  onExport: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,12,20,0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'linear-gradient(160deg, #0d1226 0%, #10131f 100%)',
          border: '1px solid rgba(255,215,0,0.25)',
          borderRadius: 20,
          padding: 36,
          boxShadow: '0 0 60px rgba(255,215,0,0.08)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📋</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#FFD700', margin: 0 }}>
            Strategic Debrief
          </h2>
          <p style={{ color: '#546e7a', fontSize: 14, marginTop: 8 }}>
            Your practice session is complete. Here's what our AI identified.
          </p>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h3 style={{ color: '#EF5350', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            ⚠️ Key Weaknesses Identified
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.weaknesses.map((w, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(239,83,80,0.08)',
                  border: '1px solid rgba(239,83,80,0.25)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: '#EF5350', fontWeight: 800, fontSize: 13, minWidth: 20 }}>
                  {i + 1}.
                </span>
                <span style={{ color: '#ffcdd2', fontSize: 13, lineHeight: 1.6 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h3 style={{ color: '#42A5F5', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            💡 Actionable Improvements
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.improvement_tips.map((tip, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(66,165,245,0.08)',
                  border: '1px solid rgba(66,165,245,0.25)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: '#42A5F5', fontWeight: 800, fontSize: 13, minWidth: 20 }}>
                  →
                </span>
                <span style={{ color: '#bbdefb', fontSize: 13, lineHeight: 1.6 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onExport}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid rgba(255,215,0,0.4)',
              background: 'rgba(255,215,0,0.08)',
              color: '#FFD700',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📄 Export PDF Report
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #42A5F5, #1565C0)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Practice Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SimulationPage() {
  const router = useRouter();
  const { structuredCase, clearSession } = useSession();

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [rebuttalInput, setRebuttalInput] = useState('');
  const [isOpponentTyping, setIsOpponentTyping] = useState(false);
  const [isOpponentSpeaking, setIsOpponentSpeaking] = useState(false);
  const [heartbeat, setHeartbeat] = useState('');
  const [streamingText, setStreamingText] = useState('');

  const [isAnalysing, setIsAnalysing] = useState(false);
  const [weaknessResult, setWeaknessResult] = useState<WeaknessAnalysisResult | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Redirect if no case loaded
  useEffect(() => {
    if (!structuredCase) {
      router.replace('/intake');
    }
  }, [structuredCase, router]);

  // Auto-scroll chat feed on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, streamingText, isOpponentTyping]);

  // ── Kick off the first opponent turn on mount ──────────────────────────────
  useEffect(() => {
    if (structuredCase && chatHistory.length === 0) {
      fireOpponentTurn([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuredCase]);

  // ── SSE streaming helper ───────────────────────────────────────────────────
  const fireOpponentTurn = useCallback(
    async (history: ChatMessage[]) => {
      if (!structuredCase) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsOpponentTyping(true);
      setIsOpponentSpeaking(false);
      setStreamingText('');
      setHeartbeat('');

      const payload = buildSimulationPayload(structuredCase as StructuredCaseV2, history);

      try {
        const response = await fetch('/api/generate-opposition-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        setIsOpponentTyping(false);
        setIsOpponentSpeaking(true);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const rawData = line.slice(6).trim();
              if (!rawData) continue;
              try {
                const parsed = JSON.parse(rawData);

                if (parsed.status) {
                  setHeartbeat(parsed.status);
                } else if (parsed.text !== undefined) {
                  accumulated += parsed.text;
                  setStreamingText(accumulated);
                } else if (parsed.arguments !== undefined) {
                  // complete event — extract final argument text
                  const args: Array<{ claim_text?: string }> = parsed.arguments ?? [];
                  const finalText =
                    args.length > 0
                      ? args[0].claim_text ?? accumulated
                      : accumulated;

                  setStreamingText('');
                  setIsOpponentSpeaking(false);
                  setHeartbeat('');
                  setChatHistory((prev) => [
                    ...prev,
                    { role: 'opponent', content: finalText },
                  ]);
                } else if (parsed.error) {
                  setIsOpponentSpeaking(false);
                  setIsOpponentTyping(false);
                  setHeartbeat(parsed.error);
                }
              } catch {
                // non-JSON heartbeat line — ignore
              }
            }
          }
        }

        // Fallback: if no "complete" event but we have streamed text, commit it
        if (accumulated && isOpponentSpeaking) {
          setStreamingText('');
          setIsOpponentSpeaking(false);
          setChatHistory((prev) => [
            ...prev,
            { role: 'opponent', content: accumulated },
          ]);
        }
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setHeartbeat('Connection error. Please try submitting your rebuttal again.');
        setIsOpponentTyping(false);
        setIsOpponentSpeaking(false);
      }
    },
    [structuredCase, isOpponentSpeaking],
  );

  // ── User sends rebuttal ────────────────────────────────────────────────────
  const handleSendRebuttal = useCallback(() => {
    const text = rebuttalInput.trim();
    if (!text || isOpponentTyping || isOpponentSpeaking) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setRebuttalInput('');
    fireOpponentTurn(newHistory);
  }, [rebuttalInput, chatHistory, isOpponentTyping, isOpponentSpeaking, fireOpponentTurn]);

  // ── Keyboard shortcut: Ctrl/Cmd + Enter ───────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendRebuttal();
    }
  };

  // ── Conclude practice ──────────────────────────────────────────────────────
  const handleConclude = useCallback(async () => {
    if (!structuredCase || chatHistory.length === 0) return;
    setIsAnalysing(true);
    try {
      const result = await analyzeWeaknesses(structuredCase as StructuredCaseV2, chatHistory);
      setWeaknessResult(result);
    } catch {
      setWeaknessResult({
        weaknesses: ['Analysis unavailable — please try again.'],
        improvement_tips: ['Re-run the debrief after a moment.'],
      });
    } finally {
      setIsAnalysing(false);
    }
  }, [structuredCase, chatHistory]);

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!structuredCase) return;
    const { exportDebatePDF } = await import('@/services/pdfExport');
    exportDebatePDF(structuredCase as StructuredCaseV2, chatHistory, weaknessResult ?? undefined);
  }, [structuredCase, chatHistory, weaknessResult]);

  if (!structuredCase) return null;

  // Determine who is "speaking" for avatar animation purposes
  const userIsSpeaking = false; // user just types; we don't animate their side
  const oppIsSpeaking = isOpponentTyping || isOpponentSpeaking;

  return (
    <>
      <Head>
        <title>Debate Arena – Opposing Counsel Simulator</title>
        <meta name="description" content="Practice your legal arguments against an AI opposing counsel in real time." />
      </Head>

      {/* Weakness analysis modal */}
      {weaknessResult && (
        <WeaknessModal
          result={weaknessResult}
          onClose={() => {
            setWeaknessResult(null);
            clearSession();
            router.push('/intake');
          }}
          onExport={handleExport}
        />
      )}

      {/* Analysing overlay */}
      {isAnalysing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,12,20,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '4px solid rgba(255,215,0,0.2)',
              borderTop: '4px solid #FFD700',
              animation: 'spin 0.9s linear infinite',
              marginBottom: 20,
            }}
          />
          <p style={{ color: '#FFD700', fontSize: 17, fontWeight: 600 }}>Compiling your debrief…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Arena Layout ── */}
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--arena-bg, #0a0c14)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', 'Roboto', sans-serif",
        }}
      >
        {/* ── Top bar ── */}
        <header
          style={{
            borderBottom: '1px solid var(--arena-border, #1e2540)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(13,18,38,0.9)',
            backdropFilter: 'blur(8px)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div>
            <span style={{ color: '#FFD700', fontWeight: 800, fontSize: 15, letterSpacing: '0.06em' }}>
              ⚖️ DEBATE ARENA
            </span>
            {structuredCase.claim_type && (
              <span
                style={{
                  marginLeft: 12,
                  fontSize: 11,
                  background: 'rgba(255,215,0,0.1)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: 6,
                  padding: '2px 8px',
                  color: '#FFD700',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {structuredCase.claim_type}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleExport}
              disabled={chatHistory.length === 0}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,215,0,0.3)',
                background: 'rgba(255,215,0,0.06)',
                color: chatHistory.length === 0 ? '#546e7a' : '#FFD700',
                fontSize: 12,
                fontWeight: 600,
                cursor: chatHistory.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📄 Export
            </button>
            <button
              onClick={handleConclude}
              disabled={chatHistory.length < 2 || isOpponentSpeaking || isOpponentTyping}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                border: 'none',
                background:
                  chatHistory.length < 2
                    ? 'rgba(66,165,245,0.2)'
                    : 'linear-gradient(135deg, #42A5F5, #1565C0)',
                color: chatHistory.length < 2 ? '#546e7a' : '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: chatHistory.length < 2 ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              🏁 Conclude & Debrief
            </button>
          </div>
        </header>

        {/* ── Split Screen Arena ── */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 56px 1fr',
            gap: 0,
            minHeight: 0,
          }}
        >
          {/* ─── Left: User / Plaintiff ─── */}
          <div
            style={{
              borderRight: '1px solid var(--arena-border, #1e2540)',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(180deg, rgba(66,165,245,0.04) 0%, transparent 100%)',
            }}
          >
            {/* Avatar header */}
            <div
              style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid var(--arena-border, #1e2540)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(66,165,245,0.03)',
              }}
            >
              <Avatar side="user" isSpeaking={userIsSpeaking} label="You — Plaintiff" />
              {structuredCase.jurisdiction && (
                <span style={{ fontSize: 11, color: '#546e7a' }}>
                  {structuredCase.jurisdiction}
                </span>
              )}
            </div>

            {/* User's evidence list */}
            {structuredCase.available_evidence && structuredCase.available_evidence.length > 0 && (
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--arena-border, #1e2540)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#42A5F5',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  📎 Your Evidence
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {structuredCase.available_evidence.slice(0, 5).map((ev, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 11,
                        color: '#90a4ae',
                        padding: '4px 8px',
                        background: 'rgba(66,165,245,0.06)',
                        borderRadius: 6,
                        border: '1px solid rgba(66,165,245,0.12)',
                      }}
                    >
                      {typeof ev === 'string' ? ev : ev.description ?? JSON.stringify(ev)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User chat bubbles */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {chatHistory
                .filter((m) => m.role === 'user')
                .map((m, i) => (
                  <SpeechBubble key={i} msg={m} index={i} />
                ))}
            </div>
          </div>

          {/* ─── Center: VS Divider ─── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--arena-surface, #10131f)',
              borderLeft: '1px solid var(--arena-border, #1e2540)',
              borderRight: '1px solid var(--arena-border, #1e2540)',
              gap: 16,
              padding: '8px 0',
            }}
          >
            <span
              className="vs-lightning"
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#FFD700',
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                letterSpacing: '-4px',
              }}
            >
              ⚡
            </span>
            <span
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: '#37474f',
                textTransform: 'uppercase',
              }}
            >
              VS
            </span>
            <span
              className="vs-lightning"
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#FFD700',
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                letterSpacing: '-4px',
                animationDelay: '2s',
              }}
            >
              ⚡
            </span>
          </div>

          {/* ─── Right: Opponent ─── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(180deg, rgba(239,83,80,0.04) 0%, transparent 100%)',
            }}
          >
            {/* Avatar header */}
            <div
              style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid var(--arena-border, #1e2540)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(239,83,80,0.03)',
              }}
            >
              <Avatar side="opponent" isSpeaking={oppIsSpeaking} label="Opposing Counsel" />
              {heartbeat && !isOpponentSpeaking && (
                <span
                  style={{
                    fontSize: 10,
                    color: '#ef9a9a',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    maxWidth: 140,
                  }}
                >
                  {heartbeat}
                </span>
              )}
            </div>

            {/* Opponent chat bubbles */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {chatHistory
                .filter((m) => m.role === 'opponent')
                .map((m, i) => (
                  <SpeechBubble key={i} msg={m} index={i} />
                ))}

              {/* Streaming in progress */}
              {isOpponentSpeaking && streamingText && (
                <div
                  className="bubble-opponent"
                  style={{
                    padding: '14px 18px',
                    marginBottom: 12,
                    maxWidth: '90%',
                    lineHeight: 1.65,
                    fontSize: 14,
                    color: '#ffcdd2',
                    opacity: 0.9,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                      color: '#EF5350',
                    }}
                  >
                    ⚖️ Opposing Counsel
                  </div>
                  {streamingText}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: 14,
                      background: '#EF5350',
                      marginLeft: 3,
                      verticalAlign: 'text-bottom',
                      animation: 'blink 0.75s step-end infinite',
                    }}
                  />
                  <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
                </div>
              )}

              {/* Typing dots (before stream starts) */}
              {isOpponentTyping && <TypingIndicator side="opponent" />}

              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* ── Rebuttal Input Bar ── */}
        <div
          style={{
            borderTop: '1px solid var(--arena-border, #1e2540)',
            background: 'rgba(13,18,38,0.95)',
            backdropFilter: 'blur(8px)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: '0 auto',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#42A5F5',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                🧑 Your Rebuttal
              </div>
              <textarea
                id="rebuttal-input"
                value={rebuttalInput}
                onChange={(e) => setRebuttalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isOpponentTyping || isOpponentSpeaking}
                placeholder={
                  isOpponentTyping || isOpponentSpeaking
                    ? 'Wait for opposing counsel to finish…'
                    : 'Type your counter-argument here… (Ctrl+Enter to send)'
                }
                rows={3}
                style={{
                  width: '100%',
                  background: 'rgba(66,165,245,0.06)',
                  border: `1px solid ${
                    rebuttalInput.length > 0 ? 'rgba(66,165,245,0.5)' : 'rgba(66,165,245,0.2)'
                  }`,
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: '#e3f2fd',
                  fontSize: 14,
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  opacity: isOpponentTyping || isOpponentSpeaking ? 0.5 : 1,
                }}
              />
            </div>
            <button
              id="send-rebuttal-btn"
              onClick={handleSendRebuttal}
              disabled={
                !rebuttalInput.trim() || isOpponentTyping || isOpponentSpeaking
              }
              style={{
                padding: '14px 22px',
                borderRadius: 12,
                border: 'none',
                background:
                  !rebuttalInput.trim() || isOpponentTyping || isOpponentSpeaking
                    ? 'rgba(66,165,245,0.15)'
                    : 'linear-gradient(135deg, #42A5F5, #1565C0)',
                color:
                  !rebuttalInput.trim() || isOpponentTyping || isOpponentSpeaking
                    ? '#37474f'
                    : '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor:
                  !rebuttalInput.trim() || isOpponentTyping || isOpponentSpeaking
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              Send ↵
            </button>
          </div>
          <div
            style={{
              maxWidth: 900,
              margin: '8px auto 0',
              fontSize: 11,
              color: '#37474f',
              textAlign: 'right',
            }}
          >
            {chatHistory.filter((m) => m.role === 'user').length} rebuttal(s) submitted
            {chatHistory.length >= 2 && (
              <span style={{ marginLeft: 16 }}>
                · Ready to{' '}
                <button
                  onClick={handleConclude}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFD700',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  conclude practice?
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
