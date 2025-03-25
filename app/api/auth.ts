import * as v from "valibot";
import jwt from "jsonwebtoken";
import { getSecret } from "~/db/dao";

export const DeleteScope = v.object({
  type: v.literal("delete"),
  object: v.optional(v.string()),
});

export const UploadScope = v.object({
  type: v.literal("upload"),
});

export const ListScope = v.object({
  type: v.literal("list"),
});

export const DetailScope = v.object({
  type: v.literal("detail"),
});

export const AuthScopeSchema = v.variant("type", [
  DeleteScope,
  UploadScope,
  ListScope,
  DetailScope,
]);

export type AuthScope = v.InferOutput<typeof AuthScopeSchema>;

export function getScopes(scopes: unknown[]): AuthScope[] {
  return scopes
    .map((scope) => v.safeParse(AuthScopeSchema, scope))
    .filter((s) => s.success)
    .map((s) => s.output);
}

export async function decodeJWT(token: string): Promise<AuthScope[]> {
  const decoded = jwt.verify(token, getSecret("JWT"));
  if (typeof decoded === "string") {
    throw new Error("Invalid JWT");
  }

  return getScopes(decoded.scopes ?? []);
}

export function allScopes(): AuthScope[] {
  return [
    { type: "delete" },
    { type: "upload" },
    { type: "list" },
    { type: "detail" },
  ];
}

// export enum JWT_AUD {
//     ACCESS = "acs",
//     REFRESH = "new",
//     UPLOAD = "up",
//     DELETE = "del",
// }

// function generateUploadToken() {
//     return jwt.sign({}, jwtSecret, {
//         audience: JWT_AUD.UPLOAD
//     });
// }

// const ACCESS_LIFE = 15 * MINUTES;
// function generateAccessToken() {
//     return jwt.sign({}, jwtSecret, {
//         audience: JWT_AUD.ACCESS,
//         expiresIn: ACCESS_LIFE
//     });
// }

// export async function generateDeleteToken(subject: string): Promise<string> {
//     return jwt.sign({}, jwtSecret, {
//         subject: subject,
//         audience: JWT_AUD.DELETE,
//         expiresIn: (await getConfig()).admin.deleteTimeout * MINUTES
//     });
// }

// const REFRESH_LIFE = 6 * WEEKS;
// async function generateRefreshToken(id?: string) {
//     const newToken = new RefreshToken();
//     newToken.expires = timeFromNow(REFRESH_LIFE);
//     if (id) newToken.id = id; // For renewing an old token

//     await getConnection().manager.save(RefreshToken, newToken);

//     return jwt.sign({}, jwtSecret, {
//         jwtid: newToken.id,
//         audience: JWT_AUD.REFRESH,
//         expiresIn: REFRESH_LIFE
//     });
// }

// interface DecodedRefreshToken {
//     jti: string
// }

// /**
//  * Verify that the refresh token is still valid, and hasn't been revoked.
//  * @param id The id of the refresh token
//  */
// async function verifyRefreshToken(id: string): Promise<boolean> {
//     const token = await getConnection().manager.findOne(RefreshToken, id);
//     if (!token) return false;

//     // Check for expiry
//     if (new Date() > token.expires) {
//         return false;
//     }

//     return true;
// }

// /**
//  * Removes expired refresh tokens from the database.
//  * They cannot be used anyways, but it's good to clear them for storage reasons.
//  */
// export async function clearOldTokens(): Promise<void> {
//     await getConnection().manager
//         .createQueryBuilder(RefreshToken, "token")
//         .delete().where(
//             "expires < datetime('now')"
//         ).execute();
// }

// /**
//  * Sanity check that the token has a valid shape
//  * This shouldn't be an issue because of signing, but
//  * could be useful for version upgrades with altering API.
//  */
// function validateTokenShape(t: unknown): t is DecodedRefreshToken {
//     if (t && typeof t === "object") {
//         const tok = t as DecodedRefreshToken;
//         if (typeof tok.jti === "string") {
//             return true;
//         }
//     }

//     return false;
// }

