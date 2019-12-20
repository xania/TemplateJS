interface Updatable {
    update(value): boolean;
}

interface NextObserver { next(value): void };

export function isUpdatable(binding): binding is Updatable {
    if (binding === null)
        return false;
    if (typeof binding !== 'object')
        return false;

    return (typeof binding.update === 'function')
}


export function isNextObserver(binding): binding is NextObserver {
    if (binding === null)
        return false;
    if (typeof binding !== 'object')
        return false;

    return (typeof binding.next === 'function')
}
