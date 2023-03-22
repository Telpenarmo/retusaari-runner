import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { Editor } from "./components/Editor";

function App() {
  return (
    <div className="row">
      <div className="container">

        <form
          className="editor-panel"
          onSubmit={(e) => {
            e.preventDefault();
          }}>

          <Editor code='function' onUpdate={() => { }} />

          <div className="row">
            <button type="submit">Run</button>
          </div>
        </form>

      </div>
      <div className="container">
      </div>
    </div>
  );
}

export default App;
