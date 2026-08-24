'use client';

import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { AppToast, AppToastViewport } from '@/components/app';

type ShowOptions = {
  duration?: number;
};

const DEFAULT_DURATION = 1600;

let globalSnackbarHandler:
  | ((message: string, options?: ShowOptions) => void)
  | null = null;

export function showGlobalSnackbar(
  message: string,
  options?: ShowOptions
) {
  globalSnackbarHandler?.(message, options);
}

export function SnackbarProvider({
  children,
}: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = useCallback(
    (nextMessage: string, options?: ShowOptions) => {
      if (!nextMessage.trim()) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setMessage(nextMessage);
      setVisible(true);

      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, options?.duration ?? DEFAULT_DURATION);
    },
    []
  );

  useEffect(() => {
    globalSnackbarHandler = showSnackbar;

    return () => {
      if (globalSnackbarHandler === showSnackbar) {
        globalSnackbarHandler = null;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [showSnackbar]);

  return (
    <>
      {children}

      <AppToastViewport
        className={
          visible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }
      >
        <AppToast>{message}</AppToast>
      </AppToastViewport>
    </>
  );
}
