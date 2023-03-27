import { listen } from '@tauri-apps/api/event';
import React, {
    CSSProperties,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';

import { ErrorMessageMatch, matchErrorMessage, Position } from '../utils';
import './Output.css';

type JumpHandler = (pos: Position) => void;

type StatusClass = 'default' | 'error';

type Classes = 'errorMsg' | 'errorHeading' | 'location';

const styles: Record<Classes, React.CSSProperties> = {
    errorMsg: {
        fontWeight: 'bold',
    },

    errorHeading: {
        fontWeight: 'bold',
        color: 'var(--red)',
    },

    location: {
        pointerEvents: 'all',
        textDecorationLine: 'underline',
        cursor: 'pointer',
    },
};

const constructErrorMessage = (
    match: ErrorMessageMatch,
    jump: JumpHandler,
    style: CSSProperties
) => {
    return (
        <span style={style} key={match.location}>
            <span style={styles.location} onClick={() => jump(match.position)}>
                {match.location}
            </span>
            <span style={styles.errorHeading}> error: </span>
            <span style={styles.errorMsg}>{match.message}</span>
            {'\n'}
        </span>
    );
};

interface OutputProps {
    status: StatusClass;
    jumpToEditor: JumpHandler;
    clear: unknown; // clear output whenever this changes
}

const Output: React.FC<OutputProps> = (props) => {
    const lines = useRef<string[]>([]);
    const [linesCount, setLinesCount] = useState(0);

    useEffect(() => {
        const promise = listen<string>('output', (ev) => {
            // we don't want to get an empty string from splitting

            const payload = ev.payload.endsWith('\n')
                ? ev.payload.trimEnd()
                : ev.payload;

            const payloadLines = payload.split('\n');
            const len = lines.current.push(...payloadLines);

            setLinesCount(len);
        });
        return () => {
            promise.then((unlisten) => unlisten());
        };
    }, [linesCount]);

    useEffect(() => {
        setLinesCount(0);
        lines.current.length = 0;
    }, [props.clear]);

    const highlightLine = useCallback(
        (line: string, style: CSSProperties) => {
            const plain = <span style={style}>{line}</span>;

            if (props.status === 'default') return plain;

            const matched = matchErrorMessage(line);
            if (!matched) return plain;

            return constructErrorMessage(matched, props.jumpToEditor, style);
        },
        [props.status]
    );

    const rows = ({ index, style }: { index: number; style: CSSProperties }) =>
        highlightLine(lines.current[index], style);

    return (
        <div className="panel-content">
            <pre id="output" className={`hljs ${props.status}`}>
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            itemCount={linesCount}
                            itemSize={30}
                            // -10, because AutoSizer doesn't capture the exact sizes,
                            // and a bit of extra padding is better than unneeded scroll
                            width={width! - 10}
                            height={height! - 10}
                        >
                            {rows}
                        </List>
                    )}
                </AutoSizer>
            </pre>
        </div>
    );
};

export default Output;
