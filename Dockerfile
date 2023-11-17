FROM node:18
RUN apt-get update && apt-get install ffmpeg -y
WORKDIR /app
COPY package.json .
RUN npm install\
    && npm install typescript -g
COPY . .
RUN tsc
CMD ["node", "./dist/index.js"]