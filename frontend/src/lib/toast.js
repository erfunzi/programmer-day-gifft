import { useEffect, useSyncExternalStore } from "react";
let items = [], nextId = 0;
const listeners = new Set();
const emit = () => listeners.forEach(listener => listener());
export function toast(message) {
  if (!message || items.some(item => item.message === message)) return;
  const id = ++nextId;
  items = [...items, { id, message }];
  emit();
  setTimeout(() => dismissToast(id), 5000);
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
