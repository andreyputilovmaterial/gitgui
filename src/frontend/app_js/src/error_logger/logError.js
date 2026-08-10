
import { __access_errorSite } from './setup';

export default function logError(msg) {
  __access_errorSite().promise.then(
    logError => logError(msg)
  );
}
