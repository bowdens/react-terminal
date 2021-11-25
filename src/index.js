import React, { useState, createContext, useRef, useEffect, useImperativeHandle } from 'react';

import { Input } from "./components/Input";

import styles from "./styles.module.css";

export const ConsoleContext = createContext({});

const Console = React.forwardRef(({
    programs,
    prompt = "$\u00a0",
    tabComplete,
    style,
    motd
}, ref) => {
    const [history, setHistory] = useState([{
        current: "",
        original: "",
    }]);
    const [index, setIndex] = useState(0);
    const [stdout, setStdout] = useState(
        (!!motd && typeof motd === "string")
            ? motd.split('\n').map((s, i) => ({ value: s, key: `motd${i}` }))
            : []
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

    // expose the execute to the parent
    useImperativeHandle(ref, () => ({
        pushCommand, appendToStdout
    }));

    const pushCommand = (command = null) => {
        if (command === null) {
            // if there's no command provided, execute whatever is at index
            // then push a new empty entry to the bottom and set the index to that
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
        } else {
            const _history = history.map(a => ({ ...a })).slice(0, -1);
            _history.push({
                original: command, current: command
            });
            _history.push({ ...history[history.length - 1] });
            executeCommand(command);
            setHistory(_history);
            if (index === history.length - 1) {
                // if we were editing the last item, increment the index to account for the new item
                setIndex(_history.length - 1);
            }
        }
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
                key: _stdout.length,
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
        // scroll the most recently entered command into view whenever stdout is updated
        stdoutRef.current
        if (stdoutRef.current) {
            stdoutRef.current.scrollTop = stdoutRef.current.scrollHeight;
        }
    }, [stdout]);

    const _tabComplete = (_value, ntabs)=>{
        // given the current value, if the number of tabs pressed is more than 1, 
        // try to match the current value with any of the provided programs or
        // tabComplete if provided (and is an array).
        if (ntabs === 0) return _value;
        const value = _value.split(/\s+/).slice(-1)[0];
        const indexOfLastWhitespace = _value.search(/\s[^\s]*/);
        const matches = (
            tabComplete instanceof Array 
                ? tabComplete
                : programs instanceof Object 
                    ? Object.keys(programs || {}) 
                    : []
        ).filter(p => typeof p === 'string' && p.startsWith(value));
        if (matches.length === 1) {
            return `${_value.slice(0, indexOfLastWhitespace+1)}${matches[0]}`;
        } else {
            for (const match of matches) {
                if (matches.reduce((a,v) => a & v.startsWith(match), true)) {
                    return `${_value.slice(0,indexOfLastWhitespace+1)}${match}`;
                }
            }
            appendToStdout(matches.join(" "))
            return _value;
        }
    }

    return (
        <div className={styles.console} style={style}
            ref={stdoutRef}
            onFocus={() => inputRef.current.focus()}
            onClick={() => inputRef.current.focus()}
        >
            <ConsoleContext.Provider value={consoleState}>
                <div
                    className={styles.stdout}
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
                    inputRef={inputRef} tabComplete={_tabComplete}
                />
            </ConsoleContext.Provider>
        </div>
    )
});

export default Console;