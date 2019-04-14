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
                        var item: IExpression<T> = source.property(mut.index, true);
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
    }
}
