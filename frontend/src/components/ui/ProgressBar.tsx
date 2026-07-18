import React from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className={styles.container}>
      <div className={styles.labelWrapper}>
        <span className={styles.stepLabel}>STEP {currentStep} / {totalSteps}</span>
        <span className={styles.percentageLabel}>{percentage}%</span>
      </div>
      <div className={styles.track}>
        <div 
          className={`${styles.fill} ${currentStep === totalSteps ? styles.fillComplete : ''}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
