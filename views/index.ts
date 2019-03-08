import { Binding, Props, ITemplate, IDriver, Primitive, isPrimitive, renderAll, Executable } from './driver.js';
import { IExpression } from "./expression.js"

declare type Subscription = { unsubscribe() };
declare type Observer = (value) => any;
declare type Subscribable = { subscribe: (observer: Observer) => Subscription };
declare type PureComponent = (props: Props, children: ITemplate[]) => ITemplate
declare type Func<T> = (arg: T) => any;

export function tpl(name: string | PureComponent, props: Props, ...children: any[]): ITemplate {
    if (typeof name === "string") {
        return new TagTemplate(name, children && children.map(asTemplate).concat(props ? attributes(props) : []))
    } else if (typeof name === "function") {
        return component(name, props, children);
    } else if (Array.isArray(name)) {
        return new FragmentTemplate((name as any[]).map(asTemplate))
    } else {
        throw Error("not supported")
    }
}

function component(type, props, children) {
    var obj = Reflect.construct(type, [props, children]);
    return asTemplate(obj);
}

export class FragmentTemplate implements ITemplate {
    constructor(public children?: ITemplate[]) {
    }

    render(driver: IDriver) {
        const { children } = this;
        if (!children)
            return;

        const bindings = [];
        for (let i = 0; i < children.length; i++) {
            const childBinding = renderAll(driver, children[i], i);
            bindings.push(childBinding);
        }

        return {
            driver() {
                return driver;
            },
            dispose() {
                for (let i = 0; i < bindings.length; i++) {
                    bindings[i].dispose();
                }
            }
        }
    }
}

export class TemplateObservable<T> implements ITemplate {
    constructor(public observable: Subscribable) {
    }

    render(driver: IDriver): Binding {
        const { observable } = this;
        let binding = null;
        var scope = driver.createScope("observable");
        var scopeDriver = scope.driver();
        const subscr = observable.subscribe(
            value => {
                if (binding) {
                    binding.dispose();
                }
                binding = renderAll(scopeDriver, asTemplate(value));
            }
        );

        return {
            dispose() {
                subscr.unsubscribe();
                scope.dispose();
            }
        }
    }
}

class TemplatePromise<T> implements ITemplate {
    constructor(public promise: Promise<T>) {
    }

    then<U>(fn: (value: T) => U | PromiseLike<U>): Promise<U> {
        return this.promise.then(fn);
    }

    render(driver: IDriver, ...args: any[]): Binding {
        var scope = driver.createScope("promise");
        var scopeDriver = scope.driver();
        const bindingPromise = this.promise.then(item => {
            const template = asTemplate(item);
            return renderAll(scope.driver(), template);
        })
        return {
            driver() {
                return scopeDriver;
            },
            dispose() {
                // dispose
                bindingPromise.then(binding => binding.dispose());
                scope.dispose();
            }
        }
    }
}

export function attributes(props: Props) {
    return props && Object.keys(props).map(key => new Attribute(key, props[key]))
}

const __emptyTemplate: ITemplate = {
    render() {
        return {
            dispose() { }
        } as Binding
    }
}

export function asTemplate(item: any): ITemplate {
    if (typeof item === "undefined" || item === null) {
        return __emptyTemplate;
    }
    else if (typeof item.render === "function")
        return item;
    else if (typeof item === "function")
        return functionAsTemplate(item);
    else if (Array.isArray(item)) {
        var flat: ITemplate[] = [];
        var stack = [];

        for (let i = item.length - 1; i >= 0; i--) {
            stack.push(item[i]);
        }

        while (stack.length > 0) {
            var curr = stack.pop();
            if (Array.isArray(curr)) {
                for (let i = curr.length - 1; i >= 0; i--) {
                    stack.push(curr[i]);
                }
            } else {
                flat.push(asTemplate(curr));
            }
        }
        return new FragmentTemplate(flat);
    }
    else if (isPromise(item))
        return new TemplatePromise(item);
    else if (isSubscribable(item))
        return new TemplateObservable(item);
    else if (item.view !== null && typeof item.view !== "undefined")
        return asTemplate(item.view);

    return new TextTemplate(item);
}

function isSubscribable(value): value is Subscribable {
    return value && typeof value.subscribe === "function";
}

function isPromise(value): value is Promise<any> {
    return value && typeof value.then === "function";
}

function isTemplate(value: any): value is ITemplate {
    return typeof value['render'] === "function"
}

function functionAsTemplate(func: Function): ITemplate {
    return {
        render(driver: IDriver, ...args) {
            const tpl = func(...args);
            return asTemplate(tpl).render(driver);
        }
    }
}

class TagTemplate implements ITemplate {
    constructor(public name: string, public children: ITemplate[]) {
    }

    render(driver: IDriver, index: number, init?: Func<any>) {
        let { name } = this;
        let elt = driver.createElement(name, index, init);
        return {
            children: this.children,
            ready() {
                return elt.ready();
            },
            driver() {
                return elt.driver()
            },
            dispose() {
                elt.dispose()
            }
        };
    }
}

class TextTemplate implements ITemplate {
    constructor(public value: Primitive | IExpression<Primitive>) {
    }

    render(driver: IDriver, idx: number): Binding {
        let { value } = this;

        if (isPrimitive(value)) {
            return driver.createText(value, idx);
        }
        else if (isSubscribable(value)) {
            let expr = value;
            let textElement = driver.createText(expr.value, idx);
            expr.subscribe(textElement);
            return textElement;
        }
        else {
            return driver.createText(JSON.stringify(value), idx);
        }
    }
}

class Attribute implements ITemplate {
    constructor(public name: string, public value: Primitive | IExpression<Primitive>) {
    }

    render(driver: IDriver) {
        let { name, value } = this;

        if (value === null || value === void 0)
            return;

        if (isPrimitive(value) || Array.isArray(value)) {
            return driver.createAttribute(name, value);
        }
        else if (typeof value === "function") {
            return driver.createEvent(name, value);
        }
        else if (isSubscribable(value)) {
            let expr = value;
            let attrElement = driver.createAttribute(name, expr.value);
            expr.subscribe(attrElement);
            return attrElement;
        }
        else {
            return driver.createAttribute(name, value.toString());
        }
    }
}
