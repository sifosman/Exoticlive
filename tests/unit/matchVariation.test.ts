import { matchVariation } from '../../utils/matchVariation';

describe('matchVariation', () => {
  const variations = [
    {
      id: 1,
      attributes: [
        { name: 'Color', option: 'Black' },
        { name: 'Size', option: '3' },
      ],
      price: 100,
      sale_price: 90,
    },
    {
      id: 2,
      attributes: [
        { name: 'Color', option: 'Black' },
        { name: 'Size', option: '5' },
      ],
      price: 110,
      sale_price: null,
    },
    {
      id: 3,
      attributes: [
        { name: 'Color', option: 'Blue' },
        { name: 'Size', option: '5' },
      ],
      price: 120,
      sale_price: 100,
    },
  ];

  it('returns null when no selections', () => {
    const result = matchVariation({}, variations as any);
    expect(result).toBeNull();
  });

  it('matches variation by exact attributes (case-insensitive)', () => {
    const result = matchVariation({ Color: 'black', Size: '5' }, variations as any);
    expect(result?.id).toBe(2);
  });

  it('returns first matching variation if multiple (deterministic)', () => {
    const duplicate = {
      id: 4,
      attributes: [
        { name: 'Color', option: 'Black' },
        { name: 'Size', option: '5' },
      ],
      price: 115,
    };
    const result = matchVariation({ Color: 'Black', Size: '5' }, [...variations, duplicate] as any);
    expect(result?.id).toBe(2);
  });

  it('handles pa_ prefix in attribute names', () => {
    const paVariations = [
      {
        id: 10,
        attributes: [
          { name: 'pa_color', option: 'Olive' },
          { name: 'pa_size', option: '8' },
        ],
      },
    ];
    const result = matchVariation({ color: 'Olive', size: '8' }, paVariations as any);
    expect(result?.id).toBe(10);
  });
});
