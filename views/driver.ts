
declare type Subscription = { unsubscribe() };
declare type Observer<T> = (value: T) => any;
export declare type Subscribable<T> = { subscribe: (observer: Observer<T>) => Subscription };

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


