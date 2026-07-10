import React, { useState, useEffect, useRef } from 'react';
import type { StructuredCaseV2 } from '@/types/intake_v2';
import type { RetrievedAuthorityV2 } from '@/services/api';
import RebuttalWorkspace from './RebuttalWorkspace';

export interface ArgumentPayload {
  claim_text: string;
  supporting_authority: Array<{ citation: string; unverified?: boolean }>;
  confidence: 'High' | 'Medium' | 'Low';
  category: 'substantive' | 'procedural' | 'evidentiary';
}

export interface CompletePayload {
  arguments: ArgumentPayload[];
  g_v_score: number;
  retrieved_authorities: RetrievedAuthorityV2[];
  insufficient_grounding: boolean;
}

export default function StreamingArgumentDisplay({
  structuredCase,
}: {
  structuredCase: StructuredCaseV2;
}) {
  const [status, setStatus] = useState<string>('Connecting...');
  const [streamText, setStreamText] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [finalData, setFinalData] = useState<CompletePayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of stream
  useEffect(() => {
    if (!finalData && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamText, finalData]);

  const startStream = async () => {
    setStatus('Initializing simulation engine...');
    setStreamText('');
    setIsRetrying(false);
    setFinalData(null);
    setErrorMsg('');

    try {
      const response = await fetch('/api/generate-opposition-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(structuredCase)
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to connect: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || ''; // keep the last incomplete chunk

          for (const part of parts) {
            if (!part.trim()) continue;
            
            const lines = part.split('\n');
            let eventType = 'message';
            let dataPayload = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.replace('event: ', '').trim();
              } else if (line.startsWith('data: ')) {
                dataPayload = line.replace('data: ', '').trim();
              }
            }

            if (dataPayload) {
              try {
                const parsed = JSON.parse(dataPayload);
                if (eventType === 'heartbeat') {
                  setStatus(parsed.status);
                } else if (eventType === 'delta') {
                  setStreamText(prev => prev + parsed.text);
                } else if (eventType === 'retry') {
                  setStatus(parsed.status);
                  setIsRetrying(true);
                  // Clear stream text for the retry draft
                  setTimeout(() => {
                    setStreamText('');
                    setIsRetrying(false);
                  }, 2000); // 2 second gray-out effect
                } else if (eventType === 'complete') {
                  setFinalData(parsed as CompletePayload);
                  setStatus('Complete');
                } else if (eventType === 'error') {
                  setErrorMsg(parsed.error);
                }
              } catch (err) {
                console.error("Failed to parse SSE data:", dataPayload, err);
              }
            }
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection interrupted.');
    }
  };

  useEffect(() => {
    startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errorMsg) {
    return (
      <div className="card space-y-4">
        <h3 className="text-red-400 font-bold">Simulation Failed</h3>
        <p className="text-navy-200">{errorMsg}</p>
        <button onClick={startStream} className="btn-primary">Retry</button>
      </div>
    );
  }

  if (finalData) {
    return <RebuttalWorkspace finalData={finalData} />;
  }

  return (
    <div className="card space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-bold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse"></div>
          {status}
        </h3>
        {isRetrying && (
          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded border border-amber-500/30 animate-pulse">
            Re-checking against sources...
          </span>
        )}
      </div>
      
      <div className={`bg-navy-900 border border-navy-700 rounded-lg p-4 font-mono text-sm text-navy-200 h-96 overflow-y-auto transition-opacity duration-500 ${isRetrying ? 'opacity-30' : 'opacity-100'}`}>
        {streamText || <span className="opacity-50">Waiting for first token...</span>}
        <span className="inline-block w-2 h-4 ml-1 bg-gold-400 animate-pulse align-middle"></span>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
