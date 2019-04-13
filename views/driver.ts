import { asTemplate, FragmentTemplate, EmptyTemplate } from "templatejs/views";

declare type Subscription = { unsubscribe() };
declare type Observer<T> = (value: T) => any;
declare type Subscribable<T> = { subscribe: (observer: Observer<T>) => Subscription };

export type Executable<T> = { execute: (e: T) => any } | Function
export type BindingValue<T> = T | Subscribable<T>;

export interface IDriver {
    createElement(name: string, init?: Action<any>): TagElement;
    createNative(value: any): TextElement;
    createAttribute(name: string, value: any): TextElement;
    createEvent(name: string, value: Executable<any> | Function): TagEvent;
    createScope(name: string): ScopeElement;
}

export interface TagEvent {
    dispose();
}
export interface TagElement {
    ready?();
    driver?(): IDriver;
    dispose();
}

export interface TextElement {
    dispose();
}

export interface ScopeElement {
    driver(): IDriver;
    dispose();
}

export declare type Props = { [key: string]: any }
export declare type Element = TagElement | TextElement | ScopeElement
export type Primitive = string | number | boolean | Date

export function isPrimitive(value: any): value is Primitive {
    if (value === null || value === undefined)
        return false;

    return typeof value === "number" || typeof value === "string" || typeof value === "boolean" || value instanceof Date
}

declare type Action<T> = (arg: T) => any;

export interface ITemplate {
    render(driver: IDriver, init?: Action<any>): Binding;
    children?: ITemplate[];
}

export interface Binding {
    children?: ITemplate[];
    driver?(): IDriver;
    dispose();
}

export function renderAll(rootDriver: IDriver, rootTpl: ITemplate) {
    return renderStack([{ driver: rootDriver, template: rootTpl }]);
}

type StackItem = { driver: IDriver, template: ITemplate };
export function renderStack(stack: StackItem[]) {
    const bindings = [];

    while (stack.length) {
        const { driver, template } = stack.pop();
        const binding = template.render(driver);
        if (binding) {
            bindings.push(binding);
            if (binding.driver) {
                const { children } = template;
                if (children) {
                    var childDriver = binding.driver();
                    if (childDriver) {
                        for (var i = children.length - 1; i >= 0; i--) {
                            stack.push({ driver: childDriver, template: asTemplate(children[i]) });
                        }
                    }
                }
            }
        }
    }

    for (var i = 0; i < bindings.length; i++) {
        const binding = bindings[i];
        if (binding['ready'])
            binding.ready();
    }


    return {
        dispose() {
            for (var i = 0; i < bindings.length; i++) {
                bindings[i].dispose();
            }
            // conditionalDriver.dispose();
        }
    }
}

export function renderMany(driver: IDriver, children: ITemplate[]): Binding {
    var stack = children.map(template => ({
        driver,
        template
    }))

    return renderStack(stack);
}

export function init(view: ITemplate, callback) {
    return {
        children: view.children,
        render(driver: IDriver) {
            return view.render(driver, callback);
        }
    };
}

export function isSubscribable<T>(value): value is Subscribable<T> {
    return value && typeof value.subscribe === "function";
}

export function Conditional(props: { expr: BindingValue<boolean> }, children: ITemplate[]) {
    if (isSubscribable(props.expr)) {
        return new ConditionalTemplate(props.expr, children.map(asTemplate));
    } else {
        if (props.expr)
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
        let inner = null;
        this.expr.subscribe(visible => {
            if (visible) {
                inner = inner || renderMany(scopeDriver, this._children);
            } else if (inner) {
                inner.dispose();
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
