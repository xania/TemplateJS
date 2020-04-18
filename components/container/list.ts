import { State, Updatable, Store, flush, Expression, asProxy } from "storejs";
import { ITemplate } from "../../views/driver";
import Container, { ContainerSource } from ".";
import { createContainerSource } from "./create-source";
import { flatTree } from "./helpers";

type ListItemTemplate<T> = (context: State<T>) => ITemplate[];

interface ListProps<T> {
    source: Expression<T[]> & Updatable<T[]>;
    mutations?: ContainerSource<T>;
}

export default function List<T>(props: ListProps<T>, _children: ListItemTemplate<T>[]) {
    const { source } = props;
    const mutations = props.mutations || createContainerSource(source);

    const sourcePath: any[] = [];
    let elt: any = props.source;
    while(elt) {
        sourcePath.push(elt);
        elt = elt.parent;
    }

    return Container({ mutations }, [ itemTemplate ]);

    function itemTemplate(values: T, index: () => number) {
        const store = new Store(values);
        return [
            store.subscribe(notify, true),
            flatTree(_children, [ asProxy(store), { index, dispose } ])
        ]

        function notify() {
            flush(sourcePath);
        }

        function dispose() {
            const idx = index();
            if (idx >= 0) {
                mutations.add({
                    type: 'remove',
                    index: idx
                })
            }
        }
    }
}
