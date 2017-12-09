// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const {
  REGION,
  ACCESS_KEY,
  SECRET_KEY,
  DATA_TABLE,
  SUBSCRIBERS_TABLE
} = process.env;

const documentClient = new DocumentClient({
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_KEY,
  region: REGION
});

export function scanData() {
  const params = { TableName: DATA_TABLE };
  return documentClient.scan(params).promise();
}

export function getActiveSubscribers() {
  const params = {
    TableName: SUBSCRIBERS_TABLE,
    IndexName: 'active-index',
    KeyConditionExpression: '#active = :active',
    ExpressionAttributeNames: { '#active': 'active' },
    ExpressionAttributeValues: { ':active': 1 }
  };
  return documentClient.query(params).promise();
}

export function updateItems(data) {
  const params = { RequestItems: { [DATA_TABLE]: data } };
  return documentClient.batchWrite(params).promise();
}

function getUserById(id) {
  const params = { TableName: SUBSCRIBERS_TABLE, Key: { id } };
  return documentClient.get(params).promise();
}

function putUser(id) {
  const params = {
    TableName: SUBSCRIBERS_TABLE,
    Item: { id, active: 1, timestamp: new Date().getTime() }
  };
  return documentClient.put(params).promise();
}

function updateUser(id, active) {
  const params = {
    TableName: SUBSCRIBERS_TABLE,
    Key: { id },
    UpdateExpression: 'set active = :a',
    ExpressionAttributeValues: { ':a': active }
  };
  return documentClient.update(params).promise();
}

export async function subscribeUser(userId) {
  const { Item } = await getUserById(userId);
  if (Item) {
    if (Item.active === 1) {
      throw Error('Already subscribed');
    }
    const res = await updateUser(userId, 1);
    return res;
  }
  const res = await putUser(userId);
  return res;
}

export async function unsubscribeUser(userId) {
  const { Item } = await getUserById(userId);
  if (!Item || Item.active === 0) {
    throw Error('Already unsubscribed');
  }
  const res = await updateUser(userId, 0);
  return res;
}
