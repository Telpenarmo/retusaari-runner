import * as React from 'react';
import { CodeJar } from 'codejar';
import { withLineNumbers } from 'codejar/linenumbers';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import kotlin from 'highlight.js/lib/languages/kotlin';
import './Editor.css';

hljs.registerLanguage('kotlin', kotlin);

interface EditorProps {
    code: string;
    onUpdate: (code: string) => void;
}

const highlight = withLineNumbers(hljs.highlightElement, { wrapClass: 'panel-content' });

export const Editor: React.FC<EditorProps> = props => {

    const editorRef = React.useRef<HTMLDivElement>(null); const jar = React.useRef<CodeJar | null>(null);


    React.useEffect(() => {
        if (!editorRef.current) return;

        jar.current = CodeJar(editorRef.current, highlight);
        jar.current.onUpdate(code => {
            const pos = jar.current!.save();
            props.onUpdate(code);
            jar.current!.restore(pos);
        });

        return () => jar.current!.destroy();
    }, []);

    React.useEffect(() => {
        if (!jar.current || !editorRef.current) return;
        jar.current.updateCode(props.code);
    }, []);

    return <div className='editor language-kotlin' ref={editorRef} />;
};
