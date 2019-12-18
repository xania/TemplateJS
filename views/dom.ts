import { IDriver, Primitive, Executable, ScopeElement } from "./driver"
import { last } from "rxjs/operators";

const children = Symbol('children');
const __emptyBinding = { dispose() { } };
export class DomDriver implements IDriver {
    public target;
    public domElements = [];
    private events: { eventName: string, eventBinding: any, dom: any }[] = [];
    [children]: Component[] = [];

    constructor(target) {
        if (typeof target === "string")
            this.target = document.querySelector(target);
        else
            this.target = target;
    }

    createDriver(node): IDriver {
        return new DomDriver(node);
    }

    createScope(idx?: number): IDriver {
        // const commentNode = document.createComment(`--- ${name} ---`);
        // this.target.appendChild(commentNode);

        const scope = createScope(this, this);
        if (typeof idx === 'number') {
            this[children].splice(idx, 0, scope);
        }
        else {
            this[children].push(scope);
        }
        return scope;
    }

    createEvent(name: string, value: Function | Executable<any>) {
        if (!value)
            return __emptyBinding;

        const { target } = this;

        if (!(("on" + name.toLocaleLowerCase()) in target)) {
            console.error("not a valid event " + name);
        }

        if (typeof value === "function")
            target.addEventListener(name, value);
        else
            target.addEventListener(name, evt => value.execute(evt));
        return {
            dispose() {
                target.removeEventListener(name, value);
            }
        }
    }

    appendChild(child) {
        const _children = this[children];
        if (Array.isArray(_children)) {
            _children.push(child);
            this.target.appendChild(child);
        } else {
            console.warn('ignore child, driver is disposed.')
        }
    }

    createElement(name: string, init) {
        const tagNode = createElement(this.target, name);
        this.appendChild(tagNode);
        const driver = this.createDriver(tagNode);

        return {
            ready() {
                init && init(tagNode);
            },
            driver() {
                return driver;
            },
            dispose() {
                tagNode.remove();
            }
        }
    }

    // insertAt(tagNode, index, anchorNode) {
    //     insertNodeAt(this, this.domElements, anchorNode, tagNode, index);
    // }

    createNative(value: Primitive | HTMLElement) {
        const node = isDomNode(value) ? value : document.createTextNode(value as string);
        this.appendChild(node);

        return {
            next(value) {
                node.nodeValue = value as string;
            },
            dispose() {
                return node.remove();
            }
        }
    }

    createAttribute(name: string, value: Primitive) {
        return createAttribute(this.target, name, value);
    }


    findEventBinding(target, eventName) {
        var events = this.events;
        while (target) {
            var e = events.length;
            while (e--) {
                var ev = events[e];
                if (ev.dom === target && ev.eventName === eventName) {
                    return ev.eventBinding;
                }
            }
            target = target.parentNode;
        }
        return null;
    }

    on(eventName, dom, eventBinding) {
        var events = this.events,
            i = events.length,
            eventBound = false;

        while (i--) {
            var ev = events[i];
            if (ev.eventName === eventName) {
                if (ev.dom === dom)
                    return ev;
                else {
                    eventBound = true;
                    break;
                }
            }
        }

        if (!eventBound) {
            this.target.addEventListener(eventName,
                event => {
                    var eventBinding = this.findEventBinding(event.target, eventName);
                    if (eventBinding) {
                        eventBinding.fire(event);
                        event.preventDefault();
                    }
                });
        }

        var entry = {
            eventName,
            dom,
            eventBinding,
            dispose() {
                var idx = events.indexOf(this);
                if (idx >= 0) {
                    events.splice(idx, 1);
                    return true;
                }
                return false;
            }
        };
        this.events.push(entry);
        return entry;
    }

    insert(_, dom, idx: number) {
        var domElements = this.domElements;
        var target = this.target;

        var curIdx = domElements.indexOf(dom);
        if (idx !== curIdx) {
            var childNodes = target.childNodes;
            if (idx < childNodes.length) {
                var current = childNodes[idx];
                if (current !== dom) {
                    target.insertBefore(dom, current);
                }
            } else {
                this.appendChild(dom);
            }
            var length = childNodes.length;
            domElements.length = length;
            for (let i = 0; i < length; i++) {
                domElements[i] = childNodes[i];
            }
            return true;
        }
        return false;
    }

