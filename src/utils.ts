import { EventCallback, listen } from '@tauri-apps/api/event';

let listening = false;

export function useListener<T>(eventName: string, handler: EventCallback<T>) {
    if (listening) return;
    listen(eventName, handler);
    listening = true;
}

export interface Position {
    line: number,
    column: number
}

export interface ErrorMessageMatch {
    location: string,
    message: string,
    position: Position
}

export function matchErrorMessage(line: string): ErrorMessageMatch | undefined {

    const re = /^.kts:((\d+):(\d+):) error: (.*)$/;

    const matched = line.match(re);
    if (!matched) return undefined;

    return {
        location: matched[1],
        message: matched[4],
        position: {
            line: +matched[2] - 1,
            column: +matched[3] - 1
        }
    };
}