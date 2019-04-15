import { ITemplate, IDriver, Binding, BindingValue, isSubscribable, Subscribable, renderMany } from "./driver.js"
import { asTemplate, FragmentTemplate, EmptyTemplate } from "./index.js";

export default function If(props: { condition: BindingValue<boolean> }, children: ITemplate[]) {
    if (isSubscribable(props.condition)) {
        return new ConditionalTemplate(props.condition, children.map(asTemplate));
    } else {
        if (props.condition)
            return new FragmentTemplate(children);
        else
            return new EmptyTemplate();
    }
}

class ConditionalTemplate implements ITemplate {
    constructor(public expr: Subscribable<boolean>, public _children: ITemplate[]) {
    }

    render(driver: IDriver): Binding {
        const scopeDriver = driver.createScope("--- conditional ---").driver();
        let inner: Binding[] = null;
        this.expr.subscribe(visible => {
            if (visible) {
                inner = inner || renderMany(scopeDriver, this._children);
            } else if (inner) {
                for(var i=0 ; i<inner.length ; i++) {
                    inner[i].dispose();
                }
                inner = null;
            }
        });


        return {
            driver() {
                return scopeDriver;
            },
            dispose() {
                // conditionalDriver.dispose();
            }
        }
    }
}