    dispose() {
        var domElements = this.domElements,
            i = domElements.length;
        while (i--) {
            domElements[i].remove();
        }

        delete this[children];
    }

    // static text(expressions: (Primitive | Re.IExpression<Primitive>)[]): Binding {
    //     const textNode: Text = document.createTextNode("text-node");
    //     document.body.appendChild(textNode);

    //     var next = () => {
    //         var exprs = expressions, length = exprs.length;
    //         var result = "";
    //         for(var i=0 ; i<length ; i++) {
    //             var expr = exprs[i];
    //             if (typeof expr === "string" || typeof expr === "number")
    //                 result += expr;
    //             // else
    //             //     result += expr.value;
    //         }

    //         textNode.nodeValue = result;
    //     }
    //     next();

    //     var unsubscribe = () => {
    //         console.log(textNode);
    //         textNode.remove();
    //     }

    //     // var binding = new Binding(next, unsubscribe);

    //     for(var i=0 ; i<expressions.length ; i++) {
    //         var expr = expressions[i];
    //         if (typeof expr !== "string" && typeof expr !== "number") {
    //             // expr.subscribe(binding);
    //         }
    //     }

    //     return null;

    //     // return binding;
    // }
}


interface Parent {
    [children]: Component[]
}
type Leaf = Comment | HTMLElement;
type Component = Leaf | Parent;

function createScope(root: DomDriver, parent: Parent) {
    const scope = {
        [children]: [] as Component[],
        get disposed() {
            return Array.isArray(scope[children]);
        },
        appendChild(node) {
            const _children = scope[children];
            if (Array.isArray(_children)) {
                _children.push(node);
                const refNode = referenceNode(scope);
                if (refNode)
                    root.target.insertBefore(node, refNode);
                else
                    root.target.appendChild(node);
            } else {
                console.warn('appending child is skipped because scope is disposed already.')
            }
        },
        createEvent(name, value) {
            throw new Error("create Event is not (yet) supported");
        },
        createAttribute(name, value) {
            return createAttribute(root.target, name, value);
        },
        createElement(name, init) {
            const tagNode = createElement(root.target, name);
            this.appendChild(tagNode);

            return {
                ready() {
                    init && init(tagNode);
                },
                driver() {
                    return root.createDriver(tagNode);
                },
                dispose() {
                    return removeComponent(scope, tagNode);
                }
            }
        },
        createNative(value: Primitive) {
            const textNode = document.createTextNode(value as string);
            this.appendChild(textNode);

            return {
                next(value) {
                    (textNode.nodeValue = value as string);
                },
                dispose() {
                    return removeComponent(scope, textNode);
                }
            }
        },
        createScope(idx?: number) {
            // const comment = document.createComment(`-- ${name} --`);
            // scope.appendChild(comment);
            const subscope = createScope(root, scope);
            if (typeof idx === 'number') {
                scope[children].splice(idx, 0, subscope);
            } else {
                scope[children].push(subscope);
            }
            return subscope;
        },
        dispose() {
            removeComponent(parent, scope);
            delete scope[children]; // mark as disposed
        }
    };

    function removeComponent(scope: Parent, node: Component) {
        const _children = scope[children];
        if (!Array.isArray(_children))
            return;

        const idx = _children.indexOf(node);
        if (idx >= 0) {
            _children.splice(idx, 1);
        }
        const stack = [node];
        while (stack.length > 0) {
            const curr = stack.pop();
            if (isParent(curr)) {
                const _children = curr[children];
                for (let i = 0; i < _children.length; i++) {
                    const child = _children[i];
                    stack.push(child);
                }
            }
            else {
                curr.remove();
            }
        }
    }

    function referenceNode(component: Component) {
        const stack = [root as Component];
        let found = false;
        while (stack.length) {
            const curr = stack.pop();
            if (curr === component) {
                found = true;
            } else if (isParent(curr)) {
                const _children = curr[children];
                for (let i = _children.length - 1; i >= 0; i--) {
                    stack.push(_children[i]);
                }
            } else if (found === true) {
                return curr;
            }
        }
    };

    return scope;
}

