import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { emit } from '@tauri-apps/api/event'
import "./App.css";
import { Editor } from "./components/Editor";
import Output from "./components/Output";

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

        <div className="row button-row">
          <button type="submit">Run</button>
        </div>
      </form>

      <form className="container panel" id="output-panel"
        onSubmit={onKillClicked}>

        <Output content={output} setContent={setOutput} />

        <div className="row button-row">
          <button id="kill-btn">Stop</button>
        </div>
      </form>
    </div>
  );
}

export default App;
