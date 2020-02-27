import { IDriver } from "views/driver";
import { Subscribable } from "storejs";

interface CssProps {
    value: string;
    when: Subscribable<boolean>
}

export default function Css(props: CssProps) {
    return {
        render(driver: IDriver) {
            const binding = driver.createAttribute("class", undefined);

            const { when, value } = props;
            when.subscribe(e => {
                if (e) binding.next(value);
                else binding.next([]);
            })

            return binding;
        }
    }
}

