import { describe, expect, it } from 'vitest'
import { isZstd, parseAnkiMediaManifest } from '../../src/ingest/ankiMediaManifest'

/** Minimaler Protobuf-Encoder für `MediaEntries { repeated MediaEntry { string name = 1 } }`. */
function varint(n: number): number[] {
  const out: number[] = []
  let v = n
  while (v > 0x7f) {
    out.push((v & 0x7f) | 0x80)
    v = Math.floor(v / 128)
  }
  out.push(v)
  return out
}
function pbString(field: number, value: string): number[] {
  const bytes = [...new TextEncoder().encode(value)]
  return [(field << 3) | 2, ...varint(bytes.length), ...bytes]
}
function pbVarintField(field: number, value: number): number[] {
  return [(field << 3) | 0, ...varint(value)]
}
export function encodeMediaEntries(entries: { name: string; size?: number }[]): Uint8Array {
  const out: number[] = []
  for (const entry of entries) {
    const msg = [...pbString(1, entry.name), ...(entry.size !== undefined ? pbVarintField(2, entry.size) : [])]
    out.push((1 << 3) | 2, ...varint(msg.length), ...msg)
  }
  return new Uint8Array(out)
}

describe('parseAnkiMediaManifest', () => {
  it('liest die Dateinamen in Archiv-Reihenfolge', () => {
    const buf = encodeMediaEntries([{ name: 'front.png' }, { name: 'audio.mp3' }, { name: 'diagramm.jpg' }])
    expect(parseAnkiMediaManifest(buf)).toEqual(['front.png', 'audio.mp3', 'diagramm.jpg'])
  })

  it('überspringt unbekannte Felder eines Eintrags (size, sha1)', () => {
    const buf = encodeMediaEntries([{ name: 'pic.png', size: 12345 }])
    expect(parseAnkiMediaManifest(buf)).toEqual(['pic.png'])
  })

  it('hält die Indizes: ein Eintrag ohne Namen wird zu ""', () => {
    // MediaEntry #0 hat nur ein size-Feld (kein name), #1 hat einen Namen.
    const first = [...[(2 << 3) | 0, ...varint(7)]] // MediaEntry { size = 7 }
    const out: number[] = [(1 << 3) | 2, ...varint(first.length), ...first]
    const second = encodeMediaEntries([{ name: 'zweite.png' }])
    expect(parseAnkiMediaManifest(new Uint8Array([...out, ...second]))).toEqual(['', 'zweite.png'])
  })

  it('kommt mit leerem Manifest klar', () => {
    expect(parseAnkiMediaManifest(new Uint8Array())).toEqual([])
  })

  it('wirft bei kaputten Bytes (abgeschnittenes Varint)', () => {
    expect(() => parseAnkiMediaManifest(new Uint8Array([0x0a, 0xff, 0xff]))).toThrow()
  })
})

describe('isZstd', () => {
  it('erkennt die Zstandard-Magic', () => {
    expect(isZstd(new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0x00]))).toBe(true)
    expect(isZstd(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false) // PNG
    expect(isZstd(new Uint8Array([0x28, 0xb5]))).toBe(false)
  })
})