// /**
//  * Extracts the token logic to one place for consistency
//  */
// function sendTokens(res: Response, access: string, refresh: string) {
//     res.cookie("refreshToken", refresh, {
//         maxAge: REFRESH_LIFE,
//         path: "/api/refresh",
//         httpOnly: true,
//         secure: true
//     }).send({
//         accessToken: access
//     });
// }

// const loginCounter = new metrics.Counter({
//     name: metrics.prefix + "logins",
//     help: "Number of logins by their success/failure status",
//     labelNames: ["result"]
// });

// /**
//  * @api {post} /login Perform a password-based login
//  * @apiName Login
//  * @apiGroup Authentication
//  *
//  * @apiParam {String} password The application password
//  *
//  * @apiSuccess (Body) {String} accessToken Token that can be used for API requests.
//  * @apiSuccess (Cookie) {String} refreshToken A http-only cookie set, to be used for the refresh endpoint.
//  */
// AuthRouter.post("/login", async (req, res) => {
//     logger.trace("/login");

//     if (typeof req.body?.password !== "string") {
//         logger.debug("No body on /login");
//         return res.sendStatus(401);
//     }

//     // Try to overwrite the Refresh token to avoid dangling tokens
//     let tokenID: string | undefined = undefined;
//     const encodedToken = req.cookies.refreshToken ?? "";
//     try {
//         const token = jwt.verify(encodedToken, jwtSecret, {
//             audience: JWT_AUD.REFRESH
//         });

//         if (validateTokenShape(token)) {
//             tokenID = token.jti;
//         }
//     } catch {
//         // New session
//     }

//     const passwordHash = (await getConfig()).admin.passwordHash;
//     if (!(await verifyPassword(req.body.password, passwordHash))) {
//         logger.debug(chalk`Password {red failure} on /login`);
//         loginCounter.inc({ result: "failure" });
//         return res.sendStatus(401);
//     }

//     logger.debug(chalk`Password {green success} on /login`);
//     const accessToken = generateAccessToken();
//     const refreshToken = await generateRefreshToken(tokenID);
//     loginCounter.inc({ result: "success" });
//     return sendTokens(res, accessToken, refreshToken);
// });

// /**
//  * @api {post} /refresh Obtain a new access-token
//  * @apiName Refresh
//  * @apiGroup Authentication
//  *
//  * @apiSuccess (Body) {String} accessToken Token that can be used for API requests.
//  * @apiSuccess (Cookie) {String} refreshToken A http-only cookie set, to be used for the refresh endpoint.
//  */
// AuthRouter.post("/refresh", async (req, res) => {
//     // Verify that the request contains a valid refresh token
//     if (!req.cookies) return res.sendStatus(401);
//     const encodedToken = req.cookies.refreshToken ?? "";
//     try {
//         const token = jwt.verify(encodedToken, jwtSecret, {
//             audience: JWT_AUD.REFRESH
//         });

//         if (validateTokenShape(token) && await verifyRefreshToken(token.jti)) {
//             const accessToken = generateAccessToken();
//             const refreshToken = await generateRefreshToken(token.jti);
//             return sendTokens(res, accessToken, refreshToken);
//         } else {
//             return res.sendStatus(400);
//         }
//     } catch {
//         return res.sendStatus(401);
//     }
// });

// AuthRouter.get("/utoken", requireAccessToken, (_req, res) => {
//     const token = generateUploadToken();
//     return res.status(200).send({ ok: true, token });
// });

// /**
//  * @api {post} /logout Invalidates the refresh token
//  * @apiName Logout
//  * @apiGroup Authentication
//  */
// AuthRouter.post("/logout", async (req, res) => {
//     // Verify that the request contains a valid refresh token
//     if (!req.cookies) return res.sendStatus(401);
//     const encodedToken = req.cookies.refreshToken ?? "";
//     try {
//         const token = jwt.verify(encodedToken, jwtSecret, {
//             audience: JWT_AUD.REFRESH
//         });

//         if (validateTokenShape(token)) {
//             await getConnection().manager.delete(RefreshToken, { id: token.jti });
//             return res.sendStatus(200);
//         } else {
//             return res.sendStatus(400);
//         }
//     } catch {
//         return res.sendStatus(401);
//     }
// });

