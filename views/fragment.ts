import { ITemplate } from "./driver.js"

export function Fragment(props: {}, children?: any[]): any[] {
    return children;
}

export default function (props: {}, children?: any[]): ITemplate[] {
    return children;
    // return new FragmentTemplate(children.map(asTemplate));
}
