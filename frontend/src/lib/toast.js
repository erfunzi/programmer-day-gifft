import { useEffect, useSyncExternalStore } from "react";
import { toastMessage } from "./api";
let items = [], nextId = 0;
const listeners = new Set();
const emit = () => listeners.forEach(listener => listener());
export function toast(message) {
  const text = toastMessage(message);
  if (!text || items.some(item => item.message === text)) return;
  const id = ++nextId;
  items = [...items, { id, message: text }];
  emit();
  setTimeout(() => dismissToast(id), 6000);
}
export function dismissToast(id) {
  items = items.filter(item => item.id !== id);
  emit();
}
export function useToasts() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => items);
}
export function useToastMessage(message) {
  useEffect(() => { toast(message); }, [message]);
}
