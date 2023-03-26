import React, { FormEvent, useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { emit } from '@tauri-apps/api/event';
import './App.css';
import { Editor } from './components/Editor';
import Output from './components/Output';
import { Position } from './utils';

function App() {
    const [code, setCode] = useState('println("Hello, World!")');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState<number>();
    const [requestedPosition, requestPosition] = useState<Position>();

    const onKillClicked = useCallback((e: FormEvent) => {
        e.preventDefault();

        return killScript();
    }, []);

    const killScript = useCallback(async () => {
        try {
            await emit('kill');
            setIsRunning(false);
        } catch (err) {
            console.log(err);
        }
    }, []);

    const runScript = useCallback(() => {
        setOutput('');
        setStatus(undefined);

        setIsRunning(true);

        return invoke('run', { code })
            .catch((err) => {
                console.log(err);
            })
            .then((r) => {
                setStatus(r as number);
            })
            .finally(() => {
                setIsRunning(false);
            });
    }, [code]);

    const onRunClicked = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            runScript();
        },
        [isRunning, runScript]
    );

    return (
        <div className="row main">
            <form
                id="editor-panel"
                className="container panel"
                onSubmit={onRunClicked}
            >
                <h3>Code</h3>

                <Editor
                    code={code}
                    onUpdate={setCode}
                    position={requestedPosition}
                />

                <div className="row button-row">
                    <button type="submit" disabled={isRunning}>
                        Run
                    </button>
                </div>
            </form>

            <form
                className="container panel"
                id="output-panel"
                onSubmit={onKillClicked}
            >
                <h3>Output</h3>

                <Output
                    content={output}
                    setContent={setOutput}
                    status={status ? 'error' : 'default'}
                    jumpToEditor={requestPosition}
                />

                <div className="row button-row">
                    <button type="submit" disabled={!isRunning}>
                        Stop
                    </button>
                </div>
            </form>
        </div>
    );
}

export default App;
