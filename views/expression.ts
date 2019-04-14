type NextObserver<T> = { next(value?: T): void }

export interface IExpression<T> {
    value?: T,
    property<K extends keyof T>(propertyName: K): IExpression<T[K]>;
    property<K extends keyof T>(propertyName: K, immutable: true): IExpression<T[K]>;
    subscribe(observer: NextObserver<T>): Unsubscribable;
    lift<U>(project: (value: T, prev) => U): IExpression<U>
    dispose();
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
