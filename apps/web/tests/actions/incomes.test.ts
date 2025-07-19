import { describe, expect, it, test } from '@jest/globals';

export function sum(a: number, b: number) {
    return a + b
}


export function subtract(a: number, b: number) {
    return a - b
}

export function multiply(a: number, b: number) {
    return a * b
}

export function divide(a: number, b: number) {
    return a / b
}

// all the tests written inside the sum module is for sum function
describe('sum module', () => {

    test('adds 1 + 2 to equal 3', () => {
        const finalAnswer = sum(1, 2);
        expect(finalAnswer).toBe(3);
    });

    it('adds 2 + 2 to equal 4', () => { // You can write `it` as well inplace of `test`
        expect(sum(2, 2)).toBe(4);
    });


    test('adds 3 + 3 to equal 6', () => {
        expect(sum(3, 3)).toBe(6);
    });
});


