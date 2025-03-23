import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [index("routes/home.tsx")]),
  route("/login", "routes/login.tsx"),
  route("/logout", "routes/logout.tsx"),
  route("/api/trpc/*", "routes/trpc.ts"),
  route("/:object", "routes/image.ts"),
] satisfies RouteConfig;
