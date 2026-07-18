import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import styles from './export.module.css';

export default function ExportPage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <Head>
        <title>Export & Review - Simulator</title>
      </Head>

      <div className={styles.card}>
        <div className={styles.successHeader}>
          <span className={styles.successIcon}>✅</span>
          <h2>Your practice session is complete!</h2>
        </div>

        <div className={styles.summarySection}>
          <h3>SESSION SUMMARY</h3>
          <div className={styles.summaryBox}>
            <p><strong>Case:</strong> John Smith v. Sarah&apos;s Apartments LLC</p>
            <p><strong>Jurisdiction:</strong> Ohio State Court</p>
            <p><strong>Challenges Faced:</strong> 4</p>
            <p><strong>Rebuttals Drafted:</strong> 4</p>
            <p><strong>Time Spent:</strong> 18 minutes</p>
            <div className={styles.scoreContainer}>
              <span><strong>Preparedness Score:</strong> 7/10</span>
              <div className={styles.scoreBar}>
                <div className={styles.scoreFill} style={{ width: '70%' }}></div>
              </div>
            </div>
            <p className={styles.proTip}>► Consider gathering witness statements for +2</p>
          </div>
        </div>

        <div className={styles.downloadSection}>
          <h3>📥 DOWNLOAD OPTIONS</h3>
          <div className={styles.downloadGrid}>
            <Button size="lg" fullWidth>
              📄 Download as PDF
            </Button>
            <Button variant="secondary" fullWidth>
              📋 Copy to Clipboard
            </Button>
            <Button variant="secondary" fullWidth>
              🔗 Share Session Link
            </Button>
          </div>
        </div>

        <div className={styles.tipsSection}>
          <h3>💡 TIPS FOR HEARING PREP</h3>
          <ul className={styles.tipsList}>
            <li>Print this guide and bring to hearing</li>
            <li>Practice reading your rebuttals aloud 3x</li>
            <li>Prepare to cite specific case law if challenged</li>
            <li>Anticipate questions about missing evidence</li>
            <li>Arrive 15 minutes early to compose yourself</li>
          </ul>
          <p className={styles.disclaimerText}>Need more help? Consult a local legal aid office.</p>
        </div>

        <div className={styles.actionsSection}>
          <h3>🔄 CONTINUE PRACTICING</h3>
          <div className={styles.actionGrid}>
            <Button variant="secondary" onClick={() => router.push('/intake?step=1')}>
              Edit This Case & Practice Again
            </Button>
            <Button variant="secondary" onClick={() => router.push('/')}>
              Start a New Case
            </Button>
          </div>
        </div>

        <div className={styles.footerDisclaimer}>
          <strong>⚖️ FINAL DISCLAIMER</strong>
          <p>This tool provides educational practice only and is not a substitute for qualified attorney representation.</p>
        </div>
      </div>
    </div>
  );
}
