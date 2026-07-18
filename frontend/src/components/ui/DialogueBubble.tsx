import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './DialogueBubble.module.css';

interface Citation {
  case: string;
  verified: boolean;
}

interface DialogueBubbleProps {
  character: 'user' | 'opponent';
  text: string;
  isStreaming?: boolean;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  citations?: Citation[];
  onStreamingComplete?: () => void;
}

export const DialogueBubble: React.FC<DialogueBubbleProps> = ({
  character,
  text,
  isStreaming = false,
  confidence,
  citations = [],
  onStreamingComplete,
}) => {
  const [displayedText, setDisplayedText] = useState(isStreaming ? '' : text);
  const [isFinished, setIsFinished] = useState(!isStreaming);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      setIsFinished(true);
      return;
    }

    let currentIndex = 0;
    setDisplayedText('');
    setIsFinished(false);

    const interval = setInterval(() => {
      if (currentIndex < text.length - 1) {
        setDisplayedText((prev) => prev + text[currentIndex]);
        currentIndex++;
      } else {
        setDisplayedText(text);
        setIsFinished(true);
        clearInterval(interval);
        if (onStreamingComplete) onStreamingComplete();
      }
    }, 20); // 20ms per character for streaming

    return () => clearInterval(interval);
  }, [text, isStreaming, onStreamingComplete]);

  const bubbleClass = `${styles.bubble} ${character === 'user' ? styles.userBubble : styles.opponentBubble}`;
  
  return (
    <div className={`${styles.container} ${character === 'user' ? styles.containerUser : styles.containerOpponent}`}>
      {character === 'user' && (
        <div className={styles.avatarPlaceholder}>
          <Image src="/user_avatar.png" alt="You - The Litigant" width={60} height={60} className={styles.avatarImg} />
        </div>
      )}
      <div className={bubbleClass}>
        <div className={styles.textContainer}>
          {displayedText}
          {isFinished && isStreaming && <span className={styles.cursor} />}
        </div>
        
        {isFinished && confidence && (
          <div className={styles.confidence}>
            (Confidence: <span className={styles[`conf${confidence}`]}>
              {confidence === 'HIGH' ? '⭐⭐⭐ HIGH' : confidence === 'MEDIUM' ? '⭐⭐ MEDIUM' : '⭐ LOW'}
            </span>)
          </div>
        )}
        
        {isFinished && citations.length > 0 && (
          <div className={styles.citations}>
            {citations.map((cit, idx) => (
              <span key={idx} className={styles.citationBadge}>
                [Citation: {cit.case} {cit.verified && '✅'}]
              </span>
            ))}
          </div>
        )}
      </div>
      {character === 'opponent' && (
        <div className={styles.avatarPlaceholder}>
          <Image src="/opponent_avatar.png" alt="Opposing Counsel" width={60} height={60} className={styles.avatarImg} />
        </div>
      )}
    </div>
  );
};
