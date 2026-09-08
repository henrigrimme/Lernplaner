/**
 * Liest das **neue** Anki-Medienmanifest (Anki ≥ 2.1.50). Statt der alten
 * JSON-Map `{ "0": "bild.png", … }` ist die `media`-Datei jetzt ein
 * Protobuf `MediaEntries { repeated MediaEntry entries = 1 }` mit
 * `MediaEntry { string name = 1; uint32 size = 2; bytes sha1 = 3; }`.
 * Die Reihenfolge der Einträge entspricht den nummerierten Archivdateien
 * (`entries[i]` ↔ ZIP-Eintrag `"i"`).
 *
 * Kein Protobuf-Runtime (die App zieht sonst keine ein) — die
 * Wire-Format-Kodierung ist simpel genug für einen handgeschriebenen
 * Mini-Parser: Tag-Varint, `field = tag >> 3`, `wireType = tag & 7`,
 * `wireType 2` = längenpräfixiert. Unbekannte Felder werden übersprungen.
 */

function readVarint(buf: Uint8Array, pos: number): [value: number, next: number] {
  let result = 0
  let multiplier = 1
  let p = pos
  for (;;) {
    if (p >= buf.length) throw new Error('Varint reicht über das Ende hinaus')
    const byte = buf[p]!
    p += 1
    result += (byte & 0x7f) * multiplier
    if ((byte & 0x80) === 0) break
    multiplier *= 128
    if (multiplier > Number.MAX_SAFE_INTEGER) throw new Error('Varint zu groß')
  }
  return [result, p]
}

/** Überspringt den Wert eines Feldes anhand seines Wire-Typs, gibt die neue Position zurück. */
function skipValue(buf: Uint8Array, pos: number, wireType: number): number {
  switch (wireType) {
    case 0: {
      const [, next] = readVarint(buf, pos)
      return next
    }
    case 1:
      return pos + 8
    case 5:
      return pos + 4
    case 2: {
      const [len, next] = readVarint(buf, pos)
      return next + len
    }
    default:
      throw new Error(`Unbekannter Protobuf-Wire-Typ ${wireType}`)
  }
}

/** Der Name (`field 1`, string) eines `MediaEntry`-Teilbaums — leer, wenn keiner da ist. */
function readEntryName(buf: Uint8Array): string {
  let pos = 0
  while (pos < buf.length) {
    const [tag, afterTag] = readVarint(buf, pos)
    pos = afterTag
    const field = tag >>> 3
    const wireType = tag & 7
    if (field === 1 && wireType === 2) {
      const [len, afterLen] = readVarint(buf, pos)
      return new TextDecoder('utf-8').decode(buf.subarray(afterLen, afterLen + len))
    }
    pos = skipValue(buf, pos, wireType)
  }
  return ''
}

/**
 * Die Dateinamen in Archiv-Reihenfolge (`result[i]` gehört zu ZIP-Eintrag
 * `"i"`). Nicht benannte Einträge landen als `""` — die Indizes bleiben
 * dadurch korrekt ausgerichtet.
 */
export function parseAnkiMediaManifest(buf: Uint8Array): string[] {
  const names: string[] = []
  let pos = 0
  while (pos < buf.length) {
    const [tag, afterTag] = readVarint(buf, pos)
    pos = afterTag
    const field = tag >>> 3
    const wireType = tag & 7
    if (field === 1 && wireType === 2) {
      const [len, afterLen] = readVarint(buf, pos)
      names.push(readEntryName(buf.subarray(afterLen, afterLen + len)))
      pos = afterLen + len
    } else {
      pos = skipValue(buf, pos, wireType)
    }
  }
  return names
}

/** Beginnen die Bytes mit der Zstandard-Magic (`0x28 B5 2F FD`)? */
export function isZstd(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd
}
