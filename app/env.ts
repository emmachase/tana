import * as v from "valibot";

export const env = v.parse(
  v.object({
    DB_FILE_NAME: v.string(),
    ADMIN_PASSWORD: v.string(),
    NAMING_TEMPLATE: v.string(),
    UPLOAD_DIR: v.string(),
  }),
  process.env,
);
