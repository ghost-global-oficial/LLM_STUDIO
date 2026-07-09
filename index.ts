// FormData polyfill for Hermes (required by react-native-http-bridge-refurbished)
if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this._parts = [];
    }
    append(name, value, filename) {
      this._parts.push({ name, value, filename });
    }
    delete(name) {
      this._parts = this._parts.filter(part => part.name !== name);
    }
    get(name) {
      const part = this._parts.find(p => p.name === name);
      return part ? part.value : null;
    }
    getAll(name) {
      return this._parts.filter(p => p.name === name).map(p => p.value);
    }
    has(name) {
      return this._parts.some(p => p.name === name);
    }
    set(name, value, filename) {
      this.delete(name);
      this.append(name, value, filename);
    }
    *entries() {
      for (const part of this._parts) {
        yield [part.name, part.value];
      }
    }
    *keys() {
      for (const part of this._parts) {
        yield part.name;
      }
    }
    *values() {
      for (const part of this._parts) {
        yield part.value;
      }
    }
    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

// Global error handler to prevent Hermes crashes from unhandled rejections
if (typeof ErrorUtils !== 'undefined') {
  const origHandler = ErrorUtils.getGlobalHandler && ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    try { console.warn('CRASH PREVENTED:', error?.message || error); } catch {}
    if (origHandler) origHandler(error, isFatal);
  });
}

import { AppRegistry } from 'react-native';

import App from './App';

AppRegistry.registerComponent('main', () => App);
