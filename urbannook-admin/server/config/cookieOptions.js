const isProd = process.env.NODE_ENV === "production";

export const cookieOptions = {
  httpOnly: false,        // must be false so client JS can read it
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000, // 1 day in ms
  path: "/",
};
