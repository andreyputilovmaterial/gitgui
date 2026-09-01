


class ReplayEvent {
  #history = [];
  #listeners = new Set();

  emit(value) {
    const event = Promise.resolve(value);
    this.#history.push(event);

    for (const listener of this.#listeners) {
      event.then(listener);
    }
  }

  subscribe(listener) {

    // Replay everything that happened before subscription.
    for (const event of this.#history) {
      event.then(listener);
    }

    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }
}

export default ReplayEvent;

