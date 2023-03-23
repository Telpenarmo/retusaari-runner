import * as React from 'react';
import { useState, useEffect } from 'react';
import { CodeJar } from "codejar";
import { withLineNumbers } from "codejar/linenumbers";
import hljs from 'highlight.js';
import "highlight.js/styles/atom-one-dark.css";
import kotlin from "highlight.js/lib/languages/kotlin"

hljs.registerLanguage('kotlin', kotlin);

interface EditorProps {
    code: string;
    onUpdate: (code: string) => void;
}

const highlightElement = (editor: HTMLElement) => {
    editor.textContent = editor.textContent;
    hljs.highlightElement(editor);
}

export const Editor: React.FC<EditorProps> = props => {

    const editorRef = React.useRef<HTMLDivElement>(null);
    const jar = React.useRef<CodeJar | null>(null);

    const highlight = withLineNumbers(highlightElement, { wrapClass: 'panel-content' });

    React.useEffect(() => {
        if (!editorRef.current) return;

        jar.current = CodeJar(editorRef.current, highlight);

        return () => jar.current!.destroy();
    }, []);

    React.useEffect(() => {
        if (!jar.current || !editorRef.current) return;
        jar.current.updateCode(props.code);
    }, [props.code]);

    return <div className='editor language-kotlin' ref={editorRef} />;
};
