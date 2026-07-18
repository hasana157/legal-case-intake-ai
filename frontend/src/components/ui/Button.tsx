import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClass = `${styles.button} ${styles[variant]} ${styles[size]} ${fullWidth ? styles.fullWidth : ''} ${className}`;
  return (
    <button className={baseClass.trim()} {...props}>
      {children}
    </button>
  );
};
