/**
 * Alerts Module
 * Exports all alert-related components and types
 */

// Types
export * from './types';

// Components
export { SeverityClassifier } from './severity-classifier';

export {
  NotificationService,
  getNotificationService,
} from './notification-service';

export {
  AlertManager,
  getAlertManager,
} from './alert-manager';
