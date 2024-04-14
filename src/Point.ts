export class Point {
    private _x: number
    private _y: number

    constructor(x: number, y: number) {
        this._x = x
        this._y = y
    }

    get x(): number {
        return this._x;
    }

    set x(value: number) {
        this._x = value;
    }

    get y(): number {
        return this._y;
    }

    set y(value: number) {
        this._y = value;
    }

    static createPoint(point: Point, width: number, height: number): Point {
        return new Point(point.x + width, point.y + height)
    }

    static getWidth(pointOne: Point, pointTwo: Point): number {
        return pointOne.x - pointTwo.x
    }

    static getHeight(pointOne: Point, pointTwo: Point): number {
        return pointOne.y - pointTwo.y
    }
}