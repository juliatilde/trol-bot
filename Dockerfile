FROM node:

USER node

WORKDIR /home/node
RUN git clone https://github.com/Morphious87/trol-bot trol-bot

WORKDIR /home/node/trol-bot
RUN npm i

CMD [ "node", "index.js" ]
