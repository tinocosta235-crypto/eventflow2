"use client";
import { useState, useCallback } from "react";
import type { ToastVariant } from "@/components/ui/toast";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  open: boolean;
};

let listeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export function toast(
  title: string,
  options?: { description?: string; variant?: ToastVariant }
) {
  const id = Math.random().toString(36).slice(2);
  const item: ToastItem = { id, title, open: true, ...options };
  toasts = [...toasts, item];
  notify();
  setTimeout(() => {
    toasts = toasts.map((t) => (t.id === id ? { ...t, open: false } : t));
    notify();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, 300);
  }, 4000);
}

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>(toasts);

  const subscribe = useCallback((fn: (t: ToastItem[]) => void) => {
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  useState(() => {
    const unsub = subscribe(setItems);
    return unsub;
  });

  const dismiss = useCallback((id: string) => {
    toasts = toasts.map((t) => (t.id === id ? { ...t, open: false } : t));
    notify();
  }, []);

  return { toasts: items, dismiss };
}
