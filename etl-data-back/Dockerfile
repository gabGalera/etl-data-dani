FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=development
ENV PORT=3000
ENV TZ=UTC
# Bind mounts do not deliver inotify events. Dynamic priority polling
# checks files that just changed more often and slows down on idle ones.
ENV TSC_WATCHFILE=DynamicPriorityPolling
ENV TSC_WATCHDIRECTORY=RecursiveDirectoryUsingDynamicPriorityPolling

COPY package.json package-lock.json ./
RUN npm ci \
  && cp package-lock.json node_modules/.package-lock.hash \
  && chown -R node:node /app

COPY --chown=node:node nest-cli.json tsconfig.json tsconfig.build.json ./
COPY --chown=node:node src ./src

USER node

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
