import os from "os"
import assert from "assert"
import path from "path"
import fs from "fs/promises"
import { RunOptions, RunTarget } from "github-action-ts-run-api"

async function test_just(tmpdir: string, runnerToolCache: string) {
    let target = RunTarget.mainJs("action.yml")
    let options = RunOptions.create({
        tempDir: tmpdir,
        githubServiceEnv: {
            RUNNER_TOOL_CACHE: runnerToolCache,
        },
        fakeFsOptions: {
            tmpRootDir: tmpdir,
        },
        inputs: {
            owner: "casey",
            repo: "just",
            version: "1.13.0",
            test: "just --version",
            "github-token": process.env["GITHUB_TOKEN"],
        },
    })

    let res = await target.run(options)

    assert(res.error === undefined)
    assert(res.isSuccess)
    assert(res.exitCode !== 1)

    assert(res.commands.addedPaths.find((p) => p.includes("just")) != undefined)

    return res.stdout
}

async function test_staticcheck(tmpdir: string, runnerToolCache: string) {
    let target = RunTarget.mainJs("action.yml")
    let options = RunOptions.create({
        tempDir: tmpdir,
        githubServiceEnv: {
            RUNNER_TOOL_CACHE: runnerToolCache,
        },
        fakeFsOptions: {
            tmpRootDir: tmpdir,
        },
        inputs: {
            owner: "dominikh",
            repo: "go-tools",
            version: "2023.1.3",
            bin: "staticcheck/staticcheck",
            test: "staticcheck -version",
            "github-token": process.env["GITHUB_TOKEN"],
        },
    })

    let res = await target.run(options)

    assert(res.error == undefined)
    assert(res.isSuccess)
    assert(res.exitCode !== 1)

    assert(res.commands.addedPaths.find((p) => p.includes("staticcheck")) != undefined)

    return res.stdout
}

async function test_golangcilint(tmpdir: string, runnerToolCache: string) {
    let target = RunTarget.mainJs("action.yml")
    let options = RunOptions.create({
        tempDir: tmpdir,
        githubServiceEnv: {
            RUNNER_TOOL_CACHE: runnerToolCache,
        },
        fakeFsOptions: {
            tmpRootDir: tmpdir,
        },
        env: {
            GOMODCACHE: path.join(runnerToolCache, ".gomodcache"),
            GOCACHE: path.join(runnerToolCache, ".gocache"),
            GOLANGCI_LINT_CACHE: path.join(runnerToolCache, ".golangci_lint_cache"),
        },
        inputs: {
            owner: "golangci",
            repo: "golangci-lint",
            version: "v1.52.2",
            bin: "golangci-lint-1.52.2-{{platform}}-{{arch}}/golangci-lint",
            test: "golangci-lint version",
            "github-token": process.env["GITHUB_TOKEN"],
        },
    })

    let res = await target.run(options)

    assert(res.error == undefined)
    assert(res.isSuccess)
    assert(res.exitCode !== 1)

    assert(res.commands.addedPaths.find((p) => p.includes("golangci-lint")) != undefined)

    return res.stdout
}

async function test_gitfilterrepo(tmpdir: string, runnerToolCache: string) {
    let target = RunTarget.mainJs("action.yml")
    let options = RunOptions.create({
        tempDir: tmpdir,
        githubServiceEnv: {
            RUNNER_TOOL_CACHE: runnerToolCache,
        },
        fakeFsOptions: {
            tmpRootDir: tmpdir,
        },
        env: {},
        inputs: {
            owner: "newren",
            repo: "git-filter-repo",
            version: "v2.38.0",
            bin: "git-filter-repo-2.38.0/git-filter-repo",
            test: "git-filter-repo --version",
            "github-token": process.env["GITHUB_TOKEN"],
        },
    })

    let res = await target.run(options)

    assert(res.error == undefined)
    assert(res.isSuccess)
    assert(res.exitCode !== 1)

    assert(res.commands.addedPaths.find((p) => p.includes("git-filter-repo")) != undefined)

    return res.stdout
}

async function testNoCache() {
    console.log("================")
    console.log(" TEST: No Cache ")
    console.log("================")

    let tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "testnocache"))
    let runnerToolCache = path.join(tmpdir, "runner-tool-cache")
    await fs.mkdir(runnerToolCache)

    try {
        await test_just(tmpdir, runnerToolCache)
        await test_staticcheck(tmpdir, runnerToolCache)
        await test_golangcilint(tmpdir, runnerToolCache)
        let output = await test_gitfilterrepo(tmpdir, runnerToolCache)
        console.log("output", output)
    } finally {
        await fs.rm(tmpdir, { recursive: true })
    }
}

async function testWithCache() {
    console.log("================")
    console.log("TEST: With Cache")
    console.log("================")

    let tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "testwithcache"))
    let runnerToolCache = path.join(tmpdir, "runner-tool-cache")
    await fs.mkdir(runnerToolCache)

    try {
        await test_just(tmpdir, runnerToolCache)
        let secondRun = await test_just(tmpdir, runnerToolCache)
        assert(secondRun?.includes(`Found tool in cache just 1.13.0 ${process.arch}`))

        await test_staticcheck(tmpdir, runnerToolCache)
        secondRun = await test_staticcheck(tmpdir, runnerToolCache)
        assert(secondRun?.includes(`Found tool in cache staticcheck 2023.1.3 ${process.arch}`))

        await test_golangcilint(tmpdir, runnerToolCache)
        secondRun = await test_golangcilint(tmpdir, runnerToolCache)
        assert(secondRun?.includes(`Found tool in cache golangci-lint 1.52.2 ${process.arch}`))

        await test_gitfilterrepo(tmpdir, runnerToolCache)
        secondRun = await test_gitfilterrepo(tmpdir, runnerToolCache)
        assert(secondRun?.includes(`Found tool in cache git-filter-repo 2.38.0 ${process.arch}`))
    } finally {
        await fs.rm(tmpdir, { recursive: true })
    }
}

async function runTests() {
    await testNoCache()
    await testWithCache()
}

runTests()
