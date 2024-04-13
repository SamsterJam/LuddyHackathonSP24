import { Point } from "./Point.js"

export class Entry {
    private _text: string
    private _pointOne: Point
    private _pointTwo: Point

    constructor (text: string, pointOne: Point, pointTwo: Point) {
        this._text = text
        this._pointOne = pointOne
        this._pointTwo = pointTwo
    }

    get text(): string {
        return this._text;
    }

    set text(value: string) {
        this._text = value;
    }

    get pointOne(): Point {
        return this._pointOne;
    }

    set pointOne(value: Point) {
        this._pointOne = value;
    }

    get pointTwo(): Point {
        return this._pointTwo;
    }

    set pointTwo(value: Point) {
        this._pointTwo = value;
    }
}