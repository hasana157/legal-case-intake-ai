import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { DialogueBubble } from '@/components/ui/DialogueBubble';
import { TextArea } from '@/components/ui/TextArea';
import styles from './simulation.module.css';

export default function ArenaPage() {
  const router = useRouter();
  const [rebuttal, setRebuttal] = useState('');

  return (
    <div className={styles.container}>
      <Head>
        <title>Practice Arena - Simulator</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button variant="secondary" size="sm" onClick={() => router.push('/intake?step=4')}>← Back</Button>
          <h2>John Smith v. Sarah&apos;s Apartments LLC (Ohio)</h2>
        </div>
        <div className={styles.headerRight}>
          <Button variant="secondary" size="sm" onClick={() => router.push('/export')}>Export & Review</Button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.debateArea}>
          <div className={styles.columnUser}>
            <h3 className={styles.columnTitleUser}>YOUR POSITION</h3>
            
            <DialogueBubble 
              character="user"
              text="I did not damage the walls. I lived carefully, and I have photos proving the walls were already damaged when I moved in. The landlord is wrongfully keeping my security deposit."
            />

            <div className={styles.evidenceBox}>
              <h4>📎 YOUR EVIDENCE</h4>
              <ul>
                <li>✅ Lease agreement (entry date: Jan 2024)</li>
                <li>✅ Photos (move-in inspection, walls unmarked)</li>
                <li>⚠️ Witness statement (gather this)</li>
              </ul>
            </div>
          </div>

          <div className={styles.divider}>
            <div className={styles.dividerIcon}>⚡</div>
          </div>

          <div className={styles.columnOpponent}>
            <h3 className={styles.columnTitleOpponent}>OPPONENT&apos;S CHALLENGE</h3>

            <DialogueBubble 
              character="opponent"
              text={`Your Honor, the plaintiff's claim is unconvincing. Consider these points:\n\n1. LACK OF PHOTOGRAPHIC EVIDENCE\nThe plaintiff claims to have photos, but did not provide them with the lease application. Under Ohio landlord law (Ohio Rev. Code § 5321.05), the burden of proof is on the tenant to document pre-existing damage *within 30 days*.\nNo evidence of timely notice.\n\n2. PROCEDURAL DEFECT: NO PROPER NOTICE\nTenant did not provide written notice to landlord within statutory period.`}
              isStreaming={true}
              confidence="HIGH"
              citations={[{ case: "Stivers v. Linden (1982)", verified: true }, { case: "Ohio 5321.04", verified: true }]}
            />
          </div>
        </div>

        <div className={styles.rebuttalArea}>
          <h3>🎤 YOUR COUNTER-ARGUMENT</h3>
          <TextArea 
            placeholder="Enter your response to the above challenge. Refer to your evidence..."
            maxLength={500}
            value={rebuttal}
            onChange={(e) => setRebuttal(e.target.value)}
          />
          <div className={styles.rebuttalActions}>
            <Button variant="secondary" onClick={() => setRebuttal('')}>Clear</Button>
            <div className={styles.rebuttalActionsRight}>
              <Button variant="warning">Generate New Challenge</Button>
              <Button variant="primary" onClick={() => router.push('/export')}>Save & Next →</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
