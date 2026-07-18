import React, { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TextArea } from '@/components/ui/TextArea';
import styles from './intake.module.css';

export default function IntakePage() {
  const router = useRouter();
  const step = parseInt(router.query.step as string) || 1;
  const [narrative, setNarrative] = useState('');

  const nextStep = () => {
    if (step < 4) router.push(`/intake?step=${step + 1}`);
    else router.push('/simulation');
  };

  const prevStep = () => {
    if (step > 1) router.push(`/intake?step=${step - 1}`);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Case Intake - Simulator</title>
      </Head>

      <div className={styles.card}>
        <ProgressBar currentStep={step} totalSteps={4} />

        {step === 1 && (
          <div className={`${styles.stepContent} animate-slide-in`}>
            <div className={styles.characterIntro}>
              <Image src="/opponent_avatar.png" alt="AI Opponent" width={60} height={60} className={styles.introAvatar} />
              <div className={styles.introBubble}>
                &quot;Tell me about your case. I&apos;m here to help you prepare. Start with what happened.&quot;
              </div>
            </div>

            <TextArea 
              placeholder="I rented an apartment in 2024..."
              maxLength={1500}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />

            <div className={styles.tips}>
              <h4>💡 What to include:</h4>
              <ul>
                <li>Key dates (when did X happen?)</li>
                <li>Who is involved (you, opponent, witnesses)</li>
                <li>What is disputed (what does opponent claim?)</li>
                <li>What evidence do you have? (documents, proof)</li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={`${styles.stepContent} animate-slide-in`}>
            <h3>What type of case is this?</h3>
            <select className={styles.select}>
              <option>🏠 Housing / Tenancy Dispute</option>
              <option>👨⚖️ Small Claims</option>
              <option>👪 Family Law Dispute</option>
              <option>⚠️ Consumer Dispute</option>
              <option>📋 Other (specify)</option>
            </select>

            <h3 className={styles.mt4}>Which jurisdiction?</h3>
            <select className={styles.select}>
              <option>Ohio (State)</option>
              <option>California (State)</option>
              <option>New York (State)</option>
            </select>
          </div>
        )}

        {step === 3 && (
          <div className={`${styles.stepContent} animate-slide-in`}>
            <p>&quot;Thanks! I&apos;ve identified key details from your narrative. Please confirm or edit:&quot;</p>
            
            <div className={styles.summaryBox}>
              <h4>📅 DATE RANGE</h4>
              <p>From: 2024-01-15 To: 2024-06-20</p>
              
              <h4>👥 PARTIES INVOLVED</h4>
              <p>Plaintiff: You<br/>Defendant: Sarah&apos;s Apartments LLC</p>
              
              <h4>📚 DISPUTED FACTS</h4>
              <ul>
                <li><input type="checkbox" defaultChecked /> Wall damage severity</li>
                <li><input type="checkbox" defaultChecked /> Responsibility for damage</li>
              </ul>
              
              <h4>📎 AVAILABLE EVIDENCE</h4>
              <ul>
                <li><input type="checkbox" defaultChecked /> Photos of walls</li>
                <li><input type="checkbox" defaultChecked /> Lease agreement</li>
              </ul>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={`${styles.stepContent} animate-slide-in`}>
            <h2 className={styles.successText}>✅ Your case is ready!</h2>
            
            <div className={styles.summaryBox}>
              <h3>CASE SUMMARY</h3>
              <p><strong>Housing Dispute (Ohio State Court)</strong></p>
              <p>Your Position: &quot;I did not damage the walls...&quot;</p>
              <p>Evidence Strength: 6/10</p>
            </div>

            <div className={styles.characterIntro}>
              <Image src="/opponent_avatar.png" alt="AI Opponent" width={60} height={60} className={styles.introAvatar} />
              <div className={styles.introBubble}>
                &quot;I&apos;m opposing counsel. I&apos;ll present the strongest counterarguments you&apos;re likely to face. Ready to practice?&quot;
              </div>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          {step > 1 && <Button variant="secondary" onClick={prevStep}>Previous</Button>}
          <Button onClick={nextStep} className={styles.nextBtn}>
            {step === 4 ? 'START PRACTICE' : 'Next →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
