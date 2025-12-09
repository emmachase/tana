import * as v from "valibot";

export const env = v.parse(
  v.object({
    DB_FILE_NAME: v.string(),
    ADMIN_PASSWORD: v.string(),
    NAMING_TEMPLATE: v.string(),
    ROOT_DIR: v.string(),
  }),
  process.env.NODE_ENV === "development"
    ? {
        DB_FILE_NAME: "database.sqlite",
        ADMIN_PASSWORD:
          "$argon2id$v=19$m=65536,t=3,p=4$ZeC4Wtj5OAISaaFrxaa1Vg$4hPqf6ywN4oC4yctBdZ48xdVbsWh+tGzP12QVH7IrBw", // test
        NAMING_TEMPLATE: "{chars 6}",
        ROOT_DIR: ".",
      }
    : process.env,
);
