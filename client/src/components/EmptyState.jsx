import { Calendar, FileText, CreditCard, Users } from 'lucide-react';
import styles from './EmptyState.module.css';

const icons = {
  bookings: Calendar,
  notes: FileText,
  billing: CreditCard,
  users: Users,
};

export default function EmptyState({
  type = 'bookings',
  title,
  message,
  actionLabel,
  onAction,
  icon: CustomIcon,
}) {
  const Icon = CustomIcon || icons[type] || Calendar;

  return (
    <div className={styles.emptyState}>
      <div className={styles.iconWrapper}>
        <Icon size={48} className={styles.icon} />
      </div>
      <h3 className={styles.title}>
        {title || 'No items found'}
      </h3>
      <p className={styles.message}>
        {message || 'Get started by creating your first item.'}
      </p>
      {onAction && actionLabel && (
        <button onClick={onAction} className={styles.action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
