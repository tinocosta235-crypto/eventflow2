"use client";
import { useEffect, useState } from "react";
import {
  ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose,
} from "@/components/ui/toast";
import type { ToastItem } from "@/hooks/use-toast";

let listeners: Array<(toasts: ToastItem[]) => void> = [];
let globalToasts: ToastItem[] = [];

function notifyListeners() {
  listeners.forEach((listener) => listener([...globalToasts]));
}

function closeToast(id: string) {
  globalToasts = globalToasts.map((t) => (t.id === id ? { ...t, open: false } : t));
  notifyListeners();
}

export function toast(
  title: string,
  options?: { description?: string; variant?: import("@/components/ui/toast").ToastVariant }
) {
  const id = Math.random().toString(36).slice(2);
  const item: ToastItem = { id, title, open: true, ...options };
  globalToasts = [...globalToasts, item];
  notifyListeners();

  setTimeout(() => {
    closeToast(id);
    setTimeout(() => {
      globalToasts = globalToasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 300);
  }, 4000);
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => { listeners = listeners.filter((l) => l !== setToasts); };
  }, []);

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast key={t.id} open={t.open} onOpenChange={(open) => !open && closeToast(t.id)} variant={t.variant}>
          <div className="flex-1 min-w-0">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
