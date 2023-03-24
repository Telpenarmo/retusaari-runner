import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { emit, listen, UnlistenFn } from '@tauri-apps/api/event'
import "./App.css";
import { Editor } from "./components/Editor";

function App() {
  const [code, setCode] = useState('println("Hello, World!")');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const listening = useRef(false);

  if (!listening.current) {
    listening.current = true;
    listen<string>('output', ev => {
      setOutput(state => state + ev.payload);
    });
  }

  const onKillClicked = useCallback((e: FormEvent) => {
    e.preventDefault();

    killScript();
  }, []);

  const killScript = useCallback(() => {
    emit('kill')
      .then(() => {
        setIsRunning(false);
      })
      .catch(err => {
        console.log(err);
      });
  }, []);

  const runScript = useCallback(() => {

    setOutput('');

    invoke('run', { code })
      .catch(err => {
        console.log(err);
      })
      .finally(() => {
        setIsRunning(false);
      });

    setIsRunning(true);
  }, [code]);

  const onRunClicked = useCallback((e: FormEvent) => {
    e.preventDefault();

    runScript();
  }, [isRunning, runScript]);

  return (
    <div className="row main">
      <form
        id="editor-panel"
        className="container panel"
        onSubmit={onRunClicked}>

        <Editor code={code} onUpdate={setCode} />

        <div className="row">
          <button type="submit">Run</button>
        </div>
      </form>

      <form className="container panel" id="output-panel"
        onSubmit={onKillClicked}>
        <div className="panel-content">

          <pre id="output" className="hljs">
            {output}
          </pre>

        </div>
        <div className="row">
          <button id="kill-btn">Stop</button>
        </div>
      </form>
    </div>
  );
}

export default App;
