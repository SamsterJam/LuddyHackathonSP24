import { Entry } from "./Entry.js"

export class Config {
    private _input: string;
    private _output: string;
    private _entries: Entry[];
    private _active: boolean;

    constructor(input: string, output: string) {
        this._active = input != null && output != null
        this._input = input
        this._output = output
        this._entries = []
    }

    get input(): string {
        return this._input;
    }

    set input(value: string) {
        this._input = value;
        this._active = this._input != null && this._output != null
    }

    get output(): string {
        return this._output;
    }

    set output(value: string) {
        this._output = value;
        this._active = this._input != null && this._output != null
    }

    get entries(): Entry[] {
        return this._entries;
    }

    get totalEntries(): number {
        return this._entries.length
    }

    addEntry(entry: Entry): void {
        this._entries.push(entry)
    }

    removeEntry(entry: Entry): void {
        this._entries = this.entries.filter(e => e != entry)
    }

    getEntry(n: number): Entry {
        if (n <= this._entries.length) {
            return this._entries[n - 1]
        } else return null
    }

    isActive(): boolean {
        return this._active
    }

    clearEntries() {
        this._entries = []
    }
}