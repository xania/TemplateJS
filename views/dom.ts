import { IDriver, Primitive, Executable } from "./driver"

const __emptyBinding = { dispose() {} };
export class DomDriver implements IDriver {
    public target;
    private domElements = [];
    private events: { eventName: string, eventBinding: any, dom: any }[] = [];

    constructor(target) {
        if (typeof target === "string")
            this.target = document.querySelector(target);
        else
            this.target = target;
    }

    createDriver(node): IDriver {
        return new DomDriver(node);
    }

    createScope(name: string) {
        return createScope(this, name);
    }

    createEvent(name, value: Function | Executable<any>) {
        if (!value) 
            return __emptyBinding;

        const { target } = this;        

        if(typeof value === "function")
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
        this.target.appendChild(child);
    }

    createElement(name: string, idx, init) {
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

    createText(value: Primitive) {
        const textNode: Text = document.createTextNode(value as string);
        this.appendChild(textNode);

        return {
            next(value) {
                textNode.nodeValue = value as string;
            },
            dispose() {
                return textNode.remove();
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

function createScope(parent: DomDriver, name: string) {
    let commentNode = document.createComment(name);
    parent.appendChild(commentNode);
    const elements = [];

    return {
        info() {
            return {
                commentNode, target: parent.target, elements
            }
        },
        driver() {
            function insertAt(newElement, index: number) {
                if (index > elements.length)
                    throw new Error("wat doe je?");
                if (elements[index]) {
                    parent.target.insertBefore(newElement, elements[index]);
                    elements.splice(index, 0, newElement);
                } else {
                    parent.target.insertBefore(newElement, commentNode);
                    elements[index] = newElement;
                }
            }
            return {
                createEvent(name, value) {
                    throw new Error("create Event is not (yet) supported");
                },
                createAttribute(name, value) {
                    return createAttribute(parent.target, name, value);
                },
                appendChild(tagNode) {
                    insertAt(tagNode, elements.length);
                },
                createElement(name, index: number, init) {
                    const tagNode = createElement(parent.target, name);
                    const tagDriver = parent.createDriver(tagNode);
                    insertAt(tagNode, index);

                    return {
                        ready() {
                            init && init(tagNode);
                        },
                        driver() {
                            return tagDriver;
                        },
                        dispose() {
                            let idx = elements.indexOf(tagNode);
                            if (idx >= 0)
                                elements.splice(idx, 1);

                            return tagNode.remove();
                        }
                    }
                },
                createText(value: Primitive, index: number) {
                    const textNode = document.createTextNode(value as string);
                    insertAt(textNode, index);

                    return {
                        next(value) {
                            textNode.nodeValue = value as string;
                        },
                        dispose() {
                            let idx = elements.indexOf(textNode);
                            if (idx >= 0)
                                elements.splice(idx, 1);

                            return textNode.remove();
                        }
                    }
                },
                createScope(name) {
                    return createScope(this, name);
                }
            }
        },
        dispose() {
            // console.log(commentNode, elements.map(e => e));
            for (let i = 0; i < elements.length; i++) {
                elements[i].remove();
            }
            commentNode.remove();
        }
    }
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
                prevValue.forEach(cl => target.classList.remove(cl));
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
    const namespaceURI = name === "svg" ? "http://www.w3.org/2000/svg" : target.namespaceURI;
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
