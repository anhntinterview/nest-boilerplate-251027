import { z } from 'zod';

const SKUSchema = z.string().min(5);

export class SKU {
  public readonly value: string;
  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string) {
    return new SKU(SKUSchema.parse(value));
  }

  toString() {
    return this.value;
  }
}