// export interface BearerRequest extends Request {
//     bearer: string
// }

// function requireBearer(req: BearerRequest, res: Response, next: NextFunction): void {
//     if (req.headers.authorization) {
//         logger.trace("bearer auth extraction");

//         const parts = req.headers.authorization.split(" ");
//         if (parts.length === 2 && parts[0] === "Bearer") {
//             req.bearer = parts[1];
//             return next();
//         }

//         logger.debug("bearer auth extraction failure", parts);
//     }

//     return void res.sendStatus(401);
// }

// export interface AuthCheckRequest extends Request {
//     authed: boolean
// }

// const authFailCounter = new metrics.Counter({
//     name: metrics.prefix + "auth_failures",
//     help: "Number of authentication failures by scope type",
//     labelNames: ["scope"]
// });

// /**
//  * Middleware for page authentication
//  * **Not** to be used for API routes
//  */
// export async function checkAuthed(req: AuthCheckRequest, res: Response, next: NextFunction): Promise<void> {
//     logger.trace("page auth check");
//     req.authed = false;

//     if (!req.cookies) {
//         return next();
//     }

//     logger.trace("page auth check: checking cookies");
//     const encodedToken = req.cookies.refreshToken ?? "";
//     try {
//         const token = jwt.verify(encodedToken, jwtSecret, {
//             audience: JWT_AUD.REFRESH
//         });

//         if (validateTokenShape(token) && await verifyRefreshToken(token.jti)) {
//             logger.debug(chalk`page auth check: {green valid token}`);
//             req.authed = true;
//         } else {
//             logger.debug(chalk`page auth check: {red bad token: ${JSON.stringify(token)}}`);
//             authFailCounter.inc({ scope: "page" });
//         }
//     } catch (e) {
//         logger.debug(chalk`page auth check: {red invalid token: ${e}}`);
//         authFailCounter.inc({ scope: "page" });
//     } finally {
//         next();
//     }
// }

// /**
//  * Middleware for API authentication
//  * **Not** to be used for page routes
//  */
// export function requireAccessToken(req: BearerRequest, res: Response, next: NextFunction): void {
//     requireBearer(req, res, () => {
//         try {
//             logger.trace("bearer auth validation");
//             jwt.verify(req.bearer, jwtSecret, {
//                 audience: JWT_AUD.ACCESS
//             });

//             next();
//         } catch (e) {
//             logger.debug("bearer auth validation failure:", e);
//             authFailCounter.inc({ scope: "api" });
//             return void res.sendStatus(401);
//         }
//     });
// }

// export function requireUploadToken(req: BearerRequest, res: Response, next: NextFunction): void {
//     requireBearer(req, res, () => {
//         try {
//             jwt.verify(req.bearer, jwtSecret, {
//                 audience: JWT_AUD.UPLOAD
//             });

//             next();
//         } catch {
//             // Maybe it's an access token?
//             try {
//                 jwt.verify(req.bearer, jwtSecret, {
//                     audience: JWT_AUD.ACCESS
//                 });

//                 next();
//             } catch {
//                 authFailCounter.inc({ scope: "upload" });
//                 return void res.sendStatus(401);
//             }
//         }
//     });
// }

// export interface DeleteCheckRequest extends Request {
//     deleting: false | number
// }

// export async function processDeleteToken(req: DeleteCheckRequest, res: Response, next: NextFunction): Promise<void> {
//     logger.trace("delete check");
//     req.deleting = false;

//     if (req.params.token) {
//         try {
//             const token = jwt.verify(req.params.token, jwtSecret, {
//                 audience: JWT_AUD.DELETE
//             }) as { sub: string };

//             const sub = parseInt(token.sub);
//             req.deleting = isNaN(sub) ? false : sub;
//         } catch (e) {
//             logger.warn(chalk`delete requested with invalid token: {yellow ${e}}`);
//         }
//     }

//     if (req.deleting === false) {
//         authFailCounter.inc({ scope: "delete" });
//         return void res.sendStatus(401);
//     }

//     next();
// }
