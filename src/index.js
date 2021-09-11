import React, { useState, createContext, useRef, useEffect } from 'react';

import { Input } from "./components/Input";

import styles from "./styles.module.css";

export const ConsoleContext = createContext({});


const Console = ({
    programs,
    prompt = "$\u00a0",
    tabComplete,
    style,
    motd
}) => {
    const [history, setHistory] = useState([{
        current: "",
        original: "",
    }]);
    const [index, setIndex] = useState(0);
    const [stdout, setStdout] = useState(
        (!!motd && typeof motd === "string") ?
            motd.split('\n').map((s, i) => ({ value: s, key: `motd${i}` })) :
            []
    );

    const inputRef = useRef(null);
    const stdoutRef = useRef(null);

    const setCurrentCommand = command => {
        const _history = history.map(a => ({ ...a }));
        _history[index].current = command;
        setHistory(_history);
    };

    const incrementIndex = (by = 1) => {
        setIndex(Math.max(Math.min(index + by, history.length - 1), 0));
    };

    const executeCommand = (input) => {
        /* TODO: allow middleware for uses like globbing */
        const toAppendToStdout = [];
        const argv = input.split(/\s/);
        toAppendToStdout.push(`${prompt}${input}`);
        const program = argv[0];
        if (program.length > 0) {
            const matchedProgram = !!programs ? programs[program] : undefined;
            if (!matchedProgram) {
                toAppendToStdout.push(`${program}: command not found`);
            } else {
                /* TODO: figure out env?? */
                const output = matchedProgram({ argv });
                if (output) {
                    const lines = output.split("\n");
                    Array.prototype.push.apply(toAppendToStdout, lines);
                }
            }
        }
        appendToStdout(toAppendToStdout);
    };

    const pushCommand = () => {
        const _history = history.map(a => ({ ...a }));
        if (index === _history.length - 1) {
            _history[index].original = _history[index].current;
        } else {
            _history[_history.length - 1] = {
                original: _history[index].current,
                current: _history[index].current,
            }
            _history[index].current = _history[index].original;
        }
        executeCommand(_history[index].current);
        _history.push({
            original: "",
            current: "",
        });
        setHistory(_history);
        setIndex(_history.length - 1);
    };

    const appendToStdout = payload => {
        let _stdout = stdout.map(s => ({ ...s }));
        if (payload instanceof Array) {
            _stdout = _stdout.concat(payload.map((s, i) => ({
                key: _stdout.length + i,
                value: s
            })));
        } else {
            _stdout.push({
                key: _stdout.length + 1,
                value: payload
            });
        }
        setStdout(_stdout);
    };

    const consoleState = {
        history, index,
        stdout, prompt,
        setCurrentCommand, incrementIndex,
        pushCommand, appendToStdout, setStdout,
    };

    useEffect(() => {
        if (stdoutRef.current) {
            stdoutRef.current.scrollTop = stdoutRef.current.scrollHeight;
        }
    }, [stdout]);

    return (
        <div className={styles.console} style={style}
            onClick={e => {
                inputRef.current.focus();
            }}>
            <ConsoleContext.Provider value={consoleState}>
                <div
                    className={styles.stdout}
                    ref={stdoutRef}
                >
                    {stdout.map(s => <span
                        className={styles.stdoutLine}
                        key={s.key}
                    >
                        {s.value}
                    </span>
                    )}
                </div>
                <Input
                    style={{ backgroundColor: style.backgroundColor, color: style.color, fontFamily: style.fontFamily }}
                    inputRef={inputRef} tabComplete={tabComplete}
                />
            </ConsoleContext.Provider>
        </div>
    )

};

export default Console;