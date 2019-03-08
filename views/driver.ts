export type Executable<T> = { execute: (e:T) => any } | Function

export interface IDriver {
    createElement(name: string, index: number, init?: Func<any>): TagElement;
    createText(value: any, index: number): TextElement;
    createAttribute(name: string, value: any): TextElement;
    createEvent(name: string, value: Executable<any> | Function): TagEvent;
    createScope(name: string): ScopeElement;
    init?();
}

export interface TagEvent {
    dispose();
}
export interface TagElement {
    ready();
    driver(): IDriver;
    dispose();
}

export interface TextElement {
    next(value: Primitive);
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

declare type Func<T> = (arg: T) => any;

export interface ITemplate {
    render(driver: IDriver, idx?: number, init?: Func<any>): Binding;
}

export interface Binding {
    children?: ITemplate[];
    driver?(): IDriver;
    dispose();
}


export function renderAll(driver: IDriver, rootTpl: ITemplate, idx: number = 0) {
    const rootBinding = rootTpl.render(driver, idx);
    const stack = [rootBinding];
    const queue = [];
    const bindings = [];

    if (driver.init)
        queue.push(driver);

    while (stack.length) {
        const binding = stack.pop();

        if (binding['ready'])
            bindings.push(binding);

        if (!binding.driver)
            continue;

        const driver = binding.driver();
        if (driver.init)
            queue.push(driver);

        if (binding.children) {
            for (let i = 0; i < binding.children.length; i++) {
                let child = binding.children[i];
                let childBinding = child.render(driver);
                if (childBinding) {
                    stack.push(childBinding);
                }
            }
        }
    }

    const length = +queue.length;
    for (var i = 0; i < length; i++) {
        queue[i].init();
    }
    for(var i=0 ; i<bindings.length ; i++) {
        bindings[i].ready();
    }

    return rootBinding;
}


export function init(view: ITemplate, callback) {
    return {
        render(driver: IDriver, idx: number) {
            return view.render(driver, idx, callback);
        }
    };
}