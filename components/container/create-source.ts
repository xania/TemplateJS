import * as Rx from "rxjs";
import * as Ro from "rxjs/operators";
import { Updatable, Expression, Updater } from "storejs";
import { ContainerSource, Mutation } from "templatejs/components/container";

export function createContainerSource<T>(
    updatable: Expression<T[]> & Updatable<T[]>
): ContainerSource<T> {
    const mutations = new Rx.Subject<Mutation<T>>();
    
    return {
        add(values: T | Mutation<T>) {
            if (isMutation(values)) {
                mutations.next(values);
            } else {
                mutations.next({
                    type: 'push',
                    values
                });
            }
        },
        subscribe(...args: any[]) {
            const result = mutations.pipe(
                Ro.tap(applyMutation),
                Ro.merge(updatable.lift((arr, prev: any) => {
                    if (Array.isArray(arr)) {
                        if (prev && prev.items) {
                            if (prev.items === arr) {
                                return prev;
                            }
                        }
                        return resetMutation(arr);
                    }
                }))
            );
            return result.subscribe.apply(result, args);
        },
    };

    function applyMutation(mut: Mutation<T>) {
        if (mut.type === "push") {
            const { values } = mut;
            updatable.update((arr) => {
                if (Array.isArray(arr))
                    arr.push(values);
                else
                    return [ values ];
            });
        } else if (mut.type === "remove") {
            const { index } = mut;
            updatable.update((arr) => {
                arr.splice(index, 1);
            });
        }
    }

    function pushMutation(values: T) {
        return { type: "push", values };
    }

    function resetMutation(items: T[]) {
        return { type: 'reset', items };
    }
}


function isMutation(m: any): m is Mutation {
    if (!m) {
        return false;
    }
    const type: Prop<Mutation, 'type'> = m.type;
    return type === 'remove' || type === 'push' || type === 'insert' || type === 'reset';
}

type Prop<T, K extends keyof T> = T[K];
