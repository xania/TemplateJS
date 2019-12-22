import { Binding, Props, ITemplate, IDriver, Primitive, isPrimitive, children, disposeMany } from './driver.js';
import { isDomNode, DomDriver } from './dom.js';
import { isNextObserver } from '../lib/helpers.js';
import { combine, IExpression, UnpackSubscribables } from 'storejs/index.js';

declare type Subscription = { unsubscribe() };
declare type Observer = (value) => any;
declare type Subscribable = { subscribe: (observer: Observer) => Subscription };
declare type PureComponent = (...args: any) => any
declare type Func<T> = (arg: T) => any;
declare type Attachable = { attach: (dom: HTMLElement) => { dispose(): any } }

type TemplateElement = Primitive | IExpression<Primitive> | string | PureComponent | ITemplate | { view: TemplateElement } | HTMLElement;
type TemplateInput = TemplateElement | TemplateElement[];

export function tpl(name: TemplateInput, props: Props = null, ...children: any[]): ITemplate | ITemplate[] {
    if (typeof name === "string") {
        return new TagTemplate(name, flatTree(children, asTemplate).concat(props ? attributes(props) : []));
    }

    if (typeof name === "function") {
        return asTemplate(
            construct(name, [props, children]) || name(props, children)
        );
    }

    return asTemplate(name);
}

export function lazy<T>(fn: () => T) {
    return {
        subscribe(observer) {
            var value = fn();
            if (isSubscribable(value)) {
                return value.subscribe(observer);
            }
            observer.next(value);
            return {
                unsubscribe() {
                    debugger;
                }
            }
        }
    };
}


function construct(func, args: any[]) {
    try {
        if (!func) return false;
        if (func === Symbol) return false
        return Reflect.construct(func, args);
    } catch (e) {
        return false;
    }
}


export function flatTree(tree: any[], project: (item: any) => any | any[]) {
    if (!Array.isArray(tree))
        return [];

    var retval: ITemplate[] = [];
    var stack = tree.reverse();

    while (stack.length > 0) {
        var curr = stack.pop();
        if (Array.isArray(curr)) {
            stack.push.apply(stack, curr.reverse());
        } else if (curr !== null && curr !== undefined) {
            const projected = project(curr);
            if (Array.isArray(projected)) {
                retval.push.apply(retval, projected);
            }
            else {
                retval.push(projected);
            }
        }
    }
    return retval;
}

function hasProperty<P extends string>(obj: any, prop: P): obj is { [K in P]: any } {
    return typeof obj === 'object' && obj !== null && prop in obj
}

export default tpl;

function component(type, props, children) {
    var obj = Reflect.construct(type, [props, children]);
    return asTemplate(obj);
}

export class FragmentTemplate implements ITemplate {
    constructor(public children?: ITemplate[]) {
        debugger;
    }

    render(driver: IDriver) {
        return {
            driver() {
                return driver;
            },
            dispose() {
            }
        }
    }
}

export class EmptyTemplate implements ITemplate {
    constructor() {
    }

    render(driver: IDriver) {
        return {
            driver() {
                return driver;
            },
            dispose() {
            }
        }
    }
}

class TemplateAttachable implements ITemplate {

    constructor(private attachable: Attachable) {
    }

    render(driver: DomDriver) {
        return this.attachable.attach(driver.target);
    }
}
class TemplateSubscription implements ITemplate {

    constructor(private subscription: Subscription) {
    }

    dispose() {
        return this.subscription.unsubscribe();
    }

    render(driver: IDriver) {
        return this;
    }
}

export class TemplateObservable<T> implements ITemplate {
    constructor(public observable: Subscribable) {
    }

    render(driver: IDriver): Binding {
        const { observable } = this;
        let bindings: Binding[] = null;
        const scope = driver.createScope();
        const subscr = observable.subscribe(
            value => {
                if (bindings && bindings.length === 1 && isPrimitive(value)) {
                    const binding = bindings[0]
                    if (isNextObserver(binding)) {
                        binding.next(value);
                        return;
                    }
                }
                disposeMany(bindings);
                bindings = render(scope, asTemplate(value));
            }
        );

        return {
            dispose() {
                subscr.unsubscribe();
                scope.dispose();
                disposeMany(bindings);
            }
        }
    }
}

class TemplatePromise<T extends TemplateInput> implements ITemplate {
    constructor(public promise: Promise<T>) {
    }

    then<U>(fn: (value: T) => U | PromiseLike<U>): Promise<U> {
        return this.promise.then(fn);
    }

    render(driver: IDriver): Binding {
        var scope = driver.createScope();
        var disposed = false;
        var loaded = false;
        var loadingBinding = null;
        const promise = this.promise;

        setTimeout(function () {
            if (loaded || disposed)
                return;

            loadingBinding = render(scope, tpl("div", { "class": "loading-placeholder" }))
            promise.then(_ => {
                disposeMany(loadingBinding);
            })
        }, 200);

        const bindingPromise = promise.then(item => {
            loaded = true;
            const template = asTemplate(item);
            return disposed ? null : render(scope, template);
        })
        return {
            driver() {
                return scope;
            },
            dispose() {
                disposed = true;
                scope.dispose();
                bindingPromise.then(disposeMany);
            }
        }
    }
}

