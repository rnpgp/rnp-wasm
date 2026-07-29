/**
 * ts/registry/feature.ts
 * Registry of feature-type strings accepted by rnp_supported_features().
 */

import { Registry } from "./registry.js";

export type FeatureType = string;

export const FeatureTypes = new Registry<FeatureType>();
FeatureTypes.register("symmetric", "symmetric");
FeatureTypes.register("aead", "aead");
FeatureTypes.register("cipher", "cipher");
FeatureTypes.register("hash", "hash");
FeatureTypes.register("compression", "compression");
FeatureTypes.register("asymmetric", "asymmetric");
FeatureTypes.register("curve", "curve");
FeatureTypes.register("protection", "protection");
FeatureTypes.register("s2k", "s2k");
