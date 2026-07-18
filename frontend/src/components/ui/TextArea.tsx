import React, { useState } from 'react';
import styles from './TextArea.module.css';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
  showCharCount?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  maxLength,
  showCharCount = true,
  className = '',
  onChange,
  value,
  defaultValue,
  ...props
}) => {
  const isControlled = value !== undefined;
  const initialCount = isControlled ? String(value).length : (defaultValue ? String(defaultValue).length : 0);
  const [charCount, setCharCount] = useState(initialCount);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
    if (onChange) {
      onChange(e);
    }
  };

  const isNearLimit = maxLength && charCount >= maxLength * 0.9;
  const isAtLimit = maxLength && charCount >= maxLength;

  return (
    <div className={`${styles.container} ${className}`}>
      <textarea
        className={styles.textarea}
        maxLength={maxLength}
        onChange={handleChange}
        value={value}
        defaultValue={defaultValue}
        {...props}
      />
      {showCharCount && maxLength && (
        <div className={`${styles.counter} ${isAtLimit ? styles.atLimit : isNearLimit ? styles.nearLimit : ''}`}>
          [Word count: {charCount}/{maxLength}]
        </div>
      )}
    </div>
  );
};
