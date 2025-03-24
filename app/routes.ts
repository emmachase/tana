import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/base-layout.tsx", [
    layout("routes/auth-layout.tsx", [
      index("routes/home.tsx"),
      route("/upload", "routes/upload.tsx"),
      route("/list", "routes/list.tsx"),
    ]),
    route("/login", "routes/login.tsx"),
    route("/logout", "routes/logout.tsx"),
  ]),
  route("/api/trpc/*", "routes/trpc.ts"),
  route("/:object", "routes/image.ts"),
] satisfies RouteConfig;
