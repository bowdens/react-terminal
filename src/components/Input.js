import React, { useContext, useRef, useState } from "react";
import { ConsoleContext } from "..";
import styles from "../styles.module.css";


export const Input = ({ tabComplete, inputRef, style }) => {
    const [tabsInARow, setTabsInARow] = useState(0);

    const {
        history, index, prompt,
        setCurrentCommand,
        pushCommand,
        incrementIndex,
        setStdout
    } = useContext(ConsoleContext);

    const currentCommand = history[index];

    const inputValue = currentCommand.current;

    const handleChange = e => {
        e.preventDefault();
        const command = e.target.value;
        setCurrentCommand(command);
    };

    const handleSubmit = e => {
        e.preventDefault();
        pushCommand();
    };

    const handleKeyDown = e => {
        let wasTab = false;
        if (e.altKey) {
            e.preventDefault();
            // todo: handle word separated shortcuts like alt+f and alt+b
        } else if (e.ctrlKey) {
            // handle control keys
            e.preventDefault();
            switch (e.key) {
                case "a":
                    inputRef.current.setSelectionRange(
                        inputRef.current.value.length,
                        inputRef.current.value.length,
                    );
                    break;
                case "b":
                    const newSelectionStart = Math.max(
                        inputRef.current.selectionStart - 1, 0
                    );
                    inputRef.current.setSelectionRange(
                        newSelectionStart, newSelectionStart
                    );
                    break;
                case "c":
                    setCurrentCommand("");
                    break;
                case "e":
                    inputRef.current.setSelectionRange(0, 0);
                    break;
                case "f":
                    inputRef.current.setSelectionRange(
                        inputRef.current.selectionStart + 1,
                        inputRef.current.selectionStart + 1
                    );
                    break;
                case "l":
                    setStdout([]);
                    break;
            }
        } else if (e.key.length !== 1) {
            switch (e.key) {
                case "ArrowUp":
                    incrementIndex(-1);
                    e.preventDefault();
                    break;
                case "ArrowDown":
                    incrementIndex();
                    e.preventDefault();
                    break;
                case "Tab":
                    setTabsInARow(tabsInARow + 1);
                    const newValue = tabComplete instanceof Function ?
                        tabComplete(
                            inputRef.current.value,
                            tabsInARow
                        )
                        :
                        undefined;
                    if (newValue instanceof String && newValue !== inputValue) {
                        setCurrentCommand(newValue);
                    }
                    wasTab = true;
            }
        }

        if (!wasTab) {
            setTabsInARow(0);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.inputLine}>
            <span className={styles.prompt} style={style}>
                {prompt}
            </span>
            <input type="text"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                ref={inputRef}
                className={styles.commandInput}
                style={style}
            />
        </form>
    );
}