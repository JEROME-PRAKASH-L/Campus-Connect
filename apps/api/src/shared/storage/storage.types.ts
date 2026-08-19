export type SignedUpload = {
  /** Where the client PUTs the bytes. */
  uploadUrl: string;
  /** Headers the client must send with that PUT. */
  headers: Record<string, string>;
  /** Where the object will be readable once the PUT completes. */
  publicUrl: string;
};

export type SignArgs = {
  key: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
};

export type StorageDriver = {
  readonly name: 'local' | 's3';
  sign: (args: SignArgs) => Promise<SignedUpload>;
  /** Removes an object. Used when a record that owned the only reference is purged. */
  remove: (key: string) => Promise<void>;
};
