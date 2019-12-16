import { ITemplate, Binding, IDriver } from "./driver";
import arrayComparer, { move } from "storejs/src/array-comparer";
import { ProxyOf, IExpression, asProxy, ListItem, refresh } from "storejs"
import { renderStack, asTemplate } from "templatejs/views";

type Disposable = { dispose(): any };
type ListSource<T> =
    {
        value?: T[],
        lift<U>(comparer: (newValue: T[], oldValue: U) => U): Disposable,
        properties: IExpression<T>[];
    };

type ItemTemplate<T> = (context: ProxyOf<T>, dispose: () => void) => ITemplate[];
export default function List<T>(props: { source: ListSource<T> | T[] }, children: ItemTemplate<T>[]) {
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
            const context = new ListItem<T>(null, source, source[i]);
            const bindings = renderStack(
                flatTree(children, asProxy(context)).map(template => ({ driver, template })).reverse()
            );
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
        bindings: Binding[],
        context: ListItem<T>,
        driver: IDriver
    }

    function renderObservable(driver: IDriver, source: ListSource<T>) {
        const scope = driver.createScope('--- Array ---');

        const states: ItemState[] = [];

        function referenceEq(x:T, y:T) {
            return x === y;
        }

        const liftBinding = source.lift((newArray, prevArray: T[] = []) => {
            const mutations = arrayComparer(newArray, prevArray, referenceEq);
            for (var i = 0; i < mutations.length; i++) {
                const mut = mutations[i];
                if (mut.type === 'insert') {
                    const { index } = mut;
                    const childValue = newArray[index];
                    const context = new ListItem<T>(source, prevArray, childValue);
                    prevArray.splice(index, 0, childValue);

                    const scopeDriver = scope.driver(index);

                    const bindings = renderStack(
                        flatTree(children, asProxy(context)).map(
                            template => ({ driver: scopeDriver, template })
                        ).reverse()
                    );

                    // insert new state at index
                    states.splice(index, 0, { 
                        context, 
                        bindings, 
                        driver: scopeDriver
                    });
                }
                else if (mut.type === 'remove') {
                    const { index } = mut;
                    const { bindings } = states.splice(index, 1)[0];
                    if (bindings) {
                        for (var e = 0; e < bindings.length; e++) {
                            bindings[e].dispose();
                        }
                    }
                    prevArray.splice(index, 1);
                }
                else if (mut.type === 'move') {
                    const { from, to } = mut;
                    move(prevArray, from, to);
                    move(states, from, to);
                } else if (mut.type === 'update') {
                    const { index } = mut;
                    const { context } = states[index];
                    context.update(newArray[index]);
                }
            }
            return prevArray;
        });

        return {
            dispose() {
                liftBinding.dispose();
                for (let i = 0; i < states.length; i++) {
                    const { bindings } = states[i];
                    for (let e = 0; e < bindings.length; e++) {
                        bindings[e].dispose();
                    }
                }
            }
        }
    }
}

function flatTree<T>(source: T[], context: any): ITemplate[] {
    const stack = [source as any];
    const result: ITemplate[] = [];

    while (stack.length > 0) {
        const curr = stack.pop();
        if (window.Array.isArray(curr)) {
            for (let i = curr.length - 1; i >= 0; i--) {
                stack.push(curr[i]);
            }
        } else if (typeof curr === 'function') {
            const retval = curr.call(curr, context);
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
