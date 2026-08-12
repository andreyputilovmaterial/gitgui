
import { __access_errorSite } from './setup';

import './style.css';

export default function logError(msg) {
  __access_errorSite().promise.then(
    logError => logError(msg)
  );
}
