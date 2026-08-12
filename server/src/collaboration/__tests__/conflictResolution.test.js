import * as Y from 'yjs'

const sync     = (src, tgt) => Y.applyUpdate(tgt, Y.encodeStateAsUpdate(src))
const syncBoth = (a, b)     => { sync(a, b); sync(b, a) }

describe('Yjs CRDT conflict resolution', () => {
  test('concurrent inserts converge to identical non-empty string', () => {
    const [a, b] = [new Y.Doc(), new Y.Doc()]
    a.getText('content').insert(0, 'Hello'); sync(a, b)
    a.getText('content').insert(5, ' Alice')
    b.getText('content').insert(5, ' Bob')
    syncBoth(a, b)
    const rA = a.getText('content').toString()
    const rB = b.getText('content').toString()
    expect(rA).toBe(rB)
    expect(rA).toContain('Hello')
    expect(rA).toContain('Alice')
    expect(rA).toContain('Bob')
  })

  test('concurrent deletes converge without throwing', () => {
    const [a, b] = [new Y.Doc(), new Y.Doc()]
    a.getText('content').insert(0, 'Delete me'); sync(a, b)
    a.getText('content').delete(0, 6)
    b.getText('content').delete(0, 6)
    syncBoth(a, b)
    expect(a.getText('content').toString()).toBe(b.getText('content').toString())
  })

  test('insert + delete from different clients converges', () => {
    const [a, b] = [new Y.Doc(), new Y.Doc()]
    a.getText('content').insert(0, 'Base text'); sync(a, b)
    a.getText('content').insert(9, ' appended')
    b.getText('content').delete(0, 4)
    syncBoth(a, b)
    const r = a.getText('content').toString()
    expect(r).toBe(b.getText('content').toString())
    expect(r).toContain('appended')
    expect(r).not.toContain('Base')
  })

  test('three-way merge converges', () => {
    const docs = [new Y.Doc(), new Y.Doc(), new Y.Doc()]
    docs[0].getText('content').insert(0, 'Start')
    sync(docs[0], docs[1]); sync(docs[0], docs[2])
    docs[0].getText('content').insert(5, ' A')
    docs[1].getText('content').insert(5, ' B')
    docs[2].getText('content').insert(5, ' C')
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j) sync(docs[i], docs[j])
    const results = docs.map(d => d.getText('content').toString())
    expect(results[0]).toBe(results[1]); expect(results[1]).toBe(results[2])
    expect(results[0]).toContain('Start')
  })

  test('empty documents merge without error', () => {
    const [a, b] = [new Y.Doc(), new Y.Doc()]
    expect(() => syncBoth(a, b)).not.toThrow()
    expect(a.getText('content').toString()).toBe('')
  })

  test('large concurrent insertions preserve all content', () => {
    const [a, b] = [new Y.Doc(), new Y.Doc()]
    a.getText('content').insert(0, 'x'.repeat(500))
    b.getText('content').insert(0, 'x'.repeat(500))
    syncBoth(a, b)
    expect(a.getText('content').toString()).toBe(b.getText('content').toString())
    expect(a.getText('content').length).toBe(1000)
  })
})
