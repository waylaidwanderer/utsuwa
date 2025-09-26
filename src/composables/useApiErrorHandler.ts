// web/src/composables/useApiErrorHandler.ts
import { useToast, POSITION } from 'vue-toastification';

/**
 * A centralized handler for API errors that displays a user-friendly toast notification.
 * @returns A function that takes an error and a context string, and displays a toast.
 */
export function useApiErrorHandler() {
  const toast = useToast();

  /**
   * Handles the error by displaying a toast notification.
   * @param error The error object, expected to be an instance of Error.
   * @param context A descriptive string of what action was being performed when the error occurred.
   */
  const handle = (error: unknown, context: string) => {
    console.error(`API Error in ${context}:`, error);

    let message = `An unexpected error occurred while ${context}.`;
    if (error instanceof Error) {
      message = `Failed to ${context}: ${error.message}`;
    }

    toast.error(message, {
      position: POSITION.TOP_RIGHT,
      timeout: 10000,
      closeOnClick: true,
      pauseOnFocusLoss: true,
      pauseOnHover: true,
      draggable: true,
      draggablePercent: 0.6,
      showCloseButtonOnHover: false,
      hideProgressBar: false,
      closeButton: 'button',
      icon: true,
      rtl: false,
    });
  };

  return handle;
}
