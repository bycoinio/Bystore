import NetworkMessage from '@/messages/network'
import * as MsgTypes from './messages/types'
import * as EventNames from '@/messages/event'
import IdGenerator from '@/utils/IdGenerator'
import { networks } from '@/utils/constants'
import { EventEmitter } from 'events';
/***
 * This is just a helper to manage resolving fake-async
 * requests using browser messaging.
 */
class DanglingResolver {
  constructor(_id, _resolve, _reject) {
    this.id = _id
    this.resolve = _resolve
    this.reject = _reject
  }
}

let stream = new WeakMap()
let resolvers = new WeakMap()
let currentVersion = new WeakMap()
let requiredVersion = new WeakMap()

/***
 * Messages do not come back on the same thread.
 * To accomplish a future promise structure this method
 * catches all incoming messages and dispenses
 * them to the open promises. */
const _subscribe = () => {
  stream.listenWith(msg => {
    if (!msg || !msg.hasOwnProperty('type')) return false

    for (let i = 0; i < resolvers.length; i++) {
      if (resolvers[i].id === msg.resolver) {
        if (msg.type === 'error') resolvers[i].reject(msg.payload)
        else resolvers[i].resolve(msg.payload)
        resolvers.splice(i, 1)
      }
    }
  })
}

/***
 * Turns message sending between the application
 * and the content script into async promises
 * @param _type
 * @param _payload
 */
const _send = (_type, _payload) => {
  return new Promise((resolve, reject) => {
    let id = IdGenerator.numeric(24)
    let message = new NetworkMessage(_type, _payload, id)
    resolvers.push(new DanglingResolver(id, resolve, reject))
    stream.send(message, EventNames.BYTOM)
  })
}

export default class Bytomdapp extends EventEmitter {
  constructor(_stream, _options) {
    super();
    // currentVersion = parseFloat(_options.version)
    stream = _stream
    resolvers = []
    this.version = '2.0.0'

    //v1.4.0
    this.defaultAccount = _options.defaultAccount
    this.chain = _options.chain
    this.currentProvider = networks[_options.net || 'mainnet']


    this.default_account = _options.defaultAccount
    this.net = _options.net

    _subscribe()
  }

  enable(){
    return _send(MsgTypes.ENABLE)
      .then(async default_account =>{
        super.emit(MsgTypes.ACCOUNT_CHANGED, [default_account])

        this.default_account = default_account;
        this.defaultAccount = default_account;
        return default_account;
      })
  }

  disable(){
    return _send(MsgTypes.DISABLE)
      .then(async (res) =>{
        super.emit(MsgTypes.ACCOUNT_CHANGED, [])

        this.default_account = '';
        this.defaultAccount = '';
        return res;
      })
  }

  //v1.4.0
  setChain(params) {
    return _send(MsgTypes.SETCHAIN, params).then(async (res) =>{
      super.emit(MsgTypes.NET_TYPE_CHANGED, params)
      return res;
    })
  }

  sendTransaction(params) {
    return _send(MsgTypes.TRANSFER, params)
  }

  sendAdvancedTransaction(params) {
    return _send(MsgTypes.ADVTRANSFER, params)
  }

  signMessage(params) {
    return _send(MsgTypes.SIGNMESSAGE, params)
  }

  signTransaction(params) {
    return _send(MsgTypes.SIGNTRANSACTION, params)
  }

  on (eventName, listener) {
    return super.on(eventName, listener)
  }


  //v1.0.0
  send_transaction(params) {
    return _send(MsgTypes.TRANSFER, params)
  }

  sign_transaction(params) {
    return _send(MsgTypes.SIGNTRANSACTION, params)
  }

  send_advanced_transaction(params) {
    return _send(MsgTypes.ADVTRANSFER, params)
  }

  sign_message(params) {
    return _send(MsgTypes.SIGNMESSAGE, params)
  }
}
