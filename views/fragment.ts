import { ITemplate } from "./driver.js"
import { asTemplate, FragmentTemplate } from "./index.js"

export function Fragment(props: {}, children?: any[]): any[] {
    return children;
}

export default function (props: {}, children?: any[]): ITemplate {
    return new FragmentTemplate(children.map(asTemplate));
}
