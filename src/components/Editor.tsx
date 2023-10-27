import * as React from 'react';
import { CodeJar } from 'codejar';
import { withLineNumbers } from 'codejar/linenumbers';
import hljs from 'highlight.js/lib/core';
import 'highlight.js/styles/atom-one-dark.css';
import kotlin from 'highlight.js/lib/languages/kotlin';
import './Editor.css';
import { Position } from '../utils';

hljs.registerLanguage('kotlin', kotlin);

interface EditorProps {
    code: string;
    onUpdate: (code: string) => void;
    position: Position | undefined;
}

const highlightElement = (editor: HTMLElement) => {
    // needed for escaping
    // eslint-disable-next-line no-self-assign
    editor.textContent = editor.textContent;
    hljs.highlightElement(editor);
};

const highlight = withLineNumbers(highlightElement, {
    wrapClass: 'panel-content',
});

export const Editor: React.FC<EditorProps> = ({ code, onUpdate, position }) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const jar = React.useRef<CodeJar | null>(null);

    React.useEffect(() => {
        if (!editorRef.current || !onUpdate) return;

        jar.current = CodeJar(editorRef.current, highlight, { tab: '  ' });
        jar.current.onUpdate((code) => {
            onUpdate(code);
            console.log('internal code update', code);
        });
        console.log('jar created', jar.current);

        return () => jar.current!.destroy();
    }, [editorRef, onUpdate]);

    const convertPosition = React.useCallback(
        (position: Position) => {
            const lines = code.split('\n').slice(0, position.line);

            // sum of lengths of prefix lines, incremented by '\n' character
            const linesSum = lines.reduce(
                (sum, line) => sum + line.length + 1,
                0
            );
            const offset = linesSum + position.column;
            return {
                start: offset,
                end: offset,
            };
        },
        [code]
    );

    React.useEffect(() => {
        if (!jar.current) return;
        if (code === jar.current.toString()) return;
        console.log('external code update:', code);
        jar.current.updateCode(code);
    }, [code]);

    React.useEffect(() => {
        if (!position) return;
        const pos = convertPosition(position);
        jar.current?.restore(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [position]);

    return <div className="editor language-kotlin" ref={editorRef} />;
};
