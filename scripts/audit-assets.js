import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(".");
const skippedDirectories = new Set([".git", "node_modules", "playwright-report", "test-results"]);
const sourceExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".php", ".xml"]);
const assetExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".pdf", ".png", ".svg", ".webp", ".woff", ".woff2", ".ttf", ".eot"]);
const assetPathPattern = /((?:\.\.\/|\.\/)*(?:assets|images|img|cmipics|teamimages|galleryimages)\/[\w./@%+-]+\.(?:avif|gif|jpe?g|pdf|png|svg|webp|woff2?|ttf|eot))/gi;

export function extractAssetReferences(content, sourcePath) {
    const source = sourcePath.replaceAll("\\", "/");
    const references = new Set();
    for (const match of content.matchAll(assetPathPattern)) {
        const reference = match[1].replaceAll("\\", "/");
        const normalized = reference.startsWith("../") || reference.startsWith("./")
            ? path.posix.normalize(path.posix.join(path.posix.dirname(source), reference))
            : path.posix.normalize(reference.replace(/^\/+/, ""));
        references.add(normalized);
    }
    return references;
}

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await walk(entryPath));
        else if (entry.isFile()) files.push(entryPath);
    }
    return files;
}

async function findCandidates() {
    const files = await walk(root);
    const candidates = files.filter((file) => {
        const relative = path.relative(root, file).replaceAll("\\", "/");
        const extension = path.extname(file).toLowerCase();
        return assetExtensions.has(extension)
            && /^(?:assets\/(?:img|fonts|docs)\/|images\/|img\/|cmipics\/|teamimages\/|galleryimages\/)/.test(relative);
    });
    const sources = files.filter((file) => sourceExtensions.has(path.extname(file).toLowerCase()));
    const references = new Set();
    for (const source of sources) {
        const content = await readFile(source, "utf8");
        const relative = path.relative(root, source).replaceAll("\\", "/");
        for (const reference of extractAssetReferences(content, relative)) references.add(reference.toLowerCase());
    }
    return candidates
        .map((file) => path.relative(root, file).replaceAll("\\", "/"))
        .filter((file) => !references.has(file.toLowerCase()))
        .sort();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const candidates = await findCandidates();
    if (candidates.length === 0) {
        console.log("No unreferenced media candidates found.");
    } else {
        console.log("Potentially unreferenced files (review before removing; dynamic CMS and external references are not inferred):");
        for (const candidate of candidates) console.log(`  ${candidate}`);
    }
}
