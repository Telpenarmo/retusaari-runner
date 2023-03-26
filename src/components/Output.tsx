import React, { useCallback } from 'react';
import {
    ErrorMessageMatch,
    matchErrorMessage,
    Position,
    useListener,
} from '../utils';
import './Output.css';

type JumpHandler = (pos: Position) => void;

interface OutputProps {
    content: string;
    setContent: React.Dispatch<React.SetStateAction<string>>;
    status: StatusClass;
    jumpToEditor: JumpHandler;
}

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

const constructErrorMessage = (match: ErrorMessageMatch, jump: JumpHandler) => {
    return (
        <span key={match.location}>
            <span style={styles.location} onClick={() => jump(match.position)}>
                {match.location}
            </span>
            <span style={styles.errorHeading}> error: </span>
            <span style={styles.errorMsg}>{match.message}</span>
            {'\n'}
        </span>
    );
};

const Output: React.FC<OutputProps> = (props) => {
    useListener<string>('output', (ev) => {
        props.setContent((state) => state + ev.payload);
    });

    const highlightLine = useCallback((line: string) => {
        const matched = matchErrorMessage(line);
        if (!matched) return line + '\n';

        return constructErrorMessage(matched, props.jumpToEditor);
    }, []);

    const highlighntErrors = useCallback((text: string) => {
        return text.split('\n').map(highlightLine);
    }, []);

    const content =
        props.status === 'default'
            ? props.content
            : highlighntErrors(props.content);

    return (
        <div className="panel-content">
            <pre id="output" className={`hljs ${props.status}`}>
                {content}
            </pre>
        </div>
    );
};

export default Output;
