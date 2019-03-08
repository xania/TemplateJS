import { ITemplate, IDriver, Binding } from "./driver.js"
import { asTemplate, FragmentTemplate } from "./index.js"

declare type Subscription = { unsubscribe() };
declare type Observer<T> = (value: T) => any;
declare type Subscribable<T> = { subscribe: (observer: Observer<T>) => Subscription };

interface IfProps {
    condition: boolean | Subscribable<boolean>
}

export default function (props: IfProps, children?: any[]): ITemplate {
    return new IfTemplate(props, children.map(asTemplate));
}


class IfTemplate implements ITemplate {
    constructor(public props: IfProps, public children: ITemplate[]) {
    }

    render(driver: IDriver) {
        const self = this;
        const fragment = new FragmentTemplate(this.children);

        if (!isSubscribable(self.props.condition)) {
            if (self.props.condition) {
                return fragment.render(driver);
            } else {
                return { dispose () {} };
            }
        }

        const scope = driver.createScope("if");
        const scopeDriver = scope.driver();
        let _binding = null;
        self.props.condition.subscribe(value => {
            if (value) {
                _binding = fragment.render(scopeDriver);
            } else if (_binding) {
                _binding.dispose();
                _binding = null;
            }
        })

        return {
            driver() {
                return scopeDriver;
            },
            dispose() {
                if (_binding) {
                    _binding.dispose();
                    this._binding = null;
                }
            }
        };
    }

}

function isSubscribable<T>(value: any | Subscribable<T>): value is Subscribable<T> {
    return value != null && typeof value === "object" && typeof value.subscribe === "function";
}