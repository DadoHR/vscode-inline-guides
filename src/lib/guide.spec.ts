import { describe, expect, test } from 'vitest';
import {
  Guide,
  GuideItem,
  GuideParseError,
  getGuideTree,
  getInfoFromLine
} from './guide.js';

function createGuideItem(overrides: Partial<GuideItem> = {}): GuideItem {
  const item: GuideItem = {
    name: 'Guide name',
    description: 'Guide description',
    step: '1',
    location: {
      filePath: 'file.ts',
      lineNumber: 1
    }
  };

  return Object.assign(item, overrides);
}

describe(getInfoFromLine.name, () => {
  test.each<[string]>([
    // Single-line comment used in C, C++, ECMAScript
    ['//'],
    ['// '],
    ['  // '],
    ['\t// '],
    // Single-line comment used in shell
    ['#'],
    ['# '],
    ['  # '],
    ['\t# '],
    // Multi-line comment (opening) used in C, C++, ECMAScript
    ['/*'],
    ['/* '],
    ['  /* '],
    ['\t/* '],
    // Multi-line comment (asterix prefix convention) used in C, C++, ECMAScript
    ['*'],
    ['* '],
    ['  * '],
    ['\t* '],
    // Multi-line comment (no prefix convention) used in C, C++, ECMAScript
    [''],
    ['  '],
    ['\t']
  ])('given string with prefix "%s", ignores syntax', (prefix) => {
    const line = `${prefix}@guide Guide name - 1.2.3 Guide description`;
    const result = getInfoFromLine(line);
    expect(result).toEqual({
      name: 'Guide name',
      step: '1.2.3',
      description: 'Guide description'
    });
  });

  test.each<[string]>([
    ['@guide Guide name 1.1 - Guide description'],
    ['$guide Guide name - 1.1 Guide description'],
    // n-dash
    ['@guide Guide name – 1.1 Guide description'],
    // m-dash
    ['@guide Guide name — 1.1 Guide description']
  ])('given invalid lines, throws GuideParseError', (line) => {
    expect(() => getInfoFromLine(line)).toThrowError(GuideParseError);
  });
});

describe(getGuideTree.name, () => {
  test('given Guides with the name, groups them', () => {
    const guides: GuideItem[] = [
      createGuideItem({ name: 'One', step: '1.1' }),
      createGuideItem({ name: 'One', step: '1.2' }),
      createGuideItem({ name: 'Two', step: '1.1' }),
      createGuideItem({ name: 'Two', step: '1.2' })
    ];

    const result = getGuideTree(guides);

    expect(result).toEqual({
      One: {
        name: 'One',
        steps: {
          '1.1': expect.objectContaining<Partial<Guide['steps'][number]>>({
            step: '1.1'
          }),
          '1.2': expect.objectContaining<Partial<Guide['steps'][number]>>({
            step: '1.2'
          })
        }
      },
      Two: {
        name: 'Two',
        steps: {
          '1.1': expect.objectContaining<Partial<Guide['steps'][number]>>({
            step: '1.1'
          }),
          '1.2': expect.objectContaining<Partial<Guide['steps'][number]>>({
            step: '1.2'
          })
        }
      }
    });
  });

  test('given Guides with duplicate steps, prioritizes the last duplicate', () => {
    const guides: GuideItem[] = [
      createGuideItem({
        name: 'One',
        step: '1.1',
        description: 'One'
      }),
      createGuideItem({
        name: 'One',
        step: '1.1',
        description: 'One (duplicate)'
      }),
      createGuideItem({
        name: 'One',
        step: '1.2',
        description: 'Two'
      })
    ];

    const result = getGuideTree(guides);

    expect(result).toEqual({
      One: {
        name: 'One',
        steps: {
          '1.1': expect.objectContaining<Partial<Guide['steps'][number]>>({
            name: 'One (duplicate)',
            step: '1.1'
          }),
          '1.2': expect.objectContaining<Partial<Guide['steps'][number]>>({
            name: 'Two',
            step: '1.2'
          })
        }
      }
    });
  });
});
