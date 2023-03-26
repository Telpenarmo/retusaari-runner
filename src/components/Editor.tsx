import * as React from 'react';
import { CodeJar, Position as CodejarPosition } from 'codejar';
import { withLineNumbers } from 'codejar/linenumbers';
import hljs from 'highlight.js';
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

export const Editor: React.FC<EditorProps> = (props) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const jar = React.useRef<CodeJar | null>(null);

    React.useEffect(() => {
        if (!editorRef.current) return;

        jar.current = CodeJar(editorRef.current, highlight, { tab: '  ' });
        jar.current.onUpdate((code) => {
            const pos = jar.current!.save();
            props.onUpdate(code);
            jar.current!.restore(pos);
        });

        return () => jar.current!.destroy();
    }, []);

    function convertPosition(position: Position): CodejarPosition | null {
        const regex = `(?:(?:.*\\n){${position.line}}(?:.){${position.column}})`;
        const match = props.code.match(regex);
        const offset = match?.[0].length;
        if (!offset) return null;
        return {
            start: offset,
            end: offset,
        };
    }

    React.useEffect(() => {
        if (!jar.current || !editorRef.current) return;
        jar.current.updateCode(props.code);
    }, []);

    React.useEffect(() => {
        if (!props.position) return;
        const pos = convertPosition(props.position);
        if (!pos) return;
        jar.current?.restore(pos);
    }, [props.position]);

    return <div className="editor language-kotlin" ref={editorRef} />;
};