function createAttribute(target, name: string, value: Primitive) {
    var prevValue = [];
    if (name === "class") {
        prevValue = Array.isArray(value) ? value : toString(value).split(' ');
        prevValue.filter(e => e).forEach(cl => target.classList.add(cl));
        return {
            target,
            next: className,
            dispose() {
                prevValue.forEach(cl => cl && target.classList.remove(cl));
            }
        }
    } else if (name === "value") {
        valueAttribute(toString(value));
        return {
            next: valueAttribute,
            dispose() {
                target.removeAttribute(name);
            }
        }
    } else {
        defaultAttribute(toString(value));
        return {
            next: defaultAttribute,
            dispose() {
                target.removeAttribute(name);
            }
        }
    }

    function className(value: string) {
        prevValue.forEach(cl => target.classList.remove(cl));
        prevValue = value.split(' ');
        prevValue.forEach(cl => target.classList.add(cl));
    }

    function valueAttribute(value: string) {
        if (value === null || value === undefined)
            target.value = "";
        else if (target.type === 'date') {
            var d = new Date(value);
            // ensure GMT timezone
            // https://austinfrance.wordpress.com/2012/07/09/html5-date-input-field-and-valueasdate-timezone-gotcha-3/
            target.valueAsDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
        }
        else
            target.value = value;
    }

    function defaultAttribute(value: string) {
        if (value === void 0 || value === null) {
            target.removeAttribute(name);
        } else {
            var attr = document.createAttributeNS(null, name);
            attr.value = value;
            target.setAttributeNode(attr);
        }
    }
}


class SvgDriver extends DomDriver {
}

function createChild(parent: DomDriver, name: string) {
    const tagNode = createElement(parent.target, name);
    return parent.createDriver(tagNode);
}

function createElement(target, name) {
    const namespaceURI = name === "svg" ? "http://www.w3.org/2000/svg" : target && target.namespaceURI;
    const tagNode = document.createElementNS(namespaceURI, name);

    return tagNode;
}

function toString(value) {
    if (value === null || typeof value === "undefined")
        return value;

    if (typeof value === "string" || typeof value === "boolean")
        return value;

    return value.toString();
}

export function isDomNode(obj): obj is HTMLElement {
    try {
        //Using W3 DOM2 (works for FF, Opera and Chrome)
        return obj instanceof HTMLElement;
    }
    catch (e) {
        //Browsers not supporting W3 DOM2 don't have HTMLElement and
        //an exception is thrown and we end up here. Testing some
        //properties that all elements have (works on IE7)
        return (typeof obj === "object") &&
            (obj.nodeType === 1) && (typeof obj.style === "object") &&
            (typeof obj.ownerDocument === "object");
    }
}

function insertNodeAt(parent: { target: HTMLElement }, elements, anchorNode, newElement, index: number) {
    if (index > elements.length)
        throw new Error("wat doe je?");
    if (elements[index]) {
        parent.target.insertBefore(newElement, elements[index]);
        elements.splice(index, 0, newElement);
    } else if (anchorNode) {
        parent.target.insertBefore(newElement, anchorNode);
        elements[index] = newElement;
    } else {
        parent.target.appendChild(newElement);
        elements[index] = newElement;
    }
}

function isParent(node: any): node is Parent {
    if (node == null)
        return false;
    if (typeof node === 'object')
        return children in node;
    return false;
}

window['componentTree'] = function (root: Component) {
    const retval = [];
    const stack = [{ component: root, result: retval }];
    while (stack.length) {
        const { component, result } = stack.pop();
        if (isParent(component)) {
            const childResult = [];
            result.push(children);
            component[children].forEach(child => stack.push({ component: child, result: childResult }))
        } else {
            result.push(component);
        }
    }

    return retval;
}
