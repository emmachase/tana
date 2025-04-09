FROM node:20-alpine AS pnpm
COPY ./package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN apk add --no-cache ffmpeg
RUN corepack enable
RUN corepack install

FROM pnpm AS development-dependencies-env
COPY . /app/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild argon2 better-sqlite3 sharp

FROM pnpm AS production-dependencies-env
RUN pnpm install --frozen-lockfile --ignore-scripts -P
RUN pnpm rebuild argon2 better-sqlite3 sharp

FROM pnpm AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN pnpm run build

FROM pnpm
COPY ./package.json pnpm-lock.yaml /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
CMD ["pnpm", "run", "start"]