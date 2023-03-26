import React, { useCallback } from 'react';
import { ErrorMessageMatch, matchErrorMessage, useListener } from '../utils';
import './Output.css';

interface OutputProps {
    content: string;
    setContent: React.Dispatch<React.SetStateAction<string>>;
    status: StatusClass;
}

type StatusClass = 'default' | 'error';

type Classes = 'errorMsg' | 'errorHeading';

const styles: Record<Classes, React.CSSProperties> = {
    errorMsg: {
        fontWeight: 'bold',
    },

    errorHeading: {
        fontWeight: 'bold',
        color: 'var(--red)',
    },
};

const constructErrorMessage = (match: ErrorMessageMatch) => {
    return (
        <span>
            <span>{match.location}</span>
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

        return constructErrorMessage(matched);
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
