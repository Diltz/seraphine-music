FROM jrottenberg/ffmpeg:4.1-alpine
FROM node:18
WORKDIR /app
COPY package.json .
RUN npm install\
    && npm install typescript -g
COPY . .
RUN tsc
CMD ["node", "./dist/index.js"]