import { generateKeyPairSync, sign } from "node:crypto";

export const ACCESS_TEAM_DOMAIN = "cmi-test.cloudflareaccess.com";
export const CMS_AUDIENCE = "cmi-cms-test-audience";
export const REVIEWS_AUDIENCE = "cmi-reviews-test-audience";
export const ACCESS_ENV = {
    CF_ACCESS_TEAM_DOMAIN: ACCESS_TEAM_DOMAIN,
    CF_ACCESS_CMS_AUD: CMS_AUDIENCE,
    CF_ACCESS_AUD: REVIEWS_AUDIENCE,
    CMS_EDITOR_EMAILS: "editor@example.com",
    CMS_APPROVER_EMAILS: "approver@example.com",
};

const KEY_ID = "cmi-pages-function-test-key";
const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKey = {
    ...keyPair.publicKey.export({ format: "jwk" }),
    kid: KEY_ID,
    alg: "RS256",
    use: "sig",
};

export function createAccessToken(email, audience) {
    const header = { alg: "RS256", kid: KEY_ID, typ: "JWT" };
    const payload = {
        iss: `https://${ACCESS_TEAM_DOMAIN}`,
        aud: [audience],
        email,
        exp: Math.floor(Date.now() / 1000) + 300,
    };
    const signingInput = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
    const signature = sign("RSA-SHA256", Buffer.from(signingInput), keyPair.privateKey).toString("base64url");
    return `${signingInput}.${signature}`;
}

export function mockAccessKeys(t) {
    const keyEndpoint = `https://${ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;
    t.mock.method(globalThis, "fetch", async (input) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url !== keyEndpoint) throw new Error(`Unexpected test network request: ${url}`);
        return Response.json({ keys: [publicKey] });
    });
}