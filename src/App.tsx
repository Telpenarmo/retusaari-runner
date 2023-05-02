import React, {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { emit, TauriEvent } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import {
    message,
    open as openFileDialog,
    save as saveFileDialog,
} from '@tauri-apps/api/dialog';

import './App.css';
import { Editor } from './components/Editor';
import Output from './components/Output';
import { Position, useSignal } from './utils';
import { describeError } from './errors';
import { RunError } from './errorDefs';

interface Action {
    name: string;
    key?: string;
    handler: () => void;
    disabled?: boolean;
}

function App() {
    const [code, setCode] = useState('println("Hello, World!")');
    const [clearingSignal, clearOutput] = useSignal();
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState<number>();
    const [requestedPosition, requestPosition] = useState<Position>();

    const killScript = useCallback(async () => {
        try {
            await emit('kill');
            setIsRunning(false);
        } catch (err) {
            console.log(err);
            message(err as string, {
                title: 'Failed to stop the script execution',
                type: 'error',
            });
        }
    }, []);

    const runScript = useCallback(async () => {
        clearOutput();
        setStatus(undefined);

        setIsRunning(true);

        try {
            const exitStatus = await invoke<number>('run', { code });
            setStatus(exitStatus);
        } catch (err_obj) {
            const err = err_obj as RunError;
            console.log(err);
            const { title, message: msg } = describeError(err);
            message(msg, {
                title,
                type: 'error',
            });
        } finally {
            setIsRunning(false);
        }
    }, [code, clearOutput]);

    async function loadScript() {
        const selected = await openFileDialog({
            title: 'Select a script',
            filters: [
                {
                    name: 'Kotlin source files',
                    extensions: ['kt', 'kts'],
                },
            ],
        });
        if (!selected || Array.isArray(selected)) {
            console.log('No file selected');

            return;
        }
        console.log('Selected file:', selected);

        setCode('');
        const newCode = await invoke<string>('load_file', { path: selected });
        console.log('New code:', newCode);
        setCode(newCode);
    }

    const saveScript = useCallback(async () => {
        const selected = await saveFileDialog({
            title: 'Select a file name for the script',
            filters: [
                {
                    name: 'Kotlin source files',
                    extensions: ['kt', 'kts'],
                },
            ],
        });

        await invoke('save_file', {
            path: selected,
            src: code,
        });

        console.log('File saved:', selected);
        message('File saved', {
            type: 'info',
        });
    }, [code]);

    const onRunClicked = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            runScript();
        },
        [runScript]
    );

    const onKillClicked = useCallback(
        (e: FormEvent) => {
            e.preventDefault();

            return killScript();
        },
        [killScript]
    );

    const actions: Action[] = useMemo(
        () => [
            {
                name: 'Run',
                key: 'Enter',
                handler: runScript,
                disabled: isRunning,
            },
            {
                name: 'Kill',
                key: 'c',
                handler: killScript,
                disabled: !isRunning,
            },
            { name: 'Clear', key: 'l', handler: clearOutput },
            {
                name: 'Jump to start',
                key: 'ArrowUp',
                handler: () => requestPosition({ line: 0, column: 0 }),
            },
            {
                name: 'Jump to end',
                key: 'ArrowDown',
                handler: () =>
                    requestPosition({ line: Infinity, column: Infinity }),
            },
            {
                name: 'Open',
                key: 'o',
                handler: loadScript,
            },
            {
                name: 'Save',
                key: 's',
                handler: saveScript,
                // disabled: code.length === 0,
            },
        ],
        [clearOutput, isRunning, killScript, runScript, saveScript]
    );

    const handleKeyPress = useCallback(
        (e: KeyboardEvent) => {
            if (e.ctrlKey) {
                const action = actions.find((a) => a.key === e.key);
                if (action && !action.disabled) {
                    action.handler();
                }
            }
        },
        [actions]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [isRunning, runScript, killScript, handleKeyPress]);

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
