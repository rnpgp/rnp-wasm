import type { Ffi } from "./ffi.js";
import { type AnyInput, type AnyOutput, inputNative, outputNative } from "./io.js";
import { INTERNAL_TOKEN } from "./internal-brand.js";

export class PacketDump {
  constructor(private readonly ffi: Ffi) {}
  toJson(input: AnyInput, flags = 0): string {
    return this.ffi.module_(INTERNAL_TOKEN).rnpDumpPacketsToJson(inputNative(input), flags);
  }
  toOutput(input: AnyInput, output: AnyOutput, flags = 0): void {
    this.ffi.module_(INTERNAL_TOKEN).rnpDumpPacketsToOutput(inputNative(input), outputNative(output), flags);
  }
}
