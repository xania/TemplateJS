export { tpl } from "./views/index.js"
export { DomDriver } from "./views/dom.js"
export { renderAll } from "./views/driver.js"

// export function renderer(target: HTMLElement) {
//     return (value: XaniaViewResult) => {
//         return value.render2({ target });
//     }
// }

// export default function (template: ITemplate): XaniaViewResult {
//     return {
//         render2(driver: IDriver) {
//             return renderAll(driver, template);
//         }
//     } as XaniaViewResult
// }
