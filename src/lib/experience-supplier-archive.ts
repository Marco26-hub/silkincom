// ZIP32 with stored entries. These PDFs already compress their own streams, and
// the caller bounds the archive to ten small documents.
const crcTable = Uint32Array.from({ length: 256 }, (_, byte) => {
  for (let bit = 0; bit < 8; bit++) {
    byte = byte & 1 ? 0xedb88320 ^ (byte >>> 1) : byte >>> 1;
  }
  return byte >>> 0;
});

export function createSupplierArchive(
  files: readonly { code: string; bytes: Uint8Array }[],
) {
  if (!files.length || files.length > 10)
    throw new Error("Invalid archive size");
  const records: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  const codes = new Set<string>();
  for (const { code, bytes } of files) {
    if (!/^EXP-F-[0-9A-F]{12}$/.test(code) || codes.has(code))
      throw new Error("Invalid or duplicate supplier PDF code");
    codes.add(code);
    const name = Buffer.from(`SILKinCOM-${code}.pdf`, "ascii");
    const data = Buffer.from(bytes);
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x21, 12); // DOS date: 1980-01-01.
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    records.push(header, name, data);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x21, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    directory.push(entry, name);
    offset += header.length + name.length + data.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(
    directory.reduce((sum, part) => sum + part.length, 0),
    12,
  );
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...records, ...directory, end]);
}
