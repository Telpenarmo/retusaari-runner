import { FormEvent, useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { emit, listen } from '@tauri-apps/api/event'
import "./App.css";
import { Editor } from "./components/Editor";

interface RunResult {
  status: number | undefined,
  stdout: string,
  stderr: string,
}

function App() {
  const [code, setCode] = useState('println("Hello, World!")');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

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
      .then(x => {
        let res = x as RunResult;
        setOutput(res.stdout || res.stderr);
      })
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
