import { z } from 'zod';

// define price is a number has been to bigger or equal 0 (>= 0)
const PriceSchema = z.number().nonnegative();

export class Price {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number) {
    const parsed = PriceSchema.parse(value);
    return new Price(parsed);
  }

  toNumber() {
    return this.value;
  }
}
