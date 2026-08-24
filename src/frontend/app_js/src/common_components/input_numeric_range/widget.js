

import './styles_popup.css';
import logError from '../../error_logger/logError';
import mountWidgetToComponent from './component_widget_window';

function buildPopup({value,resolve,reject,validationCb}) {
  const backdrop = document.createElement("div");
  const popup = document.createElement("div");

  backdrop.className = "mdm-ui-control-popup-backdrop";
  popup.className = "mdm-ui-control-popup-window";
  mountWidgetToComponent(popup,resolve,reject,value,validationCb);
  return { backdrop, popup };
}

function positionPopup(inputEl) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const inputElRect = inputEl.getBoundingClientRect();
  const expectedPopupWidth = 300;
  const expectedPopupHeight = 200;
  const minMargin = 30;
  let suggestedPositionLeft = inputElRect.left + 0;
  let suggestedPositionTop = inputElRect.top + 0;
  if( suggestedPositionLeft>windowWidth-minMargin-expectedPopupWidth )
    suggestedPositionLeft = windowWidth-minMargin-expectedPopupWidth;
  if( suggestedPositionLeft<minMargin )
    suggestedPositionLeft = minMargin;
  if( suggestedPositionTop>windowHeight-minMargin-expectedPopupHeight )
    suggestedPositionTop = windowHeight-minMargin-expectedPopupHeight;
  if( suggestedPositionTop<minMargin )
    suggestedPositionTop = minMargin;
  const style = {};
  style.left = `${suggestedPositionLeft}px`;
  style.top = `${suggestedPositionTop}px`;
  return style;
}

function showPopup({ value, inputEl, event, validationCb }) {
  const context = {
    resolve: () => { throw new Error('promise not inited!'); },
    reject: () => { throw new Error('promise not inited!'); },
    domElements: {
      backdrop: null,
      popup: null,
    }
  };
  context.promise = new Promise((resolve,reject) => {
    context.resolve = resolve;
    context.reject = reject;
    context.domElements = buildPopup({value,resolve,reject,validationCb});
    document.body.append(
      context.domElements.backdrop,
      context.domElements.popup,
    );
    Object.assign(
      context.domElements.popup.style,
      positionPopup(inputEl)
    );
  });
  const cleanup = () => {
    if( !!context.domElements.backdrop )
      context.domElements.backdrop.remove();
    if( !!context.domElements.popup )
      context.domElements.popup.remove();
  };
  context.promise.finally(
    cleanup,
  );
  context.promise.then(
    () => {},
    e => {
      logError('Numeric range picker popup widget: error in promise');
      logError(e);
      throw e;
    },
  );
  return context.promise;
}

export default showPopup;
