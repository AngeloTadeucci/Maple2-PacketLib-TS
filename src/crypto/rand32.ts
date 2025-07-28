export default class Rand32 {
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: number) {
    const rand = Rand32.crtRand(seed);

    this.s1 = (seed | 0x100000) >>> 0;
    this.s2 = (rand | 0x1000) >>> 0;
    this.s3 = (Rand32.crtRand(rand) | 0x10) >>> 0;
  }

  public static crtRand(seed: number): number {
    return (214013 * seed + 2531011) >>> 0;
  }

  public random(): number {
    this.s1 = (((this.s1 << 12) & 0xffffe000) ^ ((this.s1 >>> 6) & 0x00001fff) ^ (this.s1 >>> 19)) >>> 0;
    this.s2 = (((this.s2 << 4) & 0xffffff80) ^ ((this.s2 >>> 23) & 0x0000007f) ^ (this.s2 >>> 25)) >>> 0;
    this.s3 = (((this.s3 << 17) & 0xffe00000) ^ ((this.s3 >>> 8) & 0x001fffff) ^ (this.s3 >>> 11)) >>> 0;

    return (this.s1 ^ this.s2 ^ this.s3) >>> 0;
  }

  public randomFloat(): number {
    const randValue = this.random();
    const bits = ((randValue & 0x007fffff) | 0x3f800000) >>> 0;
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, bits, true);
    let result = new DataView(buffer).getFloat32(0, true) - 1.0;

    // Convert to 32-bit float precision to match C# behavior
    const floatBuffer = new ArrayBuffer(4);
    new DataView(floatBuffer).setFloat32(0, result, true);
    result = new DataView(floatBuffer).getFloat32(0, true);

    return result;
  }
}
