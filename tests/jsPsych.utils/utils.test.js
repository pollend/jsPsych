import {flatten,unique,deepCopy} from 'JsPsych/utility'

describe('unique', function() {
    test('generates unique array when there are duplicates', function () {
        let arr = [1, 1, 2, 2, 3, 3];
        let out = unique(arr);
        expect(out).toEqual([1, 2, 3]);
        expect(out).not.toEqual(arr);
    });

    test('generates same array when there are no duplicates', function () {
        let arr = [1, 2, 3];
        let out = unique(arr);
        expect(out).toEqual(arr);
    })
});

describe('flatten', function() {
    test('generates flat array from flat input', function () {
        let arr = [1, 1, 2, 2, 3, 3];
        let out = flatten(arr);
        expect(out).toEqual(arr);
    });

    test('generates flat array from nested input', function () {
        let arr = [1, [1, 2, 2], [3], 3];
        let out = flatten(arr);
        expect(out).toEqual([1, 1, 2, 2, 3, 3]);
    });
});

describe('deepCopy', function() {
    test('works for objects', function () {
        let o = {a: 1, b: {c: 2, d: 3}};
        let o2 = deepCopy(o);
        o2.b.c = 4;
        expect(o.b.c).toBe(2);
    });
    test('works for objects with arrays', function () {
        let o = {a: 1, b: [2, 3]};
        let o2 = deepCopy(o);
        o2.b[0] = 4;
        expect(JSON.stringify(o2.b)).toBe(JSON.stringify([4, 3]));
        expect(o.b[0]).toBe(2);
    });
    test('works for objects with functions', function () {
        let c = 0;
        let o = {
            a: 1, b: function () {
                c = 2
            }
        };
        let o2 = deepCopy(o);
        o2.b = function () {
            c = 1
        }
        o.b();
        expect(c).toBe(2);
        o2.b();
        expect(c).toBe(1);
    })
})
