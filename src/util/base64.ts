import { Indexable } from "../types";

const digitsStr =
  //   0       8       16      24      32      40      48      56     63
  //   v       v       v       v       v       v       v       v      v
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
const digits = digitsStr.split("");
const digitsMap: Indexable = digits.reduce(
  (map, digit, i) => ({ ...map, [i]: digit }),
  {}
);

export class Base64 {
  private static readonly digits = digits;
  private static readonly digitsMap = digitsMap;

  public static fromInt(int32: number) {
    let result = "";
    while (true) {
      result = this.digits[int32 & 0x3f] + result;
      int32 >>>= 6;
      if (int32 === 0) break;
    }
    return result;
  }

  public static toInt(digitsStr: string) {
    let result = 0;
    let digits = digitsStr.split("");
    for (let i = 0; i < digits.length; i++) {
      result = (result << 6) + this.digitsMap[digits[i]];
    }
    return result;
  }
}
