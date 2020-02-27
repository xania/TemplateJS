import { Liftable, Updatable } from "storejs";
import { IDriver } from "views/driver";

interface ToggleProps {
    value: Updatable<boolean> & Liftable<boolean>;
    class?: string;
}

export default function Toggle(props: ToggleProps) {
    const { value, class: className } = props;

    return {
        render(driver: IDriver) {
            if (typeof className === "string" && className) {
                const binding = driver.createAttribute("class", undefined);
                return [
                    driver.createEvent("click", () => value.update(e => !e)),
                    value.lift(e => !!e && className).subscribe(binding),
                    binding
                ]
            }
            else
                return driver.createEvent("click", () => value.update(e => !e))
        }
    }
}

