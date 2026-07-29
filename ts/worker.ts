/**
 * ts/worker.ts
 * Worker entry point. Loads rnp-wasm inside a Web Worker and exposes a
 * stateful operation surface via Comlink.
 *
 * Stateful session:
 *   const pool = new WorkerPool();
 *   const session = await pool.session();
 *   await session.loadSecretKey(secretBytes);
 *   const signed = await session.sign(messageBytes, signerFingerprint);
 *
 * The worker owns one FFI + Keyring for the lifetime of the session.
 * Multiple sessions = multiple workers (round-robin in WorkerPool).
 */

import * as Comlink from "comlink";
import {
  initRnp, type Rnp, type Ffi,
  SignOperation, VerifyOperation, EncryptOperation, decrypt,
  type KeyFormat,
} from "./index.js";

interface SignResultBytes { signed: Uint8Array; }
interface VerifyCallResult { signatures: unknown[]; }
interface EncryptResultBytes { ciphertext: Uint8Array; }
interface DecryptCallResult { plaintext: Uint8Array; recipients: unknown[]; symEncs: unknown[]; }

class WorkerSession {
  private rnp?: Rnp;
  private ffi?: Ffi;
  private passphrase = "";

  async init(): Promise<{ rnpVersion: string }> {
    if (!this.rnp) {
      this.rnp = await initRnp({ locateWasm: (p) => `./${p}` });
    }
    if (!this.ffi) {
      this.ffi = this.rnp.createFfi();
      this.ffi.setPasswordProvider(({ keyFingerprint: _kf, pgpContext: _ctx }) => {
        return this.passphrase;
      });
    }
    return { rnpVersion: this.rnp.versionString() };
  }

  setPassphrase(pw: string): void {
    this.passphrase = pw;
  }

  loadKey(bytes: Uint8Array, format: KeyFormat = "GPG"): Promise<{ publicCount: number; secretCount: number }> {
    if (!this.ffi) throw new Error("WorkerSession.loadKey before init()");
    using input = this.ffi.input(bytes);
    this.ffi.keyring.load(format, input);
    return Promise.resolve({
      publicCount: this.ffi.keyring.publicKeyCount,
      secretCount: this.ffi.keyring.secretKeyCount,
    });
  }

  sign(message: Uint8Array, signerFingerprint: string, opts: { hash?: string; mode?: "binary" | "cleartext" | "detached" } = {}): Promise<SignResultBytes> {
    if (!this.ffi) throw new Error("WorkerSession.sign before init()");
    const signer = this.ffi.keyring.mustLocate("fingerprint", signerFingerprint);
    try {
      using input = this.ffi.input(message);
      using output = this.ffi.output();
      using op = SignOperation.create(this.ffi, input, output, opts.mode ?? "binary")
        .addSignature(signer, opts.hash ? { hash: opts.hash } : {});
      op.execute();
      // Copy bytes before transferring ownership (the underlying output is destroyed below).
      const signed = output.bytes().slice();
      return Promise.resolve({ signed });
    } finally {
      signer.destroy();
    }
  }

  verify(signedBytes: Uint8Array): Promise<VerifyCallResult> {
    if (!this.ffi) throw new Error("WorkerSession.verify before init()");
    using input = this.ffi.input(signedBytes);
    using output = this.ffi.output();
    using op = VerifyOperation.create(this.ffi, input, output);
    const result = op.execute();
    return Promise.resolve({ signatures: result.signatures });
  }

  encrypt(message: Uint8Array, recipientFingerprint: string, opts: { aead?: string; cipher?: string } = {}): Promise<EncryptResultBytes> {
    if (!this.ffi) throw new Error("WorkerSession.encrypt before init()");
    const recipient = this.ffi.keyring.mustLocate("fingerprint", recipientFingerprint);
    try {
      using input = this.ffi.input(message);
      using output = this.ffi.output();
      using op = EncryptOperation.create(this.ffi, input, output).addRecipient(recipient);
      if (opts.cipher) op.cipher(opts.cipher);
      if (opts.aead)   op.aead(opts.aead);
      op.execute();
      const ciphertext = output.bytes().slice();
      return Promise.resolve({ ciphertext });
    } finally {
      recipient.destroy();
    }
  }

  decrypt(ciphertext: Uint8Array): Promise<DecryptCallResult> {
    if (!this.ffi) throw new Error("WorkerSession.decrypt before init()");
    using input = this.ffi.input(ciphertext);
    using output = this.ffi.output();
    // rnp 0.18.1: one-shot rnp_decrypt. No recipients/symenc metadata.
    decrypt(this.ffi, input, output);
    const plaintext = output.bytes().slice();
    return Promise.resolve({
      plaintext,
      recipients: [],
      symEncs: [],
    });
  }

  terminate(): void {
    try { this.ffi?.destroy(); } catch { /* swallow */ }
    this.ffi = undefined;
    // Keep this.rnp alive across sessions; only destroyed on worker shutdown.
  }
}

const session = new WorkerSession();

const api = {
  init: Comlink.proxy(session.init.bind(session)),
  setPassphrase: session.setPassphrase.bind(session),
  loadKey: session.loadKey.bind(session),
  sign: session.sign.bind(session),
  verify: session.verify.bind(session),
  encrypt: session.encrypt.bind(session),
  decrypt: session.decrypt.bind(session),
  terminate: session.terminate.bind(session),
};

export type WorkerApi = typeof api;

Comlink.expose(api);