function delay<T>(value: T, ms: number) {
    return new Promise<T>(resolve => {
        setTimeout(function () {
            resolve(value);
        }, ms);
    })
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

export function asTemplate(name: any): ITemplate | ITemplate[] {
    if (typeof name === "undefined" || name === null) {
        return __emptyTemplate;
    }
    else if (isTemplate(name))
        return name;
    else if (typeof name === "function")
        return functionAsTemplate(name);
    else if (Array.isArray(name))
        return flatTree(name, asTemplate);
    else if (isPromise(name))
        return new TemplatePromise(name);
    else if (isSubscribable(name))
        return new TemplateObservable(name);
    else if (isSubscription(name))
        return new TemplateSubscription(name);
    else if (isAttachable(name))
        return new TemplateAttachable(name);
    else if (hasProperty(name, 'view'))
        return asTemplate(name.view);

    return new NativeTemplate(name);
}

function isAttachable(value): value is Attachable {
    return value && typeof value.attach === "function";
}

function isSubscribable(value): value is Subscribable {
    return value && typeof value.subscribe === "function";
}

function isSubscription(value): value is Subscription {
    return value && typeof value.unsubscribe === "function";
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
            var template = asTemplate(tpl);
            if (Array.isArray(template)) {
                const bindings = [];
                for (let i = 0; i < template.length; i++) {
                    bindings.push(template[i].render(driver));
                }
                return {
                    dispose() {
                        for (let i = 0; i < bindings.length; i++) {
                            bindings[i].dispose();
                        }
                    }
                }
            } else {
                return template.render(driver);
            }
        }
    }
}

class TagTemplate implements ITemplate {
    constructor(public name: string, public children: ITemplate[]) {
    }

    render(driver: IDriver, init?: Func<any>) {
        let { name } = this;
        return driver.createElement(name, init);
    }
}

class NativeTemplate implements ITemplate {
    constructor(public value: Primitive | IExpression<Primitive> | HTMLElement) {
    }

    render(driver: IDriver): Binding {
        let { value } = this;

        if (isPrimitive(value)) {
            return driver.createNative(value);
        }
        else if (isSubscribable(value)) {
            let expr = value;
            let textElement = driver.createNative(null);
            expr.subscribe(textElement as any);
            return textElement;
        }
        else {
            return driver.createNative(value);
        }
    }
}

type AttributeValue = Primitive | IExpression<Primitive>;

class Attribute implements ITemplate {

    constructor(public name: string, public value: (AttributeValue | AttributeValue[]) | (() => AttributeValue | AttributeValue[])) {
    }

    render(driver: IDriver) {
        let { name, value } = this;

        if (value === null || value === void 0)
            return;



        if (typeof value === "function") {
            const eventBinding = driver.createEvent(name, value);
            if (eventBinding)
                return eventBinding;

            console.error("not a valid event " + name);
            value = value();
        }

        if (Array.isArray(value)) {
            const binding = driver.createAttribute(name, undefined);
            const observable = combine(value);
            const subscr = observable.subscribe(binding);

            return {
                dispose() {
                    subscr.unsubscribe();
                    binding.dispose();
                }
            }
        } else if (isSubscribable(value)) {
            const binding = driver.createAttribute(name, value.value);
            const subscr = value.subscribe(binding);
            return {
                dispose() {
                    subscr.unsubscribe();
                    binding.dispose();
                }
            }
        }
        else
            return driver.createAttribute(name, value);

        // else if (isSubscribable(value)) {
        //     let expr = value;
        //     let attrElement = driver.createAttribute(name, expr.value);
        //     const subscr = expr.subscribe(attrElement as any);
        //     if (!subscr || typeof subscr.unsubscribe !== 'function')
        //         return attrElement;

        //     return {
        //         dispose() {
        //             subscr.unsubscribe();
        //             attrElement.dispose();
        //         }
        //     }
        // }
        // else {
        //     return driver.createAttribute(name, value.toString());
        // }
    }
}

// function toAttributeValue(value: any) {
//     if (Array.isArray(value)) {
//         const state = new Store([]);
//         const subscriptions = [];
//         for (let i = 0; i < value.length; i++) {
//             const item = value[i];
//             if (item === null || item === undefined)
//                 continue;
//             if (isSubscribable(item)) {
//                 const stateIndex = state.value.length;
//                 subscriptions.push(
//                     item.subscribe(v => { state.update(arr => arr[stateIndex] = v) })
//                 );
//             } else {
//                 state.value.push(item);
//             }
//         };
//         if (subscriptions.length === 0)
//             return state.value;

//         return state;

//     } else {
//         return value;
//     }
// }


export function render(target: IDriver | HTMLElement, template: ITemplate | ITemplate[]): Binding[] {
    const driver = isDomNode(target) ? new DomDriver(target) : target
    return renderStack([{ driver, template }]);

    // return {
    //     [ children ]: bindings,
    //     // next(value) {
    //     //     for (var i = 0; i < bindings.length; i++) {
    //     //         var binding = bindings[i];
    //     //         if (binding && typeof binding.next == 'function')
    //     //             binding.next(value);
    //     //     }
    //     // },
    //     // dispose() {
    //     //     // disposeMany(bindings);
    //     // }
    // }
}

type StackItem = { driver: IDriver, template: ITemplate | ITemplate[] };
export function renderStack(stack: StackItem[]) {
    const bindings: Binding[] = [];

    while (stack.length) {
        const { driver, template } = stack.pop();
        if (template === null || template === undefined)
            continue;

        if (Array.isArray(template)) {
            for (let i = template.length - 1; i >= 0; i--) {
                stack.push({ driver, template: template[i] })
            }
            continue;
        }

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
        if (isInitializable(binding))
            binding.ready();
    }

    return bindings;
}

interface Initializable {
    ready(): void;
}

function isInitializable(obj): obj is Initializable {
    return obj && typeof obj['ready'] === 'function';
}

export function renderMany(driver: IDriver, children: ITemplate[]): Binding[] {
    var stack = children.map(template => ({
        driver,
        template
    }));

    return renderStack(stack);
}
