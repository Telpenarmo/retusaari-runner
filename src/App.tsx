import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { Editor } from "./components/Editor";

function App() {
  const [code, setCode] = useState('');

  return (
    <div className="row main">
      <form
        id="editor-panel"
        className="container panel"
        onSubmit={(e) => {
          e.preventDefault();
        }}>

        <Editor code={code} onUpdate={setCode} />

        <div className="row">
          <button type="submit">Run</button>
        </div>
      </form>

      <div className="container panel" id="output-panel">
        <div className="panel-content">

          <pre id="output" className="hljs" />

        </div>
        <div className="row">
          <button id="kill-btn">Kill</button>
        </div>
      </div>
    </div>
  );
}

export default App;
