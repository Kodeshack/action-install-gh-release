import * as core from "@actions/core"
import * as github from "@actions/github"
import * as tc from "@actions/tool-cache"
import { exec } from "@actions/exec"
import path from "path"

export interface FetchRepoOpts {
    owner: string
    repo: string
    version: string
    bin?: string
    test?: string
    ghToken: string
}

export interface Logger {
    info(msg: string): void
}

export async function fetchRepo(opts: FetchRepoOpts, log?: Logger) {
    let execTemplate = template({ arch: arch(), platform: process.platform, version: opts.version })

    let binPath = execTemplate(opts.bin || opts.repo)
    console.log("binPath", binPath)
    let bin = binPath.includes("/") ? path.basename(binPath) : binPath
    console.log("bin", bin)

    let repo = { owner: opts.owner, repo: opts.repo }
    let octokit = github.getOctokit(opts.ghToken)

    let release = await octokit.rest.repos.getReleaseByTag({ ...repo, tag: opts.version })

    let assets = await octokit.rest.repos.listReleaseAssets({
        ...repo,
        release_id: release.data.id,
    })

    let cachedDir = tc.find(bin, release.data.tag_name, process.arch)
    if (cachedDir) {
        await addToDirAndTest(cachedDir, opts, log)
        return
    }

    let archPattern = constructArchPattern()
    let platformPattern = constructPlatformPattern()
    let extension = /\.(tar|bz|gz|tgz|zip)/

    let asset = assets.data.find(
        (a) => archPattern.test(a.name) && platformPattern.test(a.name) && extension.test(a.name)
    )
    if (!asset) {
        throw new Error(
            `can't find release of ${opts.version}/${opts.repo} matching ${opts.version} for ${process.platform} ${process.arch}`
        )
    }

    core.info(`Downloading ${asset.browser_download_url}`)
    let downloadPath = await tc.downloadTool(asset.browser_download_url)
    let extractedPath = await tc.extractTar(downloadPath)

    let cacheDir = path.join(extractedPath, path.dirname(binPath))
    core.info(`Looking for binary ${cacheDir}/${bin}`)
    let cachedPath = await tc.cacheDir(cacheDir, bin, release.data.tag_name)

    await addToDirAndTest(cachedPath, opts, log)
}

async function addToDirAndTest(dir: string, opts: FetchRepoOpts, log?: Logger) {
    core.addPath(dir)
    if (opts.test) {
        await exec(opts.test)
    }
    log?.info(`Successfully setup ${opts.owner}/${opts.repo} ${opts.version}`)
}

function constructArchPattern(): RegExp {
    switch (process.arch) {
        case "arm":
        case "arm64":
            return /arm|arm64|aarch64/i
        case "x64":
            return /amd64|x86_64/i
    }

    throw new Error(`Arch ${process.arch} not supported by action`)
}

function constructPlatformPattern(): RegExp {
    switch (process.platform) {
        case "darwin":
            return /darwin|apple/i
        case "linux":
            return /linux/i
    }

    throw new Error(`OS ${process.platform} not supported by action`)
}

function arch(): string {
    switch (process.arch) {
        case "arm":
        case "arm64":
            return "arm64"
        case "x64":
            return "amd64"
    }

    return process.arch
}

let templateVar = /{{\s*.*?\s*}}/g

function template(values: {
    platform: string
    arch: string
    version: string
}): (s: string) => string {
    return (str: string) => {
        return str.replace(templateVar, (match) => {
            let key = match.replace(/[{}]+/g, "").trim() as keyof typeof values
            return values[key] ?? match
        })
    }
}
