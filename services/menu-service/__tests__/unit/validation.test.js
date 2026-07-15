const { validateRating } = require('../../src/server');

describe('validateRating Function', () => {
  test('should accept valid rating of 1', () => {
    const result = validateRating(1);
    expect(result.valid).toBe(true);
  });

  test('should accept valid rating of 3', () => {
    const result = validateRating(3);
    expect(result.valid).toBe(true);
  });

  test('should accept valid rating of 5', () => {
    const result = validateRating(5);
    expect(result.valid).toBe(true);
  });

  test('should reject rating above 5', () => {
    const result = validateRating(6);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rating must be between 1 and 5');
  });

  test('should reject rating of 0', () => {
    const result = validateRating(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rating must be between 1 and 5');
  });

  test('should reject negative rating', () => {
    const result = validateRating(-1);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rating must be between 1 and 5');
  });

  test('should reject decimal rating', () => {
    const result = validateRating(3.5);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rating must be a whole number');
  });

  test('should reject undefined rating', () => {
    const result = validateRating(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rating is required');
  });

  test('should reject null rating', () => {
    const result = validateRating(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rating is required');
  });

  test('should reject string rating', () => {
    const result = validateRating('five');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rating must be a number');
  });

  test('should accept exact lower boundary: 1', () => {
    expect(validateRating(1).valid).toBe(true);
  });

  test('should accept exact upper boundary: 5', () => {
    expect(validateRating(5).valid).toBe(true);
  });

  test('should reject one above upper boundary: 6', () => {
    expect(validateRating(6).valid).toBe(false);
  });
});
