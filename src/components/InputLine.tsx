import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import './InputLine.css';

type InputLineProps = {
    prompt: string;
    submitLine: (input: string) => void;
    clear: unknown;
    style: CSSProperties;
};

export const InputLine: React.FC<InputLineProps> = (props) => {
    const [inputText, setInputText] = useState('');
    const id = 'stdin-input';
    const self = () => document.getElementById(id)!;

    const enterPressed = useRef(false);

    useEffect(() => {
        setInputText('');
    }, [props.clear]);

    const handleInputChange = (event: React.FocusEvent) => {
        const content = event.target.textContent || '';
        console.log(content);

        if (enterPressed.current) {
            props.submitLine(content);
            setInputText('');
            enterPressed.current = false;
            self().focus();
            return;
        }

        setInputText(content);
    };

    const handleInputKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === 'Enter') {
            // Handle the input when the Enter key is pressed
            event.preventDefault();
            enterPressed.current = true;
            self().blur();
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            self().textContent = self().textContent + '    ';
            document.getSelection()!.modify('move', 'forward', 'line');
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            self().blur();
        }
    };

    const promptLength = prompt.length + 2 + 'ch';
    const inputAreaStyle = {
        marginLeft: promptLength,
        width: `calc(100% - ${promptLength})`,
    };

    return (
        <span style={props.style}>
            <span className="prompt">{props.prompt}</span>
            <span
                id={id}
                style={inputAreaStyle}
                contentEditable
                onBlur={handleInputChange}
                onKeyDown={handleInputKeyDown}
                suppressContentEditableWarning
            >
                {inputText}
            </span>
        </span>
    );
};
