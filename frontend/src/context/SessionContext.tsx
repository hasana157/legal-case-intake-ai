import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { StructuredCaseV2 } from '@/types/intake_v2';

interface SessionState {
  hasAcceptedDisclaimer: boolean;
  setHasAcceptedDisclaimer: (val: boolean) => void;
  structuredCase: StructuredCaseV2 | null;
  setStructuredCase: (val: StructuredCaseV2 | null) => void;
  rebuttals: Record<string, string>;
  setRebuttal: (id: string, text: string) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean>(false);
  const [structuredCase, setStructuredCase] = useState<StructuredCaseV2 | null>(null);
  const [rebuttals, setRebuttals] = useState<Record<string, string>>({});

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('sim_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.hasAcceptedDisclaimer) setHasAcceptedDisclaimer(parsed.hasAcceptedDisclaimer);
        if (parsed.structuredCase) setStructuredCase(parsed.structuredCase);
        if (parsed.rebuttals) setRebuttals(parsed.rebuttals);
      }
    } catch (e) {
      console.error('Failed to load session', e);
    }
  }, []);

  // Save to localStorage on change
  React.useEffect(() => {
    try {
      localStorage.setItem('sim_session', JSON.stringify({
        hasAcceptedDisclaimer,
        structuredCase,
        rebuttals
      }));
    } catch (e) {
      console.error('Failed to save session', e);
    }
  }, [hasAcceptedDisclaimer, structuredCase, rebuttals]);

  const setRebuttal = (id: string, text: string) => {
    setRebuttals(prev => ({ ...prev, [id]: text }));
  };

  const clearSession = () => {
    setHasAcceptedDisclaimer(false);
    setStructuredCase(null);
    setRebuttals({});
    localStorage.removeItem('sim_session');
  };

  return (
    <SessionContext.Provider value={{
      hasAcceptedDisclaimer,
      setHasAcceptedDisclaimer,
      structuredCase,
      setStructuredCase,
      rebuttals,
      setRebuttal,
      clearSession
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
