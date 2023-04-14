import { useState } from 'react';

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

    const re = /^(?:.*).kts:((\d+):(\d+):) error: (.*)$/;

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

export function useSignal(): [unknown, () => void] {
    const [val, setVal] = useState(false);
    const signal = () => setVal(s => !s);
    return [val, signal];
}
