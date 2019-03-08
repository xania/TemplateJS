import { ITemplate, Props } from "./driver.js"
import { asTemplate, FragmentTemplate } from "./index.js"

export function Fragment(props: Props, children?: any[]): ITemplate {
    return new FragmentTemplate(children.map(asTemplate));
}

export default function (props: Props, children?: any[]): ITemplate {
    return new FragmentTemplate(children.map(asTemplate));
}
