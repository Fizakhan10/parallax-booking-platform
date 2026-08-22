import { useNavigate } from 'react-router-dom';
import styles from './ErrorPages.module.css';
import { AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <AlertCircle className={styles.errorIcon} size={64} />
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.errorTitle}>Page Not Found</h2>
        <p className={styles.errorMessage}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className={styles.errorActions}>
          <button
            onClick={() => navigate(-1)}
            className={styles.secondaryButton}
          >
            Go Back
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
