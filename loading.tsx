import { BehaviorSubject, Unsubscribable, PartialObserver, Operator, OperatorFunction, Observable, Subject, from, pipe, Subscribable } from "rxjs"
import * as Ro from "rxjs/operators"

function isPromise(value): value is Promise<any> {
    return value && typeof value.then === "function";
}

export function Loading<T>(props: { view?: T }, children: Promise<T>[]) {
    const startWith = props && props.view;
    return (
        children.map(child => (
            (isPromise(child) ? from(child) : child)
                .pipe(
                    Ro.startWith(startWith || "loading...")
                )
        ))
    );
}

export class PipeSubject<U, T> implements Subscribable<T> {
    constructor(private input$: Subject<U>, private output$: Observable<T>) {
    }

    static create<U>() {
        var input$ = new Subject<U>();
        return new PipeSubject<U, U>(input$, input$);
    }

    next(value: U) {
        this.input$.next(value);
    }

    pipe<A>(op1: OperatorFunction<T, A>): PipeSubject<U, A>;
    pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): PipeSubject<U, B>;
    pipe<A, B, C>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): PipeSubject<U, C>;
    pipe<A, B, C, D>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): PipeSubject<U, D>;
    pipe<A, B, C, D, E>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): PipeSubject<U, E>;
    pipe<A, B, C, D, E, F>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>): PipeSubject<U, F>;
    pipe<A, B, C, D, E, F, G>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>): PipeSubject<U, G>;
    pipe<A, B, C, D, E, F, G, H>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>): PipeSubject<U, H>;
    pipe<A, B, C, D, E, F, G, H, I>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>): PipeSubject<U, I>;
    pipe<A, B, C, D, E, F, G, H, I>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>, ...operations: OperatorFunction<any, any>[]): PipeSubject<U, {}>;
    pipe(...operations: OperatorFunction<T, any>[]): PipeSubject<U, any> {
        const { output$ } = this;
        var piped$ = output$.pipe.apply(output$, operations);
        return new PipeSubject(this.input$, piped$);
    }

    subscribe(observer?: PartialObserver<T>): Unsubscribable;
    subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Unsubscribable;
    subscribe(...args) {
        const { output$ } = this;
        return output$.subscribe.apply(output$, args);
    }
}
