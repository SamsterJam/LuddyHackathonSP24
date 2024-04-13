export class Point {
    private _x: Number
    private _y: Number

    constructor(x: Number, y: Number) {
        this._x = x
        this._y = y
    }

    get x(): Number {
        return this._x;
    }

    set x(value: Number) {
        this._x = value;
    }

    get y(): Number {
        return this._y;
    }

    set y(value: Number) {
        this._y = value;
    }
}