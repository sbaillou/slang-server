import { Config } from '../config.gen'

// What to load on start for the `defaultBuild` config option.
export type DefaultBuildResolution =
  | { type: 'none' }
  | { type: 'error'; message: string }
  | { type: 'found'; selectionIndex: number; file: string; isCommand: boolean }

// Find the `builds` entry named by `defaultBuild` and the single file its glob matches.
export async function resolveDefaultBuild(
  config: Config,
  findFiles: (glob: string) => Promise<string[]>
): Promise<DefaultBuildResolution> {
  const name = config.defaultBuild?.trim()
  if (!name) {
    return { type: 'none' }
  }
  if (config.build) {
    return {
      type: 'error',
      message: `Ignoring defaultBuild '${name}' because build is set to '${config.build}'`,
    }
  }

  const builds = config.builds ?? []
  const selectionIndex = builds.findIndex((build) => build.name?.trim() === name)
  const build = builds[selectionIndex]
  if (!build) {
    return { type: 'error', message: `defaultBuild '${name}' does not match any builds entry` }
  }
  const glob = build.glob?.trim()
  if (!glob) {
    return { type: 'error', message: `Build '${name}' has no glob` }
  }

  const files = [...new Set(await findFiles(glob))]
  if (files.length === 0) {
    return { type: 'error', message: `No files found for build '${name}' (glob: ${glob})` }
  }
  if (files.length > 1) {
    return {
      type: 'error',
      message: `defaultBuild '${name}' needs a glob matching a single file, but ${glob} matches ${files.length}`,
    }
  }
  return { type: 'found', selectionIndex, file: files[0]!, isCommand: !!build.command?.trim() }
}
