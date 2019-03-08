import { ITemplate, IDriver, renderAll } from "./driver.js"
import { IExpression, ObservableArray, Unsubscribable } from "./expression.js"


type IteratorProps<T> = { source: ObservableArray<T> | T[] }

export default function <T>(props: IteratorProps<T>, children: any[]): ITemplate {
    return new IteratorTemplate<T>(props.source, children);
}

class IteratorTemplate<T> implements ITemplate {
    constructor(public source: ObservableArray<T> | T[], public children: any[]) {
    }

    render(driver: IDriver) {
        const iterator = this.source;
        const { children } = this;
        const childrenLength = children.length;

        const scope = driver.createScope("-- List Boundary --");
        const scopeDriver = scope.driver();

        const subscriptions: Unsubscribable[] = [];

        if (Array.isArray(iterator)) {
            for (var i = 0; i < iterator.length; i++) {
                const subs = insertAt(iterator[i], i);
                subscriptions.push(subs);
            }
        } else {
            const subscription = iterator.subscribe({
                next(_, mutations) {
                    for (var i = 0; mutations && i < mutations.length; i++) {
                        var mut = mutations[i];
                        if (mut.type === "insert") {
                            const subs = insertAt(mut.item, mut.index);
                            subscriptions.splice(mut.index, 0, subs);
                        } else if (mut.type === "remove") {
                            if (mut.index < subscriptions.length) {
                                subscriptions[mut.index].unsubscribe();
                                subscriptions.splice(mut.index, 1);
                            }
                        } else if (mut.type === "move") {
                            let swap = subscriptions[mut.from];
                            subscriptions[mut.from] = subscriptions[mut.to];
                            subscriptions[mut.to] = swap;
                        } else {
                            throw new Error("")
                        }
                    }
                    // scopeDriver.applyMutations(mutations);
                }
            });
            subscriptions.push(subscription);
        }

        return {
            dispose() {
                for(var i=0 ; i<subscriptions.length ; i++) {
                    subscriptions[i].unsubscribe();
                }
            }
        }

        return scope;

        function insertAt(item, index) {

            const bindings = [];

            for (let i = 0; i < childrenLength; i++) {
                let child = children[i];
                let binding = renderAll(scopeDriver, typeof child === "function" ? child(item) : child, index);
                bindings.push(binding);
            }

            return {
                unsubscribe() {
                    for (let n = 0; n < bindings.length; n++) {
                        bindings[n].dispose();
                    }
                }
            }
        }

        function moveTo(fromIndex: number, toIndex: number) {
            console.log({ fromIndex, toIndex });
        }
    }
}
