import { EventCallback, listen } from '@tauri-apps/api/event';

let listening = false;

export function useListener<T>(eventName: string, handler: EventCallback<T>) {
    if (listening) return;
    listen(eventName, handler);
    listening = true;
}
