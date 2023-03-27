import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { emit, TauriEvent } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';

import './App.css';
import { Editor } from './components/Editor';
import Output from './components/Output';
import { Position, useSignal } from './utils';

function App() {
    const [code, setCode] = useState('println("Hello, World!")');
    const [clearingSignal, clearOutput] = useSignal();
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
        clearOutput();
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

    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.ctrlKey) {
            if (!isRunning && e.key === 'Enter') runScript();

            if (isRunning && e.key === 'c') killScript();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [isRunning, runScript, killScript]);

    appWindow.listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
        await killScript();
        appWindow.close();
    });

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
                <div style={{ display: 'flex' }}>
                    <h3>Output</h3>
                    {isRunning && (
                        <div className="center">
                            <i className="pulsating-circle" />
                        </div>
                    )}
                </div>

                <Output
                    status={status ? 'error' : 'default'}
                    jumpToEditor={requestPosition}
                    clear={clearingSignal}
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
