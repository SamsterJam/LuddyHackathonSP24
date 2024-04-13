import { Entry } from "./Entry.js"

export class Config {
    private _input: string;
    private _output: string;
    private _entries: Entry[];

    constructor(input: string, output: string) {
        this._input = input
        this._output = output
        this._entries = []
    }

    get input(): string {
        return this._input;
    }

    set input(value: string) {
        this._input = value;
    }

    get output(): string {
        return this._output;
    }

    set output(value: string) {
        this._output = value;
    }

    get entries(): Entry[] {
        return this._entries;
    }

    addEntry(entry: Entry): void {
        this._entries.push(entry)
    }

    removeEntry(entry: Entry): void {
        this._entries = this.entries.filter(e => e != entry)
    }
}