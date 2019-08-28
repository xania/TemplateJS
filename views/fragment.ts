import { ITemplate, Props } from "./driver.js"
import { asTemplate, FragmentTemplate } from "./index.js"

export function Fragment(props: {}, children?: any[]): any[] {
    return children;
}

export default function (props: Props, children?: any[]): ITemplate {
    return new FragmentTemplate(children.map(asTemplate));
}
