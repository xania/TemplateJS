import { ITemplate, IDriver, Binding, disposeMany } from "../../views/driver";
import { State, Subscribable, Store, ListItem } from "storejs";
import { renderStack } from "../../views";
import { flatTree } from "./helpers";

type Disposable = { dispose(): any };
export type Mutation<T = unknown> = PushItem<T> | InsertItem<T> | RemoveItem;
interface PushItem<T> {
    type: "push",
    values: T
}
interface InsertItem<T> {
    type: "insert",
    values: T,
    index: number
}
interface RemoveItem {
    type: "remove",
    index: number
}

type ItemTemplate<T> = (context: State<T>) => ITemplate[];
interface ContainerProps<T> {
    source?: ContainerSource<T>;
}
export default function Container<T>(props: ContainerProps<T>, _children: ItemTemplate<T>[]) {
    return {
        render(driver: IDriver) {
            const items: ContainerItem[] = [];
            const { source } = props;
            const rootScope = driver.createScope();
            return [
                source.subscribe(applyMutation),
                {
                    dispose() {
                        for(const item of items) {
                            const { scope, bindings } = item;
                            for(const binding of bindings) {
                                binding.dispose();
                            }
                            scope.dispose();
                        }
                    }
                }
            ];

            function applyMutation(m: Mutation<T>) {
                if(m.type === "push") {
                    const { values } = m;
                    applyInsert(values, items.length);
                }
                else if(m.type === "insert") {
                    const { values, index } = m;
                    applyInsert(values, index);
                }
                else if (m.type === 'remove') {
                    const idx = m.index;
                    const item = items[idx];
                    const { scope, bindings } = item;
                    scope.dispose();
                    disposeMany(bindings);
                    items.splice(idx, 1);
                }

                function applyInsert(values: T, index: number) {
                    const itemScope = rootScope.createScope(index);
                    const store = new Store(values);
                    const bindings = renderStack(
                        flatTree(_children, [ store, { index, dispose } ]).map(template => ({ driver: itemScope, template })).reverse()
                    );
                    bindings.push(store.subscribe(source.notify, true));
                    const item: ContainerItem = {
                        scope: itemScope,
                        bindings
                    }
                    items.splice(index, 0, item);
                    function dispose() {
                        const idx = items.indexOf(item);
                        if (idx >= 0) {
                            source.add({
                                type: 'remove',
                                index: idx
                            });
                        };
                    }
                }
            }

        }
    }
}

export interface ContainerSource<T> extends Subscribable<Mutation<T>> {
    add(values: T | Mutation<T>);
    notify();
}

interface ContainerItem {
    bindings: Binding[];
    scope: Disposable
}

export interface ContainerItemContext {
    dispose(): any;
    index: number;
}

