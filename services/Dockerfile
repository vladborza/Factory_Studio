FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 DATA_DIR=/data
COPY --chown=node:node package.json ./
COPY --chown=node:node dist/core ./dist/core
COPY --chown=node:node dist/features/library ./dist/features/library
COPY --chown=node:node services ./services
RUN mkdir /data && chown node:node /data
USER node
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","services/catalog/server.mjs"]
