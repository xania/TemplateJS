import { IExpression } from "storejs";

type NextObserver<T> = { next(value?: T): void }

type Action<T> = (value: T) => void;
type Func<T, U> = (a: T) => U;

export interface Updatable<T> {
    // name: string | number;
    update(value: T | Func<T, T | void>): boolean;
    tap(action: Action<T>): boolean;
}

export interface IProperty<T> extends IExpression<T>, Updatable<T> {
    // name: string | number;
}

export interface PartialObserver<T> {
    next?: (value: T) => void;
    error?: (err: any) => void;
    complete?: () => void;
}


type ArrayMutation<T> = (
    { type: "insert", item: IExpression<T>, index: number } |
    { type: "remove", item: IExpression<T>, index: number } |
    { type: "move", item: IExpression<T>, from: number, to: number }
);

export type Unsubscribable = { unsubscribe() }

export interface ObservableArray<T> {
    subscribe(observer: NextArrayMutationsObserver<T>): Unsubscribable;
};

type ItemOf<T> = T extends any[] ? T[number] : T;
type ArrayMutationsCallback<T> = (array: T, mutations?: ArrayMutation<ItemOf<T>>[] ) => any;

type NextArrayMutationsObserver<T> = {
    next: ArrayMutationsCallback<T>;
};
