export const byId = (id) => document.getElementById(id);

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export const throttle = (func, delay) => {
    let inProgress = false;
    return (...args) => {
        if (inProgress) return;
        inProgress = true;
        setTimeout(() => {
            func(...args);
            inProgress = false;
        }, delay);
    };
};

export const setText = (element, value) => {
    if (element) {
        element.textContent = value;
    }
};

export const createStatusSetter = (element) => {
    return (message) => setText(element, message);
};