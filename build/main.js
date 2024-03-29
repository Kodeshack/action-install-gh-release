"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const core = __importStar(require("@actions/core"));
const install_release_1 = require("./install_release");
async function main() {
    try {
        let owner = core.getInput("owner");
        if (!owner) {
            throw new Error("owner input must be set");
        }
        let repo = core.getInput("repo");
        if (!repo) {
            throw new Error("repo input must be set");
        }
        let version = core.getInput("version");
        if (!version) {
            throw new Error("version input must be set");
        }
        await (0, install_release_1.installRelease)({
            owner,
            repo,
            version,
            bin: core.getInput("bin"),
            test: core.getInput("test"),
            ghToken: process.env.GITHUB_TOKEN || core.getInput("github-token"),
        }, core);
    }
    catch (err) {
        if (err instanceof Error) {
            core.setFailed(err.message);
        }
    }
}
exports.main = main;
//# sourceMappingURL=main.js.map