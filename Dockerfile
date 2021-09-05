FROM node:latest

COPY --chown=node . /home/node/bot

USER node
WORKDIR /home/node/bot

RUN npm i

CMD [ "node", "index.js" ]
