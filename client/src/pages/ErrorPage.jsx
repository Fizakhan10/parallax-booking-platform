import { useNavigate, useRouteError } from 'react-router-dom';
import styles from './ErrorPages.module.css';
import { XCircle } from 'lucide-react';

export default function ErrorPage() {
  const navigate = useNavigate();
  const error = useRouteError();

  console.error('Route error:', error);

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <XCircle className={styles.errorIcon} size={64} />
        <h1 className={styles.errorCode}>500</h1>
        <h2 className={styles.errorTitle}>Something Went Wrong</h2>
        <p className={styles.errorMessage}>
          {error?.message || 'An unexpected error occurred. Our team has been notified.'}
        </p>
        {error?.statusText && (
          <p className={styles.errorDetails}>{error.statusText}</p>
        )}
        <div className={styles.errorActions}>
          <button
            onClick={() => window.location.reload()}
            className={styles.secondaryButton}
          >
            Reload Page
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className={styles.primaryButton}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
