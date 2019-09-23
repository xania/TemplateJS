import { ITemplate, IDriver, Binding } from "./driver.js"
import { IExpression } from "./expression.js"
import arrayComparer from "storejs/src/array-comparer";
import { renderMany } from "./index.js";

type IteratorProps<T> = { source: IExpression<T[]> | T[] }

type ItemTemplate = (child: any) => any;

export default function Iterator<T>(props: IteratorProps<T>, itemTemplates: ItemTemplate[]): IteratorTemplate<T> {
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
            const bindings = [];
            const itemBindings = source.map(item => renderMany(scopeDriver, itemTemplates.map(template => template(item))));
            for (var e = 0; e < itemBindings.length; e++) {
                bindings.push(itemBindings[e]);
            }
            return {
                dispose() {
                    for (var i = 0; i < bindings.length; i++) {
                        bindings[i].dispose();
                    }
                }
            }
        } else {
            const bindings: Binding[][] = [];
            const observer = source.lift((value, prevValue) => {
                const mutations = arrayComparer(value, prevValue);
                if (mutations.length === 0)
                    return prevValue;
                ;

                for (var i = 0; i < mutations.length; i++) {
                    var mut = mutations[i];
                    if (mut.type === "insert") {
                        // TODO asProxy is assumed but needs to be typesafe
                        var item: any = (source.property(mut.index, true) as any).asProxy();
                        var itemBindings = renderMany(scopeDriver, itemTemplates.map(template => template(item)));
                        itemBindings.push(item);
                        bindings.splice(mut.index, 0, itemBindings);
                    } else if (mut.type === "remove") {
                        const itemBindings = bindings[mut.index];
                        for (var e = 0; e < itemBindings.length; e++) {
                            itemBindings[e].dispose();
                        }
                        bindings.splice(mut.index, 1);
                    } else if (mut.type === "move") {
                        var tmp1 = bindings[mut.from];
                        bindings[mut.from] = bindings[mut.to];
                        bindings[mut.to] = tmp1;
                    }
                }

                return value && value.slice ? value.slice(0) : [ value ];
            });

            return {
                dispose() {
                    observer.dispose();
                    for (var i = 0; i < bindings.length; i++) {
                        const itemBindings = bindings[i];
                        for (var e = 0; e < itemBindings.length; e++) {
                            itemBindings[e].dispose();
                        }
                    }
                }
            }
        }
    }
}
