import { ITemplate, IDriver, Binding, renderMany } from "./driver.js"
import { IExpression } from "./expression.js"
import arrayComparer from "storejs/src/array-comparer";

type IteratorProps<T> = { source: IExpression<T[]> | T[] }

type ItemTemplate = (child: any) => any;

export default function <T>(props: IteratorProps<T>, itemTemplates: ItemTemplate[]): IteratorTemplate<T> {
    return new IteratorTemplate<T>(props.source, itemTemplates);
}

class IteratorTemplate<T> implements ITemplate {
    constructor(public source: IExpression<T[]> | T[], public itemTemplates: ItemTemplate[]) {
    }

    render(driver: IDriver): Binding {
        const source = this.source;
        const { itemTemplates } = this;
        // const childrenLength = children.length;

        const scope = driver.createScope("-- List Boundary --");
        const scopeDriver = scope.driver();

        if (Array.isArray(source)) {
            const bindings = source.map(item => renderMany(scopeDriver, itemTemplates.map(template => template(item))));
            return {
                dispose() {
                    for (var i = 0; i < bindings.length; i++) {
                        bindings[i].dispose();
                    }
                }
            }
        } else {
            const bindings = [];
            const observer = source.lift((value, prevValue) => {
                const mutations = arrayComparer(value, prevValue);
                if (mutations.length === 0)
                    return prevValue;
                ;

                for (var i = 0; i < mutations.length; i++) {
                    var mut = mutations[i];
                    if (mut.type === "insert") {
                        var item: IExpression<T> = freeze(source.property(mut.index));
                        var binding = renderMany(scopeDriver, itemTemplates.map(template => template(item)));
                        bindings.splice(mut.index, 0, binding);
                    } else if (mut.type === "remove") {
                        bindings[mut.index].dispose();
                        bindings.splice(mut.index, 1);
                    } else if (mut.type === "move") {
                        var tmp1 = bindings[mut.from];
                        bindings[mut.from] = bindings[mut.to];
                        bindings[mut.to] = tmp1;
                    }
                }

                return value.slice(0);
            });

            return {
                dispose() {
                    for (var i = 0; i < bindings.length; i++) {
                        bindings[i].dispose();
                    }
                }
            }
        }

        // const subscriptions: Unsubscribable[] = [];

        // if (Array.isArray(iterator)) {
        //     for (var i = 0; i < iterator.length; i++) {
        //         const subs = insertAt(iterator[i], i);
        //         subscriptions.push(subs);
        //     }
        // } else {
        //     const subscription = iterator.subscribe({
        //         next(_, mutations) {
        //             for (var i = 0; mutations && i < mutations.length; i++) {
        //                 var mut = mutations[i];
        //                 if (mut.type === "insert") {
        //                     const subs = insertAt(mut.item, mut.index);
        //                     subscriptions.splice(mut.index, 0, subs);
        //                 } else if (mut.type === "remove") {
        //                     if (mut.index < subscriptions.length) {
        //                         subscriptions[mut.index].unsubscribe();
        //                         subscriptions.splice(mut.index, 1);
        //                     }
        //                 } else if (mut.type === "move") {
        //                     let swap = subscriptions[mut.from];
        //                     subscriptions[mut.from] = subscriptions[mut.to];
        //                     subscriptions[mut.to] = swap;
        //                 } else {
        //                     throw new Error("")
        //                 }
        //             }
        //             // scopeDriver.applyMutations(mutations);
        //         }
        //     });
        //     subscriptions.push(subscription);
        // }

        // return {
        //     dispose() {
        //         for(var i=0 ; i<subscriptions.length ; i++) {
        //             subscriptions[i].unsubscribe();
        //         }
        //     }
        // }

        // function insertAt(item, index) {

        //     const bindings = [];

        //     for (let i = 0; i < childrenLength; i++) {
        //         let child = children[i];
        //         let binding = renderAll(scopeDriver, typeof child === "function" ? child(item) : child);
        //         bindings.push(binding);
        //     }

        //     return {
        //         unsubscribe() {
        //             for (let n = 0; n < bindings.length; n++) {
        //                 bindings[n].dispose();
        //             }
        //         }
        //     }
        // }

        // function moveTo(fromIndex: number, toIndex: number) {
        //     console.log({ fromIndex, toIndex });
        // }
    }
}

function freeze<T>(expr: IExpression<T>) {
    return expr.lift((n, p) => p || n);
}