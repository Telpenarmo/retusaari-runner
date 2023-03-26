import React from 'react';
import { useListener } from '../utils';
import './Output.css';

interface OutputProps {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  status: StatusClass;
}

type StatusClass = 'default' | 'error';

const Output: React.FC<OutputProps> = (props) => {
    useListener<string>('output', (ev) => {
        props.setContent((state) => state + ev.payload);
    });

    return (
        <div className="panel-content">
            <pre id="output" className={`hljs ${props.status}`}>
                {props.content}
            </pre>
        </div>
    );
};

export default Output;
