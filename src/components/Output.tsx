import React from 'react'
import { useListener } from '../utils';

interface OutputProps {
    content: string,
    setContent: React.Dispatch<React.SetStateAction<string>>,
}

const Output: React.FC<OutputProps> = props => {
    useListener<string>('output', ev => {
        props.setContent(state => state + ev.payload);
    });

    return (
        <div className="panel-content">
            <pre id="output" className="hljs">
                {props.content}
            </pre>
        </div>
    )
}

export default Output
