import React, { useState } from 'react';
import styles from './DisclaimerOverlay.module.css';
import { Button } from './Button';

interface DisclaimerOverlayProps {
  title: string;
  content: string;
  acceptText: string;
  onAccept: () => void;
}

export const DisclaimerOverlay: React.FC<DisclaimerOverlayProps> = ({
  title,
  content,
  acceptText,
  onAccept,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleAccept = () => {
    setIsVisible(false);
    onAccept();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.icon}>⚠️</span>
          <h2 className={styles.title}>{title}</h2>
        </div>
        <div className={styles.content}>
          {content}
        </div>
        <div className={styles.footer}>
          <Button variant="warning" fullWidth onClick={handleAccept}>
            {acceptText}
          </Button>
        </div>
      </div>
    </div>
  );
};
