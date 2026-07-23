import React from 'react';
import Head from 'next/head';
import { Settings, AlertTriangle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings — Opposing-Argument Simulator</title>
        <meta name="description" content="Configure your Opposing-Argument Simulator preferences." />
      </Head>
      <AppShell title="Settings" description="App preferences and configuration">
        <div className="max-w-2xl space-y-6">
          <Alert variant="info">
            Settings persistence is coming in a future release. All session data is stored
            locally in your browser&apos;s session storage.
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-brass-500" aria-hidden="true" />
                General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-ink-700">Session storage</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  All case data is stored in your browser&apos;s session storage. Clearing cookies/storage will
                  remove your active session.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-700">Keyboard shortcuts</p>
                <div className="mt-2 space-y-1.5">
                  {[
                    { keys: 'Ctrl + Enter', action: 'Submit rebuttal' },
                    { keys: 'Ctrl + S',     action: 'Save draft (auto-saved)' },
                    { keys: 'Ctrl + Shift + N', action: 'Next wizard step' },
                  ].map(({ keys, action }) => (
                    <div key={keys} className="flex items-center justify-between text-sm">
                      <span className="text-ink-700">{action}</span>
                      <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                        {keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-signal-warning" aria-hidden="true" />
                Legal Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-600">
                This tool is designed for educational practice only. The opposing arguments
                generated are AI-produced simulations and are not legal advice. Citations
                marked as unverified could not be confirmed against retrieved authorities.
                Always consult a qualified attorney before relying on any argument or citation
                in a real legal proceeding.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  );
}
