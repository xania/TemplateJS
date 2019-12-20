import { ITemplate, Binding, IDriver, disposeMany, children } from "./driver";
import { ProxyOf, IExpression, asProxy, ListItem, refresh } from "storejs"
import { renderStack, asTemplate } from "templatejs/views";
import { Unsubscribable } from "./expression";

type Disposable = { dispose(): any };
type ListSource<T> =
    {
        value?: T[],
        lift<U>(comparer: (newValue: T[], oldValue: U) => U): Disposable,
        properties?: IExpression<T>[];
    };

type ItemTemplate<T> = (context: ProxyOf<T>) => ITemplate[];
export default function List<T>(props: { source: ListSource<T> | T[] }, _children: ItemTemplate<T>[]) {
    return {
        render(driver: IDriver) {
            const { source } = props;

            if (source === null || source === undefined)
                return null;

            if (Array.isArray(source)) {
                return renderFixed(driver, source);
            }

            return renderObservable(driver, source);
        }
    }

    function renderFixed(driver: IDriver, source: T[]) {
        const allBindings: Binding[] = [];
        for (let i = 0; i < source.length; i++) {
            const context = new ListItem<T>(source[i], i);
            const bindings = renderStack(
                flatTree(_children, asProxy(context), dispose).map(template => ({ driver, template })).reverse()
            );

            function dispose() {
                disposeMany(bindings);
            }

            allBindings.push.apply(allBindings, bindings);
        }
        return {
            dispose() {
                for (let i = 0; i < allBindings.length; i++) {
                    allBindings[i].dispose();
                }
            }
        }
    }

    type ItemState = {
        context: ListItem<T>,
        bindings: Binding[],
        scope: IDriver,
        subscr: Unsubscribable
    }

    function renderObservable(driver: IDriver, source: ListSource<T>) {
        const scope = driver.createScope();
        const states: ItemState[] = [];

        const liftBinding = source.lift((newArray) => {
            for (let index = 0; index < newArray.length; index++) {
                const childValue = newArray[index];
                const state = states[index];
                if (state) {
                    // update
                    state.context.update(childValue);
                } else {
                    // insert
                    const context = new ListItem<T>(childValue, index);
                    const itemScope = scope.createScope(index);
                    const bindings = renderStack(
                        flatTree(_children, asProxy(context), dispose).map(
                            template => ({ driver: itemScope, template })
                        ).reverse()
                    );

                    const state = {
                        context,
                        bindings,
                        scope: itemScope,
                        subscr: null
                    };
                    states.splice(index, 0, state);

                    function dispose() {
                        const idx = states.indexOf(state);
                        if (idx >= 0) {
                            newArray.splice(idx, 1);
                            disposeItemState(idx);
                            refresh(source);
                        }
                    }

                    state.subscr = context.subscribe(val => {
                        const index = states.indexOf(state);
                        if (index >= 0) {
                            newArray[index] = val;
                            refresh(source);
                        }
                    });
                }
            }
            for (let index = states.length - 1; index >= newArray.length; index--) {
                disposeItemState(index);
            }

            return null;
        });

        function disposeItemState(index: number) {
            const { scope, bindings, subscr } = states[index];

            if (subscr)
                subscr.unsubscribe();

            scope.dispose();
            disposeMany(bindings);
            // if (bindings) {
            //     for (var e = 0; e < bindings.length; e++) {
            //         bindings[e].dispose();
            //     }
            // }
            states.splice(index, 1);
        }

        return {
            dispose() {
                liftBinding.dispose();
                scope.dispose();
                for (let i = 0; i < states.length; i++) {
                    const { bindings, subscr } = states[i];
                    if (subscr)
                        subscr.unsubscribe();
                    disposeMany(bindings);
                }
            }
        }
    }
}

function flatTree<T>(source: T[], context: any, dispose): ITemplate[] {
    const stack = [source as any];
    const result: ITemplate[] = [];

    while (stack.length > 0) {
        const curr = stack.pop();
        if (window.Array.isArray(curr)) {
            for (let i = curr.length - 1; i >= 0; i--) {
                stack.push(curr[i]);
            }
        } else if (typeof curr === 'function') {
            const retval = curr.call(curr, context, dispose);
            stack.push(retval);
        } else {
            result.push(asTemplate(curr) as ITemplate);
        }
    }

    return result;
}

function swap(array: any[], from: number, to: number) {
    const tmp = array[from];
    array[from] = array[to];
    array[to] = tmp;
}

function removeItem<T>(array: T[], item: T) {
    const idx = array.indexOf(item);
    if (idx >= 0) {
        array.splice(idx, 1);
    }
    return idx;
}
