export const flatten  = function(arr, out) {
    out = (typeof out === 'undefined') ? [] : out;
    for (let i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i])) {
            flatten(arr[i], out);
        } else {
            out.push(arr[i]);
        }
    }
    return out;
};

export const unique = function(arr) {
    const out = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr.indexOf(arr[i]) === i) {
            out.push(arr[i]);
        }
    }
    return out;
};

export const deepCopy = function(obj) {
    if (!obj) return obj;
    let out;
    if (Array.isArray(obj)) {
        out = [];
        for (let i = 0; i < obj.length; i++) {
            out.push(deepCopy(obj[i]));
        }
        return out;
    } else if (typeof obj === 'object') {
        out = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                out[key] = deepCopy(obj[key]);
            }
        }
        return out;
    } else {
        return obj;
    }
};


export const KEY_LOOKUP = {
    'backspace': 8,
    'tab': 9,
    'enter': 13,
    'shift': 16,
    'ctrl': 17,
    'alt': 18,
    'pause': 19,
    'capslock': 20,
    'esc': 27,
    'space': 32,
    'spacebar': 32,
    ' ': 32,
    'pageup': 33,
    'pagedown': 34,
    'end': 35,
    'home': 36,
    'leftarrow': 37,
    'uparrow': 38,
    'rightarrow': 39,
    'downarrow': 40,
    'insert': 45,
    'delete': 46,
    '0': 48,
    '1': 49,
    '2': 50,
    '3': 51,
    '4': 52,
    '5': 53,
    '6': 54,
    '7': 55,
    '8': 56,
    '9': 57,
    'a': 65,
    'b': 66,
    'c': 67,
    'd': 68,
    'e': 69,
    'f': 70,
    'g': 71,
    'h': 72,
    'i': 73,
    'j': 74,
    'k': 75,
    'l': 76,
    'm': 77,
    'n': 78,
    'o': 79,
    'p': 80,
    'q': 81,
    'r': 82,
    's': 83,
    't': 84,
    'u': 85,
    'v': 86,
    'w': 87,
    'x': 88,
    'y': 89,
    'z': 90,
    '0numpad': 96,
    '1numpad': 97,
    '2numpad': 98,
    '3numpad': 99,
    '4numpad': 100,
    '5numpad': 101,
    '6numpad': 102,
    '7numpad': 103,
    '8numpad': 104,
    '9numpad': 105,
    'multiply': 106,
    'plus': 107,
    'minus': 109,
    'decimal': 110,
    'divide': 111,
    'f1': 112,
    'f2': 113,
    'f3': 114,
    'f4': 115,
    'f5': 116,
    'f6': 117,
    'f7': 118,
    'f8': 119,
    'f9': 120,
    'f10': 121,
    'f11': 122,
    'f12': 123,
    '=': 187,
    ',': 188,
    '.': 190,
    '/': 191,
    '`': 192,
    '[': 219,
    '\\': 220,
    ']': 221
};

export const compareKeys = function(key1, key2){
    // convert to numeric values no matter what
    if(typeof key1 === 'string') {
        key1 = module.convertKeyCharacterToKeyCode(key1);
    }
    if(typeof key2 === 'string') {
        key2 = module.convertKeyCharacterToKeyCode(key2);
    }
    return key1 === key2;
}

export const convertKeyCharacterToKeyCode = function(character) {
    var code;
    character = character.toLowerCase();
    if (typeof keylookup[character] !== 'undefined') {
        code = keylookup[character];
    }
    return code;
};

export const convertKeyCodeToKeyCharacter = function(code){
    for(let i in Object.keys(keylookup)){
        if(keylookup[Object.keys(keylookup)[i]] === code){
            return Object.keys(keylookup)[i];
        }
    }
    return undefined;
};
