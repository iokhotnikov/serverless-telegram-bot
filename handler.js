import request from 'request-promise-native';

import config from './config';
import {
  scanData,
  getActiveSubscribers,
  updateItems,
  subscribeUser,
  unsubscribeUser
} from './helper';

const { TELEGRAM_BOT_TOKEN } = process.env;
const end = cb => cb(null, { statusCode: 200 });
const wrap = p => p.then(res => [null, res]).catch(e => [e, null]);
const getData = async ({ url, handler, title }) => {
  const body = await request(url);
  return { title, value: handler(body) };
};
const sendMessage = async (chat_id, text) => { // eslint-disable-line camelcase
  const res = await request({
    method: 'POST',
    uri: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    form: { chat_id, text, parse_mode: 'markdown' }
  });
  return res;
};

export const bot = async (event, context, cb) => {
  context.callbackWaitsForEmptyEventLoop = false; // eslint-disable-line no-param-reassign
  try {
    if (event['detail-type'] === 'Scheduled Event') {
      const promises = config.map(getData);
      const data = await scanData();

      const res = await Promise.all(promises);
      const updateParams = [];
      data.Items.forEach((record) => {
        const item = res.find(i => i.title === record.title);
        if (item.value !== record.value) {
          updateParams.push({
            PutRequest: {
              Item: {
                id: record.id,
                value: item.value,
                title: item.title,
                timestamp: new Date().getTime()
              }
            }
          });
        }
      });

      if (updateParams.length) {
        await updateItems(updateParams);
        const { Items } = await getActiveSubscribers();
        const message = updateParams.map((
          { PutRequest: { Item: { title, value } } }) => (`${title}: ${value}`)
        );

        await Promise.all(Items.map(({ id }) => sendMessage(id, message.join('\n'))));
      }

      end(cb);
      return;
    }

    const { message } = JSON.parse(event.body);

    if (message && message.chat && message.chat.id) {
      const chat_id = message.chat.id; // eslint-disable-line camelcase

      if (message.text === '/subscribe') {
        const [err] = await wrap(subscribeUser(message.from.id));
        if (err) {
          await sendMessage(chat_id, err.message);
          end(cb);
          return;
        }
        await sendMessage(chat_id, 'Subscribed successfully');
        end(cb);
        return;
      }

      if (message.text === '/unsubscribe') {
        const [err] = await wrap(unsubscribeUser(message.from.id));
        if (err) {
          await sendMessage(chat_id, err.message);
          end(cb);
          return;
        }
        await sendMessage(chat_id, 'Unsubscribed successfully');
        end(cb);
        return;
      }

      if (message.text === '/check') {
        const promises = config.map(getData);
        const res = await Promise.all(promises);
        await sendMessage(chat_id, res.map(({ title, value }) => `${title}: ${value}`).join('\n'));
      }
      end(cb);
    }
    end(cb);
  } catch (e) {
    console.error(e);
    cb(e);
  }
};
