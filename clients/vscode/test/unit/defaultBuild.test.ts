import tape from 'tape'

import { Config } from '../../src/config.gen'
import { resolveDefaultBuild } from '../../src/lib/defaultBuild'

const builds: Config['builds'] = [
  { name: 'filelist', glob: 'builds/*.f' },
  { name: 'sim', glob: 'tb/top/hier', command: 'scripts/gen_f.py' },
]

function findFilesFrom(matches: Record<string, string[]>) {
  return async (glob: string) => matches[glob] ?? []
}

tape('resolveDefaultBuild does nothing when defaultBuild is unset', async (t) => {
  t.deepEqual(await resolveDefaultBuild({ builds }, findFilesFrom({})), { type: 'none' })
  t.deepEqual(await resolveDefaultBuild({ builds, defaultBuild: ' ' }, findFilesFrom({})), {
    type: 'none',
  })
})

tape('resolveDefaultBuild selects a command build by name', async (t) => {
  const resolution = await resolveDefaultBuild(
    { builds, defaultBuild: 'sim' },
    findFilesFrom({ 'tb/top/hier': ['/ws/tb/top/hier'] })
  )
  t.deepEqual(resolution, {
    type: 'found',
    selectionIndex: 1,
    file: '/ws/tb/top/hier',
    isCommand: true,
  })
})

tape('resolveDefaultBuild selects a direct build', async (t) => {
  const resolution = await resolveDefaultBuild(
    { builds, defaultBuild: 'filelist' },
    findFilesFrom({ 'builds/*.f': ['/ws/builds/a.f', '/ws/builds/a.f'] })
  )
  t.deepEqual(resolution, {
    type: 'found',
    selectionIndex: 0,
    file: '/ws/builds/a.f',
    isCommand: false,
  })
})

tape('resolveDefaultBuild rejects a glob matching several files', async (t) => {
  const resolution = await resolveDefaultBuild(
    { builds, defaultBuild: 'filelist' },
    findFilesFrom({ 'builds/*.f': ['/ws/builds/b.f', '/ws/builds/a.f'] })
  )
  t.equal(resolution.type, 'error')
})

tape('resolveDefaultBuild reports unknown names and empty globs', async (t) => {
  const unknown = await resolveDefaultBuild({ builds, defaultBuild: 'nope' }, findFilesFrom({}))
  t.equal(unknown.type, 'error')

  const noMatch = await resolveDefaultBuild({ builds, defaultBuild: 'sim' }, findFilesFrom({}))
  t.equal(noMatch.type, 'error')

  const noGlob = await resolveDefaultBuild(
    { builds: [{ name: 'sim' }], defaultBuild: 'sim' },
    findFilesFrom({})
  )
  t.equal(noGlob.type, 'error')
})

tape('resolveDefaultBuild defers to an explicit build file', async (t) => {
  const resolution = await resolveDefaultBuild(
    { builds, build: 'compile.f', defaultBuild: 'sim' },
    findFilesFrom({ 'tb/top/hier': ['/ws/tb/top/hier'] })
  )
  t.equal(resolution.type, 'error')
})
